import type { SelfHealingExecutionReference } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import { isExecutionIdV2 } from '@/executions/execution-id';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class SelfHealingExecutionReferenceService {
	constructor(
		private readonly executions: ExecutionRepository,
		private readonly engineV2: EngineV2ExecutionReader,
		private readonly workflows: WorkflowFinderService,
		private readonly logger: Logger,
	) {}

	async getReference(
		user: User,
		workflowId: string,
		executionId: string,
	): Promise<SelfHealingExecutionReference> {
		try {
			if (!(await this.canReadExecution(user, workflowId))) return { status: 'unavailable' };
			// Optional evidence must not delay access to a saved report.
			const execution = await this.findReference(executionId, AbortSignal.timeout(2000));
			return execution?.workflowId === workflowId
				? { status: 'available', id: execution.id }
				: { status: 'unavailable' };
		} catch {
			// Optional evidence must not block the saved report. Provider errors can contain data.
			this.logger.warn('Could not load the execution reference for a self-healing result.', {
				workflowId,
				executionId,
			});
			return { status: 'unavailable' };
		}
	}

	/** Check producer input before storage. Pruned executions can retain a historical reference. */
	async validateReference(user: User, workflowId: string, executionId: string): Promise<void> {
		if (!(await this.canReadExecution(user, workflowId))) {
			throw new ForbiddenError('Workflow and execution read access is required.');
		}
		const execution = await this.findReference(executionId);
		if (execution && execution.workflowId !== workflowId) {
			throw new BadRequestError('The execution does not belong to this workflow.');
		}
	}

	private async canReadExecution(user: User, workflowId: string): Promise<boolean> {
		if (user.disabled) return false;
		return !!(await this.workflows.findWorkflowHeadForUser(workflowId, user, [
			'workflow:read',
			'execution:read',
		]));
	}

	private async findReference(executionId: string, abortSignal?: AbortSignal) {
		if (isExecutionIdV2(executionId)) {
			return await this.engineV2.findReference(executionId, abortSignal);
		}
		const execution = await this.executions.findSingleExecution(executionId, {
			includeData: false,
			includeAnnotation: false,
		});
		return execution ? { id: execution.id, workflowId: execution.workflowId } : undefined;
	}
}
