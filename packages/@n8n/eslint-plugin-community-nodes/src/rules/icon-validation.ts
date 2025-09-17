import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { dirname } from 'node:path';
import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	validateIconPath,
	isFileType,
} from '../utils/index.js';

export const IconValidationRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Validate node icon files exist, are SVG format, and light/dark icons are different',
		},
		messages: {
			iconFileNotFound: 'Icon file "{{ iconPath }}" does not exist',
			iconNotSvg: 'Icon file "{{ iconPath }}" must be an SVG file (end with .svg)',
			lightDarkSame: 'Light and dark icons cannot be the same file. Both point to "{{ iconPath }}"',
			invalidIconPath: 'Icon path "{{ iconPath }}" must use file: protocol and be a string',
			missingIcon: 'Node class must have an icon property defined',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const validateIcon = (iconPath: string, node: TSESTree.Node): boolean => {
			const currentDir = dirname(context.filename);
			const validation = validateIconPath(iconPath, currentDir);

			if (!validation.isFile) {
				context.report({
					node,
					messageId: 'invalidIconPath',
					data: { iconPath },
				});
				return false;
			}

			if (!validation.isSvg) {
				const relativePath = iconPath.replace(/^file:/, '');
				context.report({
					node,
					messageId: 'iconNotSvg',
					data: { iconPath: relativePath },
				});
				return false;
			}

			if (!validation.exists) {
				const relativePath = iconPath.replace(/^file:/, '');
				context.report({
					node,
					messageId: 'iconFileNotFound',
					data: { iconPath: relativePath },
				});
				return false;
			}

			return true;
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty?.value || descriptionProperty.value.type !== 'ObjectExpression') {
					context.report({
						node,
						messageId: 'missingIcon',
					});
					return;
				}

				const iconProperty = findObjectProperty(descriptionProperty.value, 'icon');
				if (!iconProperty) {
					context.report({
						node,
						messageId: 'missingIcon',
					});
					return;
				}

				const { value } = iconProperty;
				if (!value) return;

				if (value.type === 'Literal') {
					const iconPath = getStringLiteralValue(value);
					if (iconPath) {
						validateIcon(iconPath, value);
					}
				} else if (value.type === 'ObjectExpression') {
					const lightProperty = findObjectProperty(value, 'light');
					const darkProperty = findObjectProperty(value, 'dark');

					const lightPath = lightProperty ? getStringLiteralValue(lightProperty.value) : null;
					const darkPath = darkProperty ? getStringLiteralValue(darkProperty.value) : null;

					if (lightPath && lightProperty) {
						validateIcon(lightPath, lightProperty.value);
					}
					if (darkPath && darkProperty) {
						validateIcon(darkPath, darkProperty.value);
					}

					if (lightPath && darkPath && lightPath === darkPath && lightProperty) {
						context.report({
							node: lightProperty.value,
							messageId: 'lightDarkSame',
							data: { iconPath: lightPath.replace(/^file:/, '') },
						});
					}
				}
			},
		};
	},
});
