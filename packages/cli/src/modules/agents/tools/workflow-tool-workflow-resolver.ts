import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

export async function findWorkflowToolWorkflows(
	workflowRepository: WorkflowRepository,
	workflowNames: string[],
	projectId: string,
): Promise<Map<string, WorkflowEntity>> {
	const uniqueNames = [...new Set(workflowNames)];
	if (uniqueNames.length === 0) return new Map();

	const workflows = await workflowRepository.find({
		where: { name: In(uniqueNames), shared: { projectId } },
		select: ['id', 'name', 'nodes'],
	});

	return new Map(workflows.map((workflow) => [workflow.name, workflow]));
}

export async function findWorkflowToolWorkflow(
	workflowRepository: WorkflowRepository,
	workflowName: string,
	projectId: string,
): Promise<WorkflowEntity | null> {
	return await workflowRepository.findOne({
		where: { name: workflowName, shared: { projectId } },
		relations: ['shared'],
	});
}

/**
 * Heal workflow tool refs that were saved with a workflow id instead of its
 * name. Every consumer (validation, `buildWorkflowTool`, runtime
 * reconstruction) resolves `ref.workflow` by name, so an id-valued ref is a
 * dead pointer — the builder LLM occasionally writes the id it sees in the
 * session-workflows envelope instead of the name. Mutates matching refs in
 * place; refs matching neither a name nor an id are left untouched so
 * validation can report them as `missing_reference`.
 */
export async function normalizeWorkflowToolRefs(
	workflowRepository: WorkflowRepository,
	tools: AgentJsonConfig['tools'],
	projectId: string,
): Promise<void> {
	const refs = (tools ?? []).filter(
		(tool): tool is Extract<AgentJsonToolConfig, { type: 'workflow' }> => tool.type === 'workflow',
	);
	if (refs.length === 0) return;

	const values = [...new Set(refs.map((ref) => ref.workflow))];
	const workflows = await workflowRepository.find({
		where: [
			{ name: In(values), shared: { projectId } },
			{ id: In(values), shared: { projectId } },
		],
		select: ['id', 'name'],
	});
	const projectNames = new Set(workflows.map((workflow) => workflow.name));
	const idToName = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));

	for (const ref of refs) {
		if (projectNames.has(ref.workflow)) continue;
		const name = idToName.get(ref.workflow);
		if (name) ref.workflow = name;
	}
}
