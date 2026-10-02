// The n8n expression check without a TypeScript API: the shadow file and what it reports. The
// build worker (TypeScript 7) and the tsserver plugin (TypeScript 6) find the spans and run it.
export {
	locate,
	shadowOf,
	type ExpressionScope,
	type ExpressionSpan,
	type Located,
	type Replacement,
	type Shadow,
} from './shadow';
export {
	addedFieldReads,
	EXPRESSION_BRAND,
	findingOf,
	resultMismatchMessage,
	SANDBOX_RULE,
	sandboxRuleIssues,
	type CheckAst,
	type CheckNode,
} from './rules';
