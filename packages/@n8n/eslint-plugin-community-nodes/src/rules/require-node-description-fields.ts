import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	isFileType,
	createRule,
} from '../utils/index.js';

// Fields that are optional in the TypeScript interface but required by
// community node review standards. TypeScript-required fields (displayName,
// name, group, version, description, etc.) are already caught by tsc.
const REQUIRED_FIELDS = ['icon', 'subtitle'] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const RequireNodeDescriptionFieldsRule = createRule({
	name: 'require-node-description-fields',
	meta: {
		type: 'problem',
		docs: {
			description: `Node class description must define all required fields: ${REQUIRED_FIELDS.join(', ')}`,
		},
		messages: {
			missingField: 'Node class description is missing required `{{field}}` property',
			missingFields: 'Node class description is missing required properties: {{fields}}',
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
				if (
					!descriptionProperty?.value ||
					descriptionProperty.value.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
				) {
					return;
				}

				const descriptionValue = descriptionProperty.value;

				const missingFields: RequiredField[] = REQUIRED_FIELDS.filter(
					(field) => !findObjectProperty(descriptionValue, field),
				);

				if (missingFields.length === 0) {
					return;
				}

				if (missingFields.length === 1) {
					context.report({
						node: descriptionProperty,
						messageId: 'missingField',
						data: { field: missingFields[0] },
					});
				} else {
					context.report({
						node: descriptionProperty,
						messageId: 'missingFields',
						data: { fields: missingFields.map((f) => `\`${f}\``).join(', ') },
					});
				}
			},
		};
	},
});
