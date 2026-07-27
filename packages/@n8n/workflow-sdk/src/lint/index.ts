/**
 * Source lint for workflow SDK TypeScript files.
 *
 * Public entry: `lintWorkflowSource`. Prefer importing from this barrel
 * (`../lint`) rather than deep paths.
 */

export type { LintTarget, SourceLintIssue } from './types';
export { walkAst, dedupeSourceLintIssues } from './ast-walk';
export { lintWorkflowSource } from './lint-workflow-source';
export {
	prepareSourceForLint,
	lintWorkflowSdkSource,
	lintWorkflowSdkAst,
} from './sdk/workflow-sdk-lint';
export { lintJsCode, hasNestedTemplateLiterals } from './code-node/js';
export { lintPythonCode } from './code-node/python';
export {
	extractEmbeddedCodeSnippets,
	extractEmbeddedCodeSnippetsFromSource,
	isEmbeddedCodePropertyValue,
	buildParentMap,
	type CodeExecutionMode,
	type EmbeddedCodeSnippet,
} from './code-node/extract-snippets';
