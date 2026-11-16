import type { NodeMigration } from '../node-migration';
import { asParameters, isExpression, pickDefined } from '../parameter-readers';

/**
 * Write Binary File to Read/Write Files from Disk (Write File to Disk).
 *
 * Does:
 * - Target: `readWriteFile`, version 1.1, `operation` = `write`.
 * - Keeps: `fileName`, `dataPropertyName` and `options` (with `append`). Names and
 *   meaning stay the same.
 *
 * Refuses when:
 * - `options.append` is an expression: the old node reads `options` once, for item 0,
 *   and the new node reads it for each item, so the results could differ.
 * - `options` is not an object.
 *
 * Accepted changes:
 * - None.
 */
export const writeBinaryFileToReadWriteFile: NodeMigration = {
	ruleId: 'write-binary-file-removed-v3',
	migrate: (node) => {
		const options = asParameters(node.parameters.options);
		if (node.parameters.options !== undefined && !options) {
			throw new Error('The options of this node are not in a supported format.');
		}
		if (isExpression(options?.append)) {
			throw new Error(
				'"Append" is an expression. The old node reads it once and the new node reads it for each item, so the node cannot be migrated automatically.',
			);
		}

		return {
			node: {
				type: 'n8n-nodes-base.readWriteFile',
				typeVersion: 1.1,
				parameters: {
					operation: 'write',
					...pickDefined(node.parameters, ['fileName', 'dataPropertyName', 'options']),
				},
			},
		};
	},
};
