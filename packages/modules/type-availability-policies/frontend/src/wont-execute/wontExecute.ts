import { WORKFLOW_EXECUTION_BLOCK_CAUSES, type WorkflowExecutionBlockCause } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

export const EXECUTION_BLOCK_CAUSE_COPY: Record<
	WorkflowExecutionBlockCause,
	{ label: BaseTextKey; reason: BaseTextKey; fix: BaseTextKey }
> = {
	restrictedNode: {
		label: 'typeAvailabilityPolicies.wontExecute.cause.restrictedNode',
		reason: 'typeAvailabilityPolicies.wontExecute.reason.restrictedNode',
		fix: 'typeAvailabilityPolicies.wontExecute.fix.restrictedNode',
	},
};

/**
 * Keeps only the causes the backend accepts, in their canonical order. The backend rejects the
 * whole list request when one value is unknown, so a stale URL must not reach it.
 */
export function parseExecutionBlockCauses(
	values: readonly string[],
): WorkflowExecutionBlockCause[] {
	return WORKFLOW_EXECUTION_BLOCK_CAUSES.filter((cause) => values.includes(cause));
}
