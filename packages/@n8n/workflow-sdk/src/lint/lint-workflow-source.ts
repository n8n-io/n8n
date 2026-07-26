import { parseSDKCode } from '../ast-interpreter';
import { lintJsCode } from './code-node-js-lint';
import { lintPythonCode } from './code-node-python-lint';
import { buildParentMap, extractEmbeddedCodeSnippets } from './extract-code-snippets';
import type { SourceLintIssue } from './types';
import { lintWorkflowSdkSource, prepareSourceForLint } from './workflow-sdk-lint';

export type { LintTarget, SourceLintIssue } from './types';
export { prepareSourceForLint, lintWorkflowSdkSource } from './workflow-sdk-lint';
export { lintJsCode, hasNestedTemplateLiterals } from './code-node-js-lint';
export { lintPythonCode } from './code-node-python-lint';
export {
	extractEmbeddedCodeSnippets,
	extractEmbeddedCodeSnippetsFromSource,
	isEmbeddedCodePropertyValue,
} from './extract-code-snippets';

/**
 * Run SDK, embedded JavaScript, and embedded Python linters on a workflow source file.
 */
export function lintWorkflowSource(source: string): SourceLintIssue[] {
	const sdkIssues = lintWorkflowSdkSource(source);
	const { code } = prepareSourceForLint(source);

	let embeddedIssues: SourceLintIssue[] = [];
	try {
		const ast = parseSDKCode(code);
		const parents = buildParentMap(ast);
		const snippets = extractEmbeddedCodeSnippets(ast, code, parents);
		for (const snippet of snippets) {
			const base = { line: snippet.line };
			if (snippet.parameter === 'jsCode') {
				embeddedIssues = embeddedIssues.concat(
					lintJsCode(snippet.code, { mode: snippet.mode }).map((issue) => ({
						...issue,
						...base,
					})),
				);
			} else {
				embeddedIssues = embeddedIssues.concat(
					lintPythonCode(snippet.code).map((issue) => ({
						...issue,
						...base,
					})),
				);
			}
		}
	} catch {
		// Syntax errors in the SDK file are handled by import/validate elsewhere.
	}

	return [...sdkIssues, ...embeddedIssues];
}
