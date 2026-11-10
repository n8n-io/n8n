import { ExecutionRetentionService, WorkflowProjectService } from '@n8n/backend-services';
import { Container } from '@n8n/di';

import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { AgentHitlWorkflowRepository } from '../repositories/agent-hitl-workflow.repository';

/** Register policies even when new interactions are disabled. Pending requests must remain resumable. */
export function registerApprovalRuntime(): void {
	Container.get(ExecutionRetentionService).register(
		'agent-approvals',
		async () =>
			await Container.get(AgentBackgroundJobRepository).findExecutionIdsRetainedForApproval(),
	);
	Container.get(WorkflowProjectService).registerPrivateOwner(
		'agent-approvals',
		async (workflowId) =>
			await Container.get(AgentHitlWorkflowRepository).findExecutionProject(workflowId),
	);
}
