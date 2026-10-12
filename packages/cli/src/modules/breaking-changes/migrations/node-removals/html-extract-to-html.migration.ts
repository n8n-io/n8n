import type { NodeMigration } from '../node-migration';
import { asParameters, pickDefined } from '../parameter-readers';

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
 *
 * Accepted changes:
 * - With the text return value, a selector that matches nothing gives a missing key
 *   instead of an empty string. The ticket accepts this.
 */
export const htmlExtractToHtml: NodeMigration = {
	ruleId: 'html-extract-removed-v3',
	migrate: (node) => {
		const options =
			node.parameters.options === undefined ? {} : asParameters(node.parameters.options);
		if (!options) {
			throw new Error('The options of this node are not in a supported format.');
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
		};
	},
};
