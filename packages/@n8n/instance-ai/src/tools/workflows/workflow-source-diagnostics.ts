import { isAbortError, raceWithAbort, throwIfAborted } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { z } from 'zod';

import { isTypeScriptWorkflowSource } from './workflow-source-compiler';
import type { InstanceAiContext } from '../../types';
import { escapeSingleQuotes, runInSandbox } from '../../workspace/sandbox-fs';
import { WORKFLOW_DIAGNOSTICS_FILENAME } from '../../workspace/sandbox-typescript';
import { joinWorkspacePath } from '../../workspace/workspace-paths';

const DIAGNOSTIC_TIMEOUT_MS = 5_000;

/** Append available compiler findings without changing the original build failure. */
export async function appendWorkflowSourceDiagnostics(
	context: InstanceAiContext,
	filePath: string,
	buildErrors: string[],
	abortSignal?: AbortSignal,
): Promise<string[]> {
	throwIfAborted(abortSignal);
	const errors = [...new Set(buildErrors)];
	if (!isTypeScriptWorkflowSource(filePath) || !context.workspace) return errors;

	const timeout = new AbortController();
	const timer = setTimeout(() => timeout.abort(), DIAGNOSTIC_TIMEOUT_MS + 1_000);
	const diagnosticSignal = abortSignal
		? AbortSignal.any([abortSignal, timeout.signal])
		: timeout.signal;
	try {
		const workspace = context.workspace;
		const result = await raceWithAbort(async () => {
			const root = await getWorkspaceRoot(workspace);
			throwIfAborted(diagnosticSignal);
			const sourcePath = joinWorkspacePath(root, filePath);
			return await runInSandbox(
				workspace,
				`exec node --max-old-space-size=512 ${WORKFLOW_DIAGNOSTICS_FILENAME} '${escapeSingleQuotes(sourcePath)}'`,
				{ cwd: root, abortSignal: diagnosticSignal, timeout: DIAGNOSTIC_TIMEOUT_MS },
			);
		}, diagnosticSignal);
		throwIfAborted(abortSignal);
		if (result.exitCode !== 0) return errors;

		const parsed: unknown = JSON.parse(result.stdout);
		const diagnostics = z.array(z.string()).parse(parsed);
		return [...new Set([...errors, ...diagnostics])];
	} catch (error) {
		throwIfAborted(abortSignal);
		if (isAbortError(error) && !timeout.signal.aborted) throw error;
		context.logger.debug('Supplemental workflow diagnostics unavailable', {
			error: error instanceof Error ? error.message : String(error),
		});
		return errors;
	} finally {
		clearTimeout(timer);
	}
}
