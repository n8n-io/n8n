import {
	createCodexObjectVisitor,
	findCodexProperty,
	removeObjectProperty,
} from '../utils/codex-utils.js';
import { createRule } from '../utils/index.js';

export const NoCodexSubcategoriesRule = createRule({
	name: 'no-codex-subcategories',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow the codex.subcategories field in community nodes that do not import the AI Node SDK',
		},
		messages: {
			subcategoriesNotAllowed:
				'codex.subcategories is not allowed unless the node is built with @n8n/ai-node-sdk. Its values are only meaningful to n8n\'s built-in node panel grouping (e.g. AI subcategories control whether a node shows up in the main "Add node" search), and an unrecognized value silently misclassifies the node rather than raising an error. Remove codex.subcategories, or import from @n8n/ai-node-sdk if this node needs proper AI subcategory detection.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return createCodexObjectVisitor(context, (codexObject) => {
			const subcategoriesProperty = findCodexProperty(codexObject, 'subcategories');
			if (!subcategoriesProperty) {
				return;
			}

			context.report({
				node: subcategoriesProperty,
				messageId: 'subcategoriesNotAllowed',
				fix(fixer) {
					return removeObjectProperty(
						fixer,
						context.sourceCode,
						codexObject,
						subcategoriesProperty,
					);
				},
			});
		});
	},
});
