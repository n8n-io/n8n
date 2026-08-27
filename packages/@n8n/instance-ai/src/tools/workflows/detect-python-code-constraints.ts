import { isRecord } from '@n8n/utils/is-record';
import {
	lintPythonCode,
	type CodeExecutionMode,
	type PythonImportPolicy,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

function executionMode(params: Record<string, unknown>): CodeExecutionMode {
	return params.mode === 'runOnceForEachItem' ? 'runOnceForEachItem' : 'runOnceForAllItems';
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
		if (typeof params.pythonCode !== 'string' || params.pythonCode.length === 0) continue;

		const nodeName = typeof node.name === 'string' ? node.name : undefined;
		const issues = lintPythonCode(params.pythonCode, {
			mode: executionMode(params),
			nodeName,
			importPolicy: policy,
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
