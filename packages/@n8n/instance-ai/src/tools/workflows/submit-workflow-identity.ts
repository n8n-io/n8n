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

import type { CredentialMap } from './resolve-credentials';
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

export type SubmitExecute = (input: SubmitWorkflowInput) => Promise<SubmitWorkflowOutput>;

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
): SubmitExecute {
	const pending = new Map<string, Promise<string>>();

	return async (input) => {
		const resolvedPath = resolvePath(input.filePath);
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
				};
			}
			return await underlying({ ...input, workflowId: boundId });
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
			return result;
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
	credentialMap?: CredentialMap;
	onAttempt: (attempt: SubmitWorkflowAttempt) => Promise<void> | void;
	root: string;
}) {
	const underlying = createSubmitWorkflowTool(
		args.context,
		args.workspace,
		args.credentialMap,
		args.onAttempt,
	);

	const underlyingExecute = underlying.execute as SubmitExecute | undefined;
	if (!underlyingExecute) {
		throw new Error('createSubmitWorkflowTool returned a tool without an execute handler');
	}

	const wrappedExecute = wrapSubmitExecuteWithIdentity(underlyingExecute, (rawFilePath) =>
		resolveSandboxWorkflowFilePath(rawFilePath, args.root),
	);

	return createTool({
		id: 'submit-workflow',
		description: underlying.description ?? '',
		inputSchema: submitWorkflowInputSchema,
		outputSchema: submitWorkflowOutputSchema,
		execute: wrappedExecute,
	});
}
