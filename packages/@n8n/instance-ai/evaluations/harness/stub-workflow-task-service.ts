// ---------------------------------------------------------------------------
// In-memory `WorkflowTaskService` stub for the in-process eval harness.
//
// Production wires `workflowTaskService` through `instance-ai.service.ts` so
// the orchestrator can persist build outcomes per `workItemId` and the
// builder sub-agent can read them back via `verify-built-workflow`. The eval
// has no persistence layer, so we mirror the production interface against an
// in-memory map. This is enough for the production builder briefing
// (`DETACHED_BUILDER_REQUIREMENTS`) to read coherently:
//
//   submit-workflow → reportBuildOutcome (writes to map)
//   verify-built-workflow → getBuildOutcome (reads from map) + executes
//   verify result → updateBuildOutcome (writes verification record)
//
// Each `buildInProcess` call gets its own service instance — no cross-build
// state leaks.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/require-await */
// All `WorkflowTaskService` methods are interface-async even when the
// implementation is synchronous in-memory bookkeeping.

import type { WorkflowTaskService } from '../../src/types';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowLoopState,
} from '../../src/workflow-loop/workflow-loop-state';

export interface InMemoryWorkflowTaskService extends WorkflowTaskService {
	/** Read-only access to the latest stored outcome — used by callers that
	 *  want to inspect what the agent ended up with after the run. */
	peekOutcome(workItemId: string): WorkflowBuildOutcome | undefined;
	/** Read-only access to the latest stored verification verdict. */
	peekVerdict(workItemId: string): VerificationResult | undefined;
}

/**
 * Build a fresh in-memory WorkflowTaskService.
 *
 * `reportBuildOutcome` and `reportVerificationVerdict` always return
 * `{ type: 'ignored', reason: 'eval-mode' }` because the eval has no
 * workflow-loop controller — there's no rebuild/verify state machine to
 * advance. The builder agent only needs the read-back paths to work.
 */
export function createInMemoryWorkflowTaskService(): InMemoryWorkflowTaskService {
	const outcomes = new Map<string, WorkflowBuildOutcome>();
	const verdicts = new Map<string, VerificationResult>();

	return {
		async reportBuildOutcome(outcome) {
			outcomes.set(outcome.workItemId, outcome);
			return { type: 'ignored', reason: 'eval-mode' } satisfies WorkflowLoopAction;
		},

		async reportVerificationVerdict(verdict) {
			verdicts.set(verdict.workItemId, verdict);
			return { type: 'ignored', reason: 'eval-mode' } satisfies WorkflowLoopAction;
		},

		async getBuildOutcome(workItemId) {
			return outcomes.get(workItemId);
		},

		async getWorkflowLoopState(_workItemId): Promise<WorkflowLoopState | undefined> {
			// Eval has no loop controller — verify-built-workflow tolerates undefined.
			return undefined;
		},

		async updateBuildOutcome(workItemId, update) {
			const existing = outcomes.get(workItemId);
			if (!existing) return;
			outcomes.set(workItemId, { ...existing, ...update });
		},

		peekOutcome(workItemId) {
			return outcomes.get(workItemId);
		},

		peekVerdict(workItemId) {
			return verdicts.get(workItemId);
		},
	};
}
