import { javascriptLanguage } from '@codemirror/lang-javascript';

// Expression functions deprecated in the frontend editor. Still resolve on the
// backend at execution time — we only surface them as errors in the editor.
export const DEPRECATED_EXPRESSION_FUNCTION = '$getPairedItem';

/**
 * Whether an expression body references a deprecated function. Matches
 * `VariableName` nodes so occurrences in string literals aren't flagged.
 */
export function usesDeprecatedExpressionFunction(expression: string): boolean {
	let found = false;

	javascriptLanguage.parser.parse(expression).iterate({
		enter: (node) => {
			if (
				node.name === 'VariableName' &&
				expression.slice(node.from, node.to) === DEPRECATED_EXPRESSION_FUNCTION
			) {
				found = true;
			}
		},
	});

	return found;
}
