/**
 * Identity-enforcing wrapper for the sandbox submit-workflow tool.
 *
 * The builder sub-agent can emit multiple parallel submit-workflow calls within
 * a single assistant turn. When the LLM drops `workflowId` on calls 2..N, each
 * call takes the create branch and persists a duplicate row with the same name.
 *
 * This wrapper keys identity per resolved `filePath`. The first call for a given
 * path synchronously installs a deferred in the pending map before dispatching,
 * so concurrent calls for the same path await the first result and inject the
 * bound `workflowId` — forcing the update branch.
 *
 * The map is scoped to the builder-task closure: it dies with the task. No
 * cross-module coordinator, eviction hook, or TTL sweep is required.
 */

import { createTool } from '@mastra/core/tools';
import type { Workspace } from '@mastra/core/workspace';

import type { CredentialEntry } from './resolve-credentials';
import {
	createSubmitWorkflowTool,
	resolveSandboxWorkflowFilePath,
	submitWorkflowInputSchema,
	submitWorkflowOutputSchema,
	type SubmitWorkflowAttempt,
	type SubmitWorkflowInput,
	type SubmitWorkflowOutput,
} from './submit-workflow.tool';
import type { InstanceAiContext } from '../../types';
import {
	MAX_PRE_SAVE_SUBMIT_FAILURES,
	createRemediation,
	terminalRemediationFromState,
} from '../../workflow-loop/remediation';
import type {
	RemediationMetadata,
	WorkflowLoopState,
} from '../../workflow-loop/workflow-loop-state';

export type SubmitExecute = (input: SubmitWorkflowInput) => Promise<SubmitWorkflowOutput>;

interface SubmitGuardOptions {
	getWorkflowLoopState?: () => Promise<WorkflowLoopState | undefined>;
	currentRunId?: string;
	onGuardFired?: (event: {
		workflowId?: string;
		category: RemediationMetadata['category'];
		attemptCount?: number;
		reason?: string;
	}) => void;
}

interface SubmitBudgetTracker {
	recordAttempt(attempt: SubmitWorkflowAttempt): SubmitWorkflowAttempt;
	applyToOutput(path: string, output: SubmitWorkflowOutput): SubmitWorkflowOutput;
}

export function createPreSaveBudgetTracker(): SubmitBudgetTracker {
	const failuresByPath = new Map<string, number>();

	function blockRemediation(attemptCount: number): RemediationMetadata {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'pre_save_submit_budget_exhausted',
			attemptCount,
			remainingSubmitFixes: 0,
			guidance:
				'The workflow could not be saved after three submit attempts. Stop editing and explain the blocker to the user.',
		});
	}

	return {
		recordAttempt(attempt) {
			if (attempt.success) {
				failuresByPath.delete(attempt.filePath);
				return attempt;
			}

			const attemptCount = (failuresByPath.get(attempt.filePath) ?? 0) + 1;
			failuresByPath.set(attempt.filePath, attemptCount);
			if (attemptCount < MAX_PRE_SAVE_SUBMIT_FAILURES) return attempt;

			return {
				...attempt,
				remediation: blockRemediation(attemptCount),
				errors: [
					...(attempt.errors ?? []),
					'Submit remediation budget exhausted for this workflow file.',
				],
			};
		},

		applyToOutput(path, output) {
			if (output.success) return output;
			const attemptCount = failuresByPath.get(path) ?? 0;
			if (attemptCount < MAX_PRE_SAVE_SUBMIT_FAILURES) return output;
			return {
				...output,
				remediation: blockRemediation(attemptCount),
				errors: [
					...(output.errors ?? []),
					'Submit remediation budget exhausted for this workflow file.',
				],
			};
		},
	};
}

/**
 * Wrap a submit-workflow `execute` with per-filePath identity enforcement.
 *
 * - First call for a given resolved path dispatches and populates the map on success.
 * - Concurrent calls for the same path await the first result and inject the bound id.
 * - On dispatch failure, the map entry is cleared and waiters see a failure result.
 *
 * Exposed separately from the tool factory so it can be unit-tested without
 * constructing a Mastra tool or a sandbox workspace.
 */
