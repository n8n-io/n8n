import { isAbortError, raceWithAbort, type WorkspaceAfterWrite } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';

import { compileWorkflowSource, isTypeScriptWorkflowSource } from './workflow-source-compiler';
import type { InstanceAiContext } from '../../types';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';

const NEXT_SDK_IMPORT = /from\s+['"]@n8n\/workflow-sdk\/next['"]/;

/** A write waits for the check at most this long. build-workflow checks the source again. */
export const WRITE_CHECK_DEADLINE_MS = 15_000;

export const WRITE_CHECK_TIMEOUT_NOTE = `The check of this file did not complete in ${WRITE_CHECK_DEADLINE_MS / 1_000} s. build-workflow checks it.`;

/**
 * Node contracts: when a workspace tool writes a typed workflow source, run the check of
 * build-workflow on it (the sandbox build, tsc, n8n expressions, Code text, fixed inputs), so the
 * tool result has the errors that the build would return. It saves nothing. A check that fails
 * to run adds nothing: build-workflow still checks the source.
 */
export function workflowSourceAfterWrite(
	context: InstanceAiContext,
): WorkspaceAfterWrite | undefined {
	if (!context.nodeContractsEnabled) return undefined;
	return async ({ path, content }, { abortSignal, toolCallId }) => {
		const workspace = context.workspace;
		if (!workspace || !isTypeScriptWorkflowSource(path) || !NEXT_SDK_IMPORT.test(content)) {
			return undefined;
		}
		const startedAt = Date.now();
		const deadline = new AbortController();
		const timer = setTimeout(() => deadline.abort(), WRITE_CHECK_DEADLINE_MS);
		const signal = abortSignal ? AbortSignal.any([abortSignal, deadline.signal]) : deadline.signal;
		const diagnostics = await (async (): Promise<string[] | undefined> => {
			try {
				const workspaceRoot = await getWorkspaceRoot(workspace);
				const filePath = normalizeWorkspaceRelativePath(path, { workspaceRoot });
				// The race keeps the deadline when a step of the check does not watch the signal.
				const result = await raceWithAbort(
					compileWorkflowSource(context, filePath, content, signal),
					signal,
				);
				return result.success ? [] : result.errors;
			} catch (error) {
				if (abortSignal?.aborted) throw error;
				if (deadline.signal.aborted && isAbortError(error)) return [WRITE_CHECK_TIMEOUT_NOTE];
				context.logger.warn('Workflow source check after write failed', {
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			} finally {
				clearTimeout(timer);
			}
		})();
		const durationMs = Date.now() - startedAt;
		context.logger.debug('Workflow source checked after write', {
			path,
			durationMs,
			diagnostics: diagnostics?.length,
		});
		if (toolCallId) {
			context.recordWorkflowCodeSnapshot?.({
				code: content,
				source: 'full-code',
				toolCallId,
				success: diagnostics?.length === 0,
				errors: diagnostics,
				capturedAt: startedAt,
				durationMs,
			});
		}
		return diagnostics;
	};
}
