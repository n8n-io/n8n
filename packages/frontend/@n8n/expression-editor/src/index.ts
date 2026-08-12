export { default as ExpressionEditorInput } from './components/ExpressionEditorInput.vue';
export { default as ExpressionModeToggle } from './components/ExpressionModeToggle.vue';
export { default as ExpressionOutput } from './components/ExpressionOutput.vue';
export type { ExpressionMode } from './components/ExpressionModeToggle.vue';

export { useExpressionEditor } from './composables/useExpressionEditor';

export {
	expressionCloseBrackets,
	expressionCloseBracketsConfig,
} from './codemirror/expressionCloseBrackets';
export { usesDeprecatedExpressionFunction } from './codemirror/expressionDeprecations';
export { n8nAutocompletion, n8nLang } from './codemirror/n8nLang';
export { highlighter, setExpressionEditorErrorReporter } from './codemirror/resolvableHighlighter';
export { inputTheme, outputTheme } from './codemirror/theme';

export {
	completeExpressionSyntax,
	getExpressionErrorMessage,
	getResolvableState,
	isAnyPairedItemError,
	isEmptyExpression,
	isExpression,
	isInvalidPairedItemError,
	isNoExecDataExpressionError,
	isNoInputConnectionError,
	isNoNodeExecDataExpressionError,
	isNoPairedItemError,
	isPairedItemIntermediateNodesError,
	isPairedItemNoConnectionError,
	removeExpressionPrefix,
	shouldConvertToExpression,
	unwrapExpression,
} from './utils/expressions';
export {
	formatAsExpression,
	isResourceLocatorParameterType,
	parseFromExpression,
} from './utils/parameterMode';
export { forceParse, ignoreUpdateAnnotation } from './utils/forceParse';

export type {
	ColoringStateEffect,
	ExpressionCompletionSource,
	ExpressionResolution,
	ExpressionResolver,
	Html,
	Plaintext,
	RawSegment,
	Resolvable,
	ResolvableState,
	Resolved,
	Segment,
} from './types';
