import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';

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
