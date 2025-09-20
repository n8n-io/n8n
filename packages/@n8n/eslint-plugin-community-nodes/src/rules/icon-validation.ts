import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { dirname } from 'node:path';
import {
	isNodeTypeClass,
	isCredentialTypeClass,
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
				'Validate node and credential icon files exist, are SVG format, and light/dark icons are different',
		},
		messages: {
			iconFileNotFound: 'Icon file "{{ iconPath }}" does not exist',
			iconNotSvg: 'Icon file "{{ iconPath }}" must be an SVG file (end with .svg)',
			lightDarkSame: 'Light and dark icons cannot be the same file. Both point to "{{ iconPath }}"',
			invalidIconPath: 'Icon path "{{ iconPath }}" must use file: protocol and be a string',
			missingIcon: 'Node/Credential class must have an icon property defined',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (
			!isFileType(context.filename, '.node.ts') &&
			!isFileType(context.filename, '.credentials.ts')
		) {
			return {};
		}

		const validateIcon = (iconPath: string | null, node: TSESTree.Node): boolean => {
			if (!iconPath) {
				context.report({
					node,
					messageId: 'invalidIconPath',
					data: { iconPath: iconPath || '' },
				});
				return false;
			}

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

		const validateIconValue = (iconValue: TSESTree.Node) => {
			if (iconValue.type === 'Literal') {
				const iconPath = getStringLiteralValue(iconValue);
				validateIcon(iconPath, iconValue);
			} else if (iconValue.type === 'ObjectExpression') {
				const lightProperty = findObjectProperty(iconValue, 'light');
				const darkProperty = findObjectProperty(iconValue, 'dark');

				const lightPath = lightProperty ? getStringLiteralValue(lightProperty.value) : null;
				const darkPath = darkProperty ? getStringLiteralValue(darkProperty.value) : null;

				if (lightProperty) {
					validateIcon(lightPath, lightProperty.value);
				}
				if (darkProperty) {
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
		};

		return {
			ClassDeclaration(node) {
				const isNodeClass = isNodeTypeClass(node);
				const isCredentialClass = isCredentialTypeClass(node);

				if (!isNodeClass && !isCredentialClass) {
					return;
				}

				if (isNodeClass) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (
						!descriptionProperty?.value ||
						descriptionProperty.value.type !== 'ObjectExpression'
					) {
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

					validateIconValue(iconProperty.value);
				} else if (isCredentialClass) {
					const iconProperty = findClassProperty(node, 'icon');
					if (!iconProperty?.value) {
						context.report({
							node,
							messageId: 'missingIcon',
						});
						return;
					}

					validateIconValue(iconProperty.value);
				}
			},
		};
	},
});
