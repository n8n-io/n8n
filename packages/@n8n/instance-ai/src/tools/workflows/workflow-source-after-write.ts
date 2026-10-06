import { isAbortError, raceWithAbort, type WorkspaceAfterWrite } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { blockingErrorOf, formatWarning } from './workflow-build-context';
import { getWorkflowSourceFileBinding } from './workflow-file-bindings';
import { preserveExistingNodeIds } from './workflow-json-utils';
import { downgradeUnchangedNodeBlockers } from './workflow-node-diff';
import { compileWorkflowSource, isTypeScriptWorkflowSource } from './workflow-source-compiler';
import {
	groupingDecisionBlocker,
	partitionWarnings,
	summarizeWorkflowTopLevelItems,
	type ValidationWarning,
} from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';

const NEXT_SDK_IMPORT = /from\s+['"]@n8n\/workflow-sdk\/next['"]/;

/** A write waits for the check at most this long. build-workflow checks the source again. */
export const WRITE_CHECK_DEADLINE_MS = 15_000;

export const WRITE_CHECK_TIMEOUT_NOTE = `The check of this file did not complete in ${WRITE_CHECK_DEADLINE_MS / 1_000} s. build-workflow checks it.`;

/**
 * The refusal of build-workflow for a canvas over the ceiling without a group. An edit that adds
 * nodes gets it at the write, so the agent groups before the build.
 */
function groupingDiagnostics(workflow: WorkflowJSON): string[] {
	const summary = summarizeWorkflowTopLevelItems(workflow);
	const blocker = groupingDecisionBlocker({
		summary,
		declaredGroupCount: summary.groupCount,
		droppedGroupWarnings: [],
		nextSource: true,
	});
	return blocker ? [`[${blocker.code}]: ${blocker.message}`] : [];
}

/**
 * The saved workflow of the file, with its node ids put on the built nodes, so the downgrade of
 * build-workflow can pair them. A `/next` node has no id in the source. Undefined when the file
 * has no saved workflow or the saved workflow cannot be read: then every node counts as changed.
 */
async function savedWorkflowOf(
	context: InstanceAiContext,
	filePath: string,
	workflow: WorkflowJSON,
): Promise<WorkflowJSON | undefined> {
	try {
		const workflowId = (await getWorkflowSourceFileBinding(context, filePath))?.workflowId;
		if (!workflowId) return undefined;
		const saved = await context.workflowService.getAsWorkflowJSON(workflowId);
		await preserveExistingNodeIds(workflow, workflowId, context);
		return saved;
	} catch {
		return undefined;
	}
}

interface WriteCheck {
	errors: string[];
	warnings: string[];
}

/** The warnings of the build, in its text: blocking ones as its errors, then the others. */
async function warningLines(
	context: InstanceAiContext,
	filePath: string,
	workflow: WorkflowJSON,
	warnings: ValidationWarning[],
): Promise<string[]> {
	const saved =
		partitionWarnings(warnings).blocking.length > 0
			? await savedWorkflowOf(context, filePath, workflow)
			: undefined;
	const { blocking, informational } = partitionWarnings(
		downgradeUnchangedNodeBlockers(warnings, workflow, saved),
	);
	return [
		...blocking.map(blockingErrorOf),
		...informational.map((warning) => formatWarning(warning.code, warning.message)),
	];
}

/**
 * Node contracts: when a workspace tool writes a typed workflow source, run the check of
 * build-workflow on it (the sandbox build, tsc, n8n expressions, Code text, fixed inputs, groups),
 * so the tool result has the errors that the build would return, then its warnings. It saves
 * nothing. A check that fails to run adds nothing: build-workflow still checks the source.
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
		const check = await (async (): Promise<WriteCheck | undefined> => {
			try {
				const workspaceRoot = await getWorkspaceRoot(workspace);
				const filePath = normalizeWorkspaceRelativePath(path, { workspaceRoot });
				const checkSource = async () => {
					const result = await compileWorkflowSource(context, filePath, content, signal);
					if (!result.success) return { errors: result.errors, warnings: [] };
					return {
						errors: groupingDiagnostics(result.workflow),
						warnings: await warningLines(context, filePath, result.workflow, result.warnings),
					};
				};
				// The race keeps the deadline when a step of the check does not watch the signal.
				return await raceWithAbort(checkSource, signal);
			} catch (error) {
				if (abortSignal?.aborted) throw error;
				if (deadline.signal.aborted && isAbortError(error)) {
					return { errors: [WRITE_CHECK_TIMEOUT_NOTE], warnings: [] };
				}
				context.logger.warn('Workflow source check after write failed', {
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			} finally {
				clearTimeout(timer);
			}
		})();
		const durationMs = Date.now() - startedAt;
		const diagnostics = check && [...check.errors, ...check.warnings];
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
				success: check?.errors.length === 0,
				errors: check?.errors,
				capturedAt: startedAt,
				durationMs,
			});
		}
		return diagnostics;
	};
}