export function wrapSubmitExecuteWithIdentity(
	underlying: SubmitExecute,
	resolvePath: (rawFilePath: string | undefined) => string,
	options: SubmitGuardOptions & { budgetTracker?: SubmitBudgetTracker } = {},
): SubmitExecute {
	const pending = new Map<string, Promise<string>>();

	async function blockedByTerminalRemediation(
		workflowId: string | undefined,
	): Promise<SubmitWorkflowOutput | undefined> {
		const terminalRemediation = terminalRemediationFromState(
			await options.getWorkflowLoopState?.(),
			options.currentRunId,
		);
		if (!terminalRemediation) return undefined;

		options.onGuardFired?.({
			workflowId,
			category: terminalRemediation.category,
			attemptCount: terminalRemediation.attemptCount,
			reason: terminalRemediation.reason,
		});
		return {
			success: false,
			errors: [terminalRemediation.guidance],
			remediation: terminalRemediation,
		};
	}

	return async (input) => {
		const resolvedPath = resolvePath(input.filePath);
		const terminalResult = await blockedByTerminalRemediation(input.workflowId);
		if (terminalResult) return terminalResult;

		const existing = pending.get(resolvedPath);

		if (existing) {
			let boundId: string;
			try {
				boundId = await existing;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					success: false,
					errors: [`Previous submit-workflow for this file failed: ${message}`],
					remediation: createRemediation({
						category: 'code_fixable',
						shouldEdit: true,
						reason: 'previous_submit_failed',
						guidance:
							'The previous submit-workflow call for this file failed. Fix the workflow code and submit again.',
					}),
				};
			}
			const terminalAfterWait = await blockedByTerminalRemediation(boundId);
			if (terminalAfterWait) return terminalAfterWait;

			const result = await underlying({ ...input, workflowId: boundId });
			return options.budgetTracker?.applyToOutput(resolvedPath, result) ?? result;
		}

		let resolveFn: ((id: string) => void) | undefined;
		let rejectFn: ((reason: unknown) => void) | undefined;
		const promise = new Promise<string>((res, rej) => {
			resolveFn = res;
			rejectFn = rej;
		});
		// Swallow rejections on the stored promise so Node doesn't warn about
		// unhandled rejections when no concurrent waiter happens to attach.
		promise.catch(() => {});
		pending.set(resolvedPath, promise);

		try {
			const result = await underlying(input);
			if (result.success && typeof result.workflowId === 'string') {
				resolveFn?.(result.workflowId);
			} else {
				rejectFn?.(new Error(result.errors?.join(' ') ?? 'submit-workflow failed'));
				pending.delete(resolvedPath);
			}
			return options.budgetTracker?.applyToOutput(resolvedPath, result) ?? result;
		} catch (error) {
			rejectFn?.(error);
			pending.delete(resolvedPath);
			throw error;
		}
	};
}

/**
 * Build a submit-workflow Mastra tool wired with identity enforcement.
 * Convenience factory used at the builder-agent callsite.
 */
export function createIdentityEnforcedSubmitWorkflowTool(args: {
	context: InstanceAiContext;
	workspace: Workspace;
	availableCredentials?: CredentialEntry[];
	onAttempt: (attempt: SubmitWorkflowAttempt) => Promise<void> | void;
	root: string;
	currentRunId?: string;
	getWorkflowLoopState?: () => Promise<WorkflowLoopState | undefined>;
	onGuardFired?: SubmitGuardOptions['onGuardFired'];
}) {
	const budgetTracker = createPreSaveBudgetTracker();
	const underlying = createSubmitWorkflowTool(
		args.context,
		args.workspace,
		async (attempt) => {
			await args.onAttempt(budgetTracker.recordAttempt(attempt));
		},
		args.availableCredentials,
	);

	const underlyingExecute = underlying.execute as SubmitExecute | undefined;
	if (!underlyingExecute) {
		throw new Error('createSubmitWorkflowTool returned a tool without an execute handler');
	}

	const wrappedExecute = wrapSubmitExecuteWithIdentity(
		underlyingExecute,
		(rawFilePath) => resolveSandboxWorkflowFilePath(rawFilePath, args.root),
		{
			budgetTracker,
			currentRunId: args.currentRunId,
			getWorkflowLoopState: args.getWorkflowLoopState,
			onGuardFired: args.onGuardFired,
		},
	);

	return createTool({
		id: 'submit-workflow',
		description: underlying.description ?? '',
		inputSchema: submitWorkflowInputSchema,
		outputSchema: submitWorkflowOutputSchema,
		execute: wrappedExecute,
	});
}
