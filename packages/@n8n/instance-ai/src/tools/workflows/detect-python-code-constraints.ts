import { isRecord } from '@n8n/utils/is-record';
import { lintPythonCode, type CodeExecutionMode, type WorkflowJSON } from '@n8n/workflow-sdk';

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
 * Runs the Code-node Python rules over a compiled workflow at build time, so a node
 * the runner will reject is reported before the user ever executes it (INS-1222).
 *
 * The same rules also run in the sandbox via `workflow-sdk validate`; this is the
 * host-side pass, which sees the workflow after it compiles.
 *
 * Informational: a disallowed import is a run-time failure, not a malformed
 * workflow, so it should reach the agent without blocking the save.
 */
export function detectPythonCodeConstraints(json: WorkflowJSON): ValidationWarning[] {
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
