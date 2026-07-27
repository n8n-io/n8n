import type { SourceLintIssue } from '../types';

/** Match real import/from lines — not identifiers that merely contain "requests". */
const PYTHON_NETWORK_IMPORT =
	/(?:^|\n)\s*(?:import|from)\s+(?:requests|urllib(?:\.[\w.]+)?|httpx|aiohttp|http\.client)\b/m;

/** `from http import client` is equivalent to `import http.client`. */
const PYTHON_NETWORK_FROM_IMPORT = /(?:^|\n)\s*from\s+http\s+import\s+client\b/m;

export interface LintPythonCodeOptions {
	nodeName?: string;
}

/**
 * Lint Python written for a Code node (`pythonCode` parameter).
 */
export function lintPythonCode(
	pythonCode: string,
	options: LintPythonCodeOptions = {},
): SourceLintIssue[] {
	if (pythonCode.length === 0) return [];

	const issues: SourceLintIssue[] = [];
	const namePrefix = options.nodeName ? `'${options.nodeName}' ` : '';

	if (PYTHON_NETWORK_IMPORT.test(pythonCode) || PYTHON_NETWORK_FROM_IMPORT.test(pythonCode)) {
		issues.push({
			code: 'CODE_NODE_NETWORK_CALL',
			message:
				`${namePrefix}Code node uses requests/urllib/httpx or another HTTP library. ` +
				'Code nodes have no network access at runtime — make the HTTP/API call with an HTTP Request node ' +
				'and process its output in this node instead.',
			lintTarget: 'pythonCode',
			nodeName: options.nodeName,
			parameterPath: 'pythonCode',
		});
	}

	return issues;
}
