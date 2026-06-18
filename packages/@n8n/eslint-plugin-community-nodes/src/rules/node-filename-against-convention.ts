import { TSESTree } from '@typescript-eslint/utils';
import * as path from 'node:path';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

/**
 * Converts a `description.name` to the expected node file basename by
 * upper-casing the first character. The source of truth is `description.name`,
 * not the class name. Example: `github` -> `Github`.
 */
function toExpectedBaseName(name: string): string {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

export const NodeFilenameAgainstConventionRule = createRule({
	name: 'node-filename-against-convention',
	meta: {
		type: 'problem',
		docs: {
			description: 'Node filename must match the node `description.name`',
		},
		messages: {
			renameFile: 'Node filename must match `description.name`. Rename file to "{{expected}}".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				const nameProperty = findObjectProperty(descriptionProperty.value, 'name');
				if (!nameProperty) {
					return;
				}

				const name = getStringLiteralValue(nameProperty.value);
				if (!name) {
					return;
				}

				const expectedBaseName = toExpectedBaseName(name);
				// Strip the `.node.ts` extension and any trailing `V<digits>` version
				// suffix so versioned files (e.g. `GithubV2.node.ts`) are accepted.
				const actualBaseName = path.basename(context.filename, '.node.ts').replace(/V\d+$/, '');

				if (actualBaseName !== expectedBaseName) {
					context.report({
						node: nameProperty.value,
						messageId: 'renameFile',
						data: { expected: `${expectedBaseName}.node.ts` },
					});
				}
			},
		};
	},
});
