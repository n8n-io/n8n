import type { NodeMigration } from '../node-migration';
import { isExpression, pickDefined } from '../parameter-readers';

/**
 * Read PDF to Extract From File (Extract From PDF).
 *
 * Does:
 * - Target: `extractFromFile`, version 1.2, `operation` = `pdf`. Both nodes call the
 *   same `extractDataFromPDF` helper.
 * - Keeps: `binaryPropertyName`.
 * - Moves: `password` to `options.password`, only when `encrypted` is `true`. The old
 *   node reads the password only in that case.
 * - Writes: `options.keepSource` = `binary`, to keep the input binary and drop the input
 *   JSON, as the old node did. It does not write `maxPages` (0 reads no pages) or
 *   `joinPages` (the helper default matches).
 *
 * Refuses when:
 * - `encrypted` is an expression: the migration must know if the password is used.
 *
 * Accepted changes:
 * - The new node adds `pairedItem` to its output items.
 */
export const readPdfToExtractFromFile: NodeMigration = {
	ruleId: 'read-pdf-removed-v3',
	migrate: (node) => {
		const { encrypted, password } = node.parameters;
		if (isExpression(encrypted)) {
			throw new Error(
				'"Encrypted" is an expression, so the node cannot be migrated automatically.',
			);
		}

		return {
			node: {
				type: 'n8n-nodes-base.extractFromFile',
				typeVersion: 1.2,
				parameters: {
					operation: 'pdf',
					...pickDefined(node.parameters, ['binaryPropertyName']),
					options: {
						keepSource: 'binary',
						// The old node passes an empty password when it is encrypted and unset.
						...(encrypted === true ? { password: password ?? '' } : {}),
					},
				},
			},
		};
	},
};
