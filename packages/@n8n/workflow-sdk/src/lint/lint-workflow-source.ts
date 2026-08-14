import { parseSDKCode } from '../ast-interpreter';
import { dedupeSourceLintIssues } from './ast-walk';
import { buildParentMap, extractEmbeddedCodeSnippets } from './code-node/extract-snippets';
import { lintJsCode } from './code-node/js';
import { lintPythonCode } from './code-node/python';
import { lintWorkflowSdkAst, prepareSourceForLint } from './sdk/workflow-sdk-lint';
import { lintIssue, type SourceLintIssue } from './types';

/**
 * Run SDK, embedded JavaScript, and embedded Python linters on a workflow source file.
 * Parses the prepared source once and shares the AST across passes.
 */
export function lintWorkflowSource(source: string): SourceLintIssue[] {
	const { code, asConstMatches } = prepareSourceForLint(source);

	let ast;
	try {
		ast = parseSDKCode(code);
	} catch {
		// Still surface `as const` findings when the file does not parse.
		return dedupeSourceLintIssues(
			asConstMatches.map((match) =>
				lintIssue({
					code: 'SDK_AS_CONST',
					message:
						'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
					line: match.line,
					column: match.column + 1,
					lintTarget: 'sdk' as const,
				}),
			),
		);
	}

	const sdkIssues = lintWorkflowSdkAst(ast, asConstMatches);
	const parents = buildParentMap(ast);
	const snippets = extractEmbeddedCodeSnippets(ast, code, parents);

	const embeddedIssues: SourceLintIssue[] = [];
	for (const snippet of snippets) {
		const base = { line: snippet.line, column: snippet.column };
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
