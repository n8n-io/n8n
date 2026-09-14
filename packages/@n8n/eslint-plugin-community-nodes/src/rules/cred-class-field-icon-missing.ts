import {
	isCredentialTypeClass,
	findClassProperty,
	isFileType,
	createRule,
} from '../utils/index.js';

export const CredClassFieldIconMissingRule = createRule({
	name: 'cred-class-field-icon-missing',
	meta: {
		type: 'problem',
		docs: {
			description: 'Credential class must have an `icon` property defined',
		},
		messages: {
			missingIcon: 'Credential class is missing required `icon` property',
			addPlaceholder: 'Add icon property with placeholder',
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const iconProperty = findClassProperty(node, 'icon');
				if (iconProperty?.value) {
					return;
				}

				context.report({
					node,
					messageId: 'missingIcon',
					suggest: [
						{
							messageId: 'addPlaceholder',
							fix(fixer) {
								const classBody = node.body.body;
								const lastProperty = classBody[classBody.length - 1];
								if (lastProperty) {
									return fixer.insertTextAfter(lastProperty, '\n\n\ticon = "file:./icon.svg";');
								}
								return null;
							},
						},
					],
				});
			},
		};
	},
});
