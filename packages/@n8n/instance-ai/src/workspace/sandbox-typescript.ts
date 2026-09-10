import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export { SANDBOX_TYPESCRIPT_VERSION, TSCONFIG_JSON } from './workflow-diagnostics-worker';

export const WORKFLOW_DIAGNOSTICS_FILENAME = 'workflow-diagnostics.cjs';

export async function loadWorkflowDiagnosticsWorker(): Promise<string> {
	// Use the package build output from both src/ and dist/ callers.
	return await readFile(
		resolve(__dirname, '../../dist/workspace/workflow-diagnostics-worker.js'),
		'utf8',
	);
}
