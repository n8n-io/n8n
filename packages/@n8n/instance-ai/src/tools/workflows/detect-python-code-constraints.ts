import { isRecord } from '@n8n/utils/is-record';
import {
	lintPythonCode,
	type CodeExecutionMode,
	type PythonImportPolicy,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/** `python` is the removed Pyodide value, still accepted by the node for old workflows. */
const PYTHON_LANGUAGES = new Set(['pythonNative', 'python']);

function executionMode(params: Record<string, unknown>): CodeExecutionMode {
	return params.mode === 'runOnceForEachItem' ? 'runOnceForEachItem' : 'runOnceForAllItems';
}

/**
 * A node keeps whatever `pythonCode` it was last saved with even after switching to
 * JavaScript, and the language defaults to `javaScript` when unset — so the body only
 * runs when the language explicitly says Python.
 */
function runsPython(params: Record<string, unknown>): boolean {
	return typeof params.language === 'string' && PYTHON_LANGUAGES.has(params.language);
}

/**
 * Re-runs the Code-node Python rules on the host, where the instance's real import
 * allowlist is known.
 *
 * The same rules run in the sandbox via `workflow-sdk validate`, but that process
 * cannot see `N8N_RUNNERS_STDLIB_ALLOW` / `N8N_RUNNERS_EXTERNAL_ALLOW` and so has to
 * assume the conservative default. Here we pass the effective policy, so an instance
 * that allowlisted a module is not nagged about importing it, and an instance that
 * allowlisted nothing gets a message naming that fact (INS-1222).
 *
 * Informational: a disallowed import is a run-time failure, not a malformed
 * workflow, so it should reach the agent without blocking the save.
 */
export function detectPythonCodeConstraints(
	json: WorkflowJSON,
	policy: PythonImportPolicy | undefined,
): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== CODE_NODE_TYPE) continue;

		const params = node.parameters;
		if (!isRecord(params)) continue;
		if (!runsPython(params)) continue;
		if (typeof params.pythonCode !== 'string' || params.pythonCode.length === 0) continue;

		const nodeName = typeof node.name === 'string' ? node.name : undefined;
		const issues = lintPythonCode(params.pythonCode, {
			mode: executionMode(params),
			nodeName,
			// A non-authoritative policy must never silence a warning: in external runner
			// mode the runner is configured separately and may be stricter than n8n thinks
			// (the official runners image forces both allowlists empty). Withholding it
			// falls back to assuming nothing is importable, which is the safe reading.
			importPolicy: policy?.authoritative ? policy : undefined,
		});

		for (const issue of issues) {
			warnings.push({
				code: issue.code,
				message: issue.message,
				nodeName,
				severity: 'informational',
			});
		}
	}

	return warnings;
}
