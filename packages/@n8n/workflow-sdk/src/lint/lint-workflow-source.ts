import { parseSDKCode } from '../ast-interpreter';
import { dedupeSourceLintIssues } from './ast-walk';
import { lintJsCode } from './code-node-js-lint';
import { lintPythonCode } from './code-node-python-lint';
import { buildParentMap, extractEmbeddedCodeSnippets } from './extract-code-snippets';
import type { SourceLintIssue } from './types';
import { lintWorkflowSdkAst, prepareSourceForLint } from './workflow-sdk-lint';

export type { LintTarget, SourceLintIssue } from './types';
export {
	prepareSourceForLint,
	lintWorkflowSdkSource,
	lintWorkflowSdkAst,
} from './workflow-sdk-lint';
export { lintJsCode, hasNestedTemplateLiterals } from './code-node-js-lint';
export { lintPythonCode } from './code-node-python-lint';
export {
	extractEmbeddedCodeSnippets,
	extractEmbeddedCodeSnippetsFromSource,
	isEmbeddedCodePropertyValue,
} from './extract-code-snippets';

/**
 * Run SDK, embedded JavaScript, and embedded Python linters on a workflow source file.
 * Parses the prepared source once and shares the AST across passes.
 */
export function lintWorkflowSource(source: string): SourceLintIssue[] {
	const { code, asConstLines } = prepareSourceForLint(source);

	let ast;
	try {
		ast = parseSDKCode(code);
	} catch {
		// Still surface `as const` findings when the file does not parse.
		return dedupeSourceLintIssues(
			asConstLines.map((line) => ({
				code: 'SDK_AS_CONST',
				message:
					'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
				line,
				lintTarget: 'sdk' as const,
			})),
		);
	}

	const sdkIssues = lintWorkflowSdkAst(ast, asConstLines);
	const parents = buildParentMap(ast);
	const snippets = extractEmbeddedCodeSnippets(ast, code, parents);

	const embeddedIssues: SourceLintIssue[] = [];
	for (const snippet of snippets) {
		const base = { line: snippet.line };
		if (snippet.parameter === 'jsCode') {
			embeddedIssues.push(
				...lintJsCode(snippet.code, { mode: snippet.mode }).map((issue) => ({
					...issue,
					...base,
				})),
			);
		} else {
			embeddedIssues.push(
				...lintPythonCode(snippet.code).map((issue) => ({
					...issue,
					...base,
				})),
			);
		}
	}

	return dedupeSourceLintIssues([...sdkIssues, ...embeddedIssues]);
}
