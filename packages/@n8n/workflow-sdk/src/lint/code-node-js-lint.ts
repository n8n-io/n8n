import type { SourceLintIssue } from './types';
import type { CodeExecutionMode } from './extract-code-snippets';

const NETWORK_CALL =
	/\b(?:fetch|axios|XMLHttpRequest)\s*\(|require\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)|\bimport\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)/;

const FORBIDDEN_MODULE =
	/(?:require\s*\(\s*['"]|import\s*\(\s*['"]|from\s+['"])(?:luxon|openai|@openai\/|langchain|@langchain\/)/;

const INPUT_ALL = /\$input\.all\s*\(/;

/**
 * Nested template literals (`` `...${`...`}...` ``) often break when the Code
 * parameter is saved/reloaded.
 */
export function hasNestedTemplateLiterals(jsCode: string): boolean {
	let inTemplate = false;
	let depth = 0;
	for (let i = 0; i < jsCode.length; i++) {
		const ch = jsCode[i];
		const prev = i > 0 ? jsCode[i - 1] : '';
		if (ch === '`' && prev !== '\\') {
			if (!inTemplate) {
				inTemplate = true;
				depth = 0;
			} else if (depth === 0) {
				inTemplate = false;
			} else {
				return true;
			}
			continue;
		}
		if (!inTemplate) continue;
		if (ch === '$' && jsCode[i + 1] === '{') {
			depth += 1;
			i += 1;
			continue;
		}
		if (ch === '}' && depth > 0) {
			depth -= 1;
		}
	}
	return false;
}

export interface LintJsCodeOptions {
	mode?: CodeExecutionMode;
	nodeName?: string;
}

/**
 * Lint JavaScript written for a Code node (`jsCode` parameter).
 */
export function lintJsCode(jsCode: string, options: LintJsCodeOptions = {}): SourceLintIssue[] {
	if (jsCode.length === 0) return [];

	const issues: SourceLintIssue[] = [];
	const namePrefix = options.nodeName ? `'${options.nodeName}' ` : '';

	if (NETWORK_CALL.test(jsCode)) {
		issues.push({
			code: 'CODE_NODE_NETWORK_CALL',
			message:
				`${namePrefix}Code node calls fetch/axios/XMLHttpRequest or requires an HTTP module. ` +
				'Code nodes have no network access at runtime — make the HTTP/API call with an HTTP Request node ' +
				'and transform its output in the Code node instead.',
			severity: 'warning',
			lintTarget: 'jsCode',
			nodeName: options.nodeName,
			parameterPath: 'jsCode',
		});
	}

	if (FORBIDDEN_MODULE.test(jsCode)) {
		issues.push({
			code: 'CODE_NODE_FORBIDDEN_IMPORT',
			message:
				`${namePrefix}Code node imports a module unavailable in the sandbox (luxon, openai, langchain, …). ` +
				'Use JavaScript `Date`/`Intl`, `$now`/`$today`, existing workflow data, or dedicated AI nodes instead.',
			severity: 'warning',
			lintTarget: 'jsCode',
			nodeName: options.nodeName,
			parameterPath: 'jsCode',
		});
	}

	if (options.mode === 'runOnceForEachItem' && INPUT_ALL.test(jsCode)) {
		issues.push({
			code: 'CODE_MODE_API_MISUSE',
			message:
				`${namePrefix}uses mode: 'runOnceForEachItem' but calls $input.all(). ` +
				'$input.all() is only available in runOnceForAllItems (the default). ' +
				'Switch mode to runOnceForAllItems, or use $input.item / $json for per-item work.',
			severity: 'warning',
			lintTarget: 'jsCode',
			nodeName: options.nodeName,
			parameterPath: 'jsCode',
		});
	}

	if (hasNestedTemplateLiterals(jsCode)) {
		issues.push({
			code: 'CODE_NESTED_TEMPLATE_LITERAL',
			message:
				`${namePrefix}Code node uses nested template literals, which often break after save. ` +
				'Build multi-line strings with arrays joined by a runtime separator, e.g. ' +
				'`const LF = String.fromCharCode(10); return lines.join(LF);`.',
			severity: 'warning',
			lintTarget: 'jsCode',
			nodeName: options.nodeName,
			parameterPath: 'jsCode',
		});
	}

	return issues;
}
