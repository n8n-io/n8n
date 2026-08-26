import { javascriptLanguage } from '@codemirror/lang-javascript';

// Expression function removed in v3. The editor reports it before evaluation so
// the message names a replacement instead of failing on an undefined call.
export const REMOVED_EXPRESSION_FUNCTION = '$getPairedItem';

/**
 * Whether an expression body references a removed function. Matches
 * `VariableName` nodes so occurrences in string literals aren't flagged.
 */
export function usesRemovedExpressionFunction(expression: string): boolean {
	let found = false;

	javascriptLanguage.parser.parse(expression).iterate({
		enter: (node) => {
			if (
				node.name === 'VariableName' &&
				expression.slice(node.from, node.to) === REMOVED_EXPRESSION_FUNCTION
			) {
				found = true;
			}
		},
	});

	return found;
}
