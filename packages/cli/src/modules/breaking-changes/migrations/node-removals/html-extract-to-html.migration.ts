import type { NodeMigration } from '../node-migration';
import { asParameters, isExpression, pickDefined } from '../parameter-readers';

const EMPTY_TEXT_NOTE =
	'A value that returns "Text" now has no value, not an empty text, when its selector finds nothing or the element has no text. Check the nodes that read these values.';

// The default return value is `text`, and saved workflows omit defaults. An expression
// can also give `text`.
function mayReturnText(extractionValues: unknown): boolean {
	const values = asParameters(extractionValues)?.values;
	if (!Array.isArray(values)) return false;

	return values.some((value) => {
		const { returnValue = 'text' } = asParameters(value) ?? {};
		return returnValue === 'text' || isExpression(returnValue);
	});
}

/**
 * HTML Extract to HTML (Extract HTML Content).
 *
 * Does:
 * - Target: `html`, version 1.1, `operation` = `extractHtmlContent`. Version 1 reads
 *   the data property without dot notation, and 1.2 changes text extraction to
 *   `html-to-text`. Only 1.1 matches the old node.
 * - Keeps: `sourceData`, `dataPropertyName` and `extractionValues`.
 * - Writes: `options.trimValues` explicitly, because the old node trims unless the value
 *   is `false` and the new node trims only when it is `true`. It writes `cleanUpText` =
 *   `false`, because the old node has no such step. With no `extractionValues`, it writes
 *   an empty value, so the node fails as before.
 *
 * Refuses when:
 * - `options` is not an object.
 * - `options.trimValues` is an expression: a falsy result that is not `false` (for example
 *   `undefined` or `0`) trims in the old node and does not trim in the new node.
 *
 * Accepted changes:
 * - With the text return value, a selector that matches nothing, or an element with no
 *   text, gives no value instead of an empty string. The ticket accepts this. The
 *   migration reports a note when a value can use the text return value. The note also
 *   turns off the one-click republish.
 */
export const htmlExtractToHtml: NodeMigration = {
	ruleId: 'html-extract-removed-v3',
	migrate: (node) => {
		const options =
			node.parameters.options === undefined ? {} : asParameters(node.parameters.options);
		if (!options) {
			throw new Error('The options of this node are not in a supported format.');
		}
		if (isExpression(options.trimValues)) {
			throw new Error(
				'"Trim Values" is an expression, so the node cannot be migrated automatically.',
			);
		}

		return {
			node: {
				type: 'n8n-nodes-base.html',
				typeVersion: 1.1,
				parameters: {
					operation: 'extractHtmlContent',
					...pickDefined(node.parameters, ['sourceData', 'dataPropertyName']),
					// With no entries the old node throws. An empty value keeps that.
					extractionValues: node.parameters.extractionValues ?? {},
					options: { trimValues: options.trimValues ?? true, cleanUpText: false },
				},
			},
			notes: mayReturnText(node.parameters.extractionValues) ? [EMPTY_TEXT_NOTE] : undefined,
		};
	},
};
