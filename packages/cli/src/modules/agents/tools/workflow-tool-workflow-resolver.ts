import type {
	AgentJsonConfig,
	AgentJsonToolConfig,
	AgentJsonWorkflowToolConfig,
} from '@n8n/api-types';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';

export async function findWorkflowToolWorkflows(
	workflowRepository: WorkflowRepository,
	refs: AgentJsonWorkflowToolConfig[],
	projectId: string,
): Promise<Map<string, WorkflowEntity>> {
	if (refs.length === 0) return new Map();

	const workflowIds = [
		...new Set(refs.flatMap((ref) => (ref.workflowId === undefined ? [] : [ref.workflowId]))),
	];
	const legacyWorkflowNames = [
		...new Set(refs.flatMap((ref) => (ref.workflowId === undefined ? [ref.workflow] : []))),
	];

	const workflows = await workflowRepository.findManyByAgentToolReferences(
		projectId,
		workflowIds,
		legacyWorkflowNames,
	);
	const workflowsByReference = new Map<string, WorkflowEntity>();
	const requestedIds = new Set(workflowIds);
	const requestedNames = new Set(legacyWorkflowNames);
	for (const workflow of workflows) {
		if (requestedIds.has(workflow.id)) workflowsByReference.set(workflow.id, workflow);
		if (requestedNames.has(workflow.name)) workflowsByReference.set(workflow.name, workflow);
	}

	return workflowsByReference;
}

export async function findWorkflowToolWorkflow(
	workflowRepository: WorkflowRepository,
	ref: AgentJsonWorkflowToolConfig,
	projectId: string,
): Promise<WorkflowEntity | null> {
	return await workflowRepository.findOneByAgentToolReference(projectId, {
		workflowName: ref.workflow,
		...(ref.workflowId !== undefined ? { workflowId: ref.workflowId } : {}),
	});
}

/**
 * Heal workflow tool refs that were saved with a workflow id instead of its
 * name. Stable refs already carrying `workflowId` are left untouched. Mutates
 * matching legacy refs in place; refs matching neither a name nor an id are
 * left untouched so validation can report them as `missing_reference`.
 */
export async function normalizeWorkflowToolRefs(
	workflowRepository: WorkflowRepository,
	tools: AgentJsonConfig['tools'],
	projectId: string,
): Promise<void> {
	const refs = (tools ?? []).filter(
		(tool): tool is Extract<AgentJsonToolConfig, { type: 'workflow' }> => tool.type === 'workflow',
	);
	const legacyRefs = refs.filter((ref) => ref.workflowId === undefined);
	if (legacyRefs.length === 0) return;

	const values = [...new Set(legacyRefs.map((ref) => ref.workflow))];
	const workflows = await workflowRepository.findManyByAgentToolReferences(
		projectId,
		values,
		values,
	);
	const projectNames = new Set(workflows.map((workflow) => workflow.name));
	const idToName = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));

	for (const ref of legacyRefs) {
		if (projectNames.has(ref.workflow)) continue;
		const name = idToName.get(ref.workflow);
		if (name) ref.workflow = name;
	}
}
