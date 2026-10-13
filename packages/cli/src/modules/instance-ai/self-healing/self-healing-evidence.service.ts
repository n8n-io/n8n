import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { ExecutionDebugInfo } from '@n8n/instance-ai';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { AiUsageService } from '@/services/ai-usage.service';

import { formatExecutionError } from '../instance-ai.adapter.service';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';

/** Supplied by the backend when normal execution data is no longer available. */
export type SelfHealingFailureEvidence = Pick<
	IExecutionResponse,
	'id' | 'workflowId' | 'workflowVersionId' | 'status' | 'mode' | 'data' | 'workflowData'
>;

export type SelfHealingEvidence = {
	message: string;
	execution: ExecutionDebugInfo;
	allowExecutionData: boolean;
};

@Service()
export class SelfHealingEvidenceService {
	constructor(
		private readonly references: SelfHealingExecutionReferenceService,
		private readonly executions: ExecutionPersistence,
		private readonly redaction: ExecutionRedactionServiceProxy,
		private readonly aiUsage: AiUsageService,
		private readonly config: GlobalConfig,
	) {}

	async read(
		user: User,
		baseline: WorkflowSuggestionBaseline,
		executionId: string,
		retainedEvidence?: SelfHealingFailureEvidence,
	): Promise<SelfHealingEvidence> {
		if (user.id !== baseline.backgroundUserId) {
			throw new ForbiddenError('The self-healing actor must match the workflow baseline.');
		}
		await this.references.validateReference(user, baseline.workflowId, executionId);
		const execution =
			retainedEvidence ??
			(await this.executions.findOneInWorkflows(executionId, [baseline.workflowId], {
				includeAnnotation: false,
				maxDataSizeBytes: this.config.executions.maxDisplaySize,
			}));
		if (!execution || !('data' in execution) || !('workflowData' in execution)) {
			throw new BadRequestError('The failed execution data is unavailable.');
		}
		if ('dataTooLargeToDisplay' in execution && execution.dataTooLargeToDisplay) {
			throw new BadRequestError('The failed execution data exceeds the size limit.');
		}
		this.validateFailure(execution, baseline, executionId);
		const permitted = await this.redaction.processExecution(execution, {
			user,
			keepOriginal: true,
		});
		const shareParameters = await this.aiUsage.isParameterValueSharingAllowed();
		const { error, lastNodeExecuted, runData } = permitted.data.resultData;
		const nodeError = lastNodeExecuted
			? runData[lastNodeExecuted]?.find((run) => run.error)?.error
			: undefined;
		const failure = error ?? nodeError;
		const message = failure
			? formatExecutionError(failure, shareParameters)
			: 'The execution failed. Its error details are unavailable.';
		return {
			message,
			// With keepOriginal, the redaction service clones only when it removes data.
			allowExecutionData:
				!retainedEvidence &&
				shareParameters &&
				permitted === execution &&
				!permitted.data.redactionInfo?.isRedacted,
			execution: {
				executionId,
				workflowVersionId: execution.workflowVersionId,
				status: 'error',
				error: message,
				lastNodeExecuted: lastNodeExecuted?.slice(0, 255),
				nodeTrace: [],
			},
		};
	}

	private validateFailure(
		execution: SelfHealingFailureEvidence,
		baseline: WorkflowSuggestionBaseline,
		executionId: string,
	) {
		if (
			execution.id !== executionId ||
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
			execution.mode === 'evaluation' ||
			execution.data.manualData !== undefined
		) {
			throw new BadRequestError('The execution is not an eligible production failure.');
		}
	}
}
