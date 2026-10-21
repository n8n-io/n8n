import type { SelfHealingExecutionReference, WorkflowSuggestionBaseline } from '@n8n/api-types';
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
			const execution = await this.findReference(executionId);
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

	async validateFailure(
		user: User,
		baseline: WorkflowSuggestionBaseline,
		executionId: string,
	): Promise<void> {
		if (!(await this.canReadExecution(user, baseline.workflowId))) {
			throw new ForbiddenError('Workflow and execution read access is required.');
		}
		if (isExecutionIdV2(executionId)) {
			throw new BadRequestError('Engine v2 executions are not supported for self-healing.');
		}
		const execution = await this.executions.findSingleExecution(executionId, {
			includeData: false,
			includeAnnotation: false,
		});
		if (!execution) throw new BadRequestError('The failed execution is unavailable.');
		if (
			execution.workflowId !== baseline.workflowId ||
			execution.workflowVersionId !== baseline.expectedBaseline.publishedVersionId
		) {
			throw new BadRequestError(
				'The failure must belong to the current published workflow version.',
			);
		}
		if (
			(execution.status !== 'error' && execution.status !== 'crashed') ||
			execution.mode === 'manual' ||
			execution.mode === 'evaluation'
		) {
			throw new BadRequestError('The execution is not an eligible production failure.');
		}
	}

	private async canReadExecution(user: User, workflowId: string): Promise<boolean> {
		if (user.disabled) return false;
		return !!(await this.workflows.findWorkflowHeadForUser(workflowId, user, [
			'workflow:read',
			'execution:read',
		]));
	}

	private async findReference(executionId: string) {
		if (isExecutionIdV2(executionId)) {
			return await this.engineV2.findReference(executionId);
		}
		const execution = await this.executions.findSingleExecution(executionId, {
			includeData: false,
			includeAnnotation: false,
		});
		return execution ? { id: execution.id, workflowId: execution.workflowId } : undefined;
	}
}
