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
