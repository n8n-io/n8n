import type { VerificationPublishState } from './claim';
import type { Logger } from '../../../logger';
import type { InstanceAiWorkflowService } from '../../../types';

/**
 * Version pair behind `claim.liveState`. The executed version has to come from
 * the execution record: the workflow head moves when anybody saves, so
 * substituting it would let the claim describe a version this run never ran.
 * Without that record there is no publish state — an unknown run version must
 * not become `live-current`, which reads as "production is proven".
 */
export async function resolvePublishState(args: {
	workflowService: InstanceAiWorkflowService;
	workflowId: string;
	executedVersionId: string | null | undefined;
	logger: Logger;
}): Promise<VerificationPublishState | undefined> {
	const { workflowService, workflowId, executedVersionId, logger } = args;

	if (!executedVersionId) return undefined;

	try {
		const head = await workflowService.getWorkflowHead(workflowId);
		return { activeVersionId: head.activeVersionId, draftVersionId: executedVersionId };
	} catch (error) {
		logger.warn('Failed to read publish state for the verification claim', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}
