import { TSESTree } from '@typescript-eslint/utils';
import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';
import { dirname } from 'node:path';

import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	validateIconPath,
	findSimilarSvgFiles,
	isFileType,
	createRule,
} from '../utils/index.js';

const messages = {
	iconFileNotFound: 'Icon file "{{ iconPath }}" does not exist',
	iconNotSvg: 'Icon file "{{ iconPath }}" must be an SVG file (end with .svg)',
	lightDarkSame: 'Light and dark icons cannot be the same file. Both point to "{{ iconPath }}"',
	invalidIconPath: 'Icon path "{{ iconPath }}" must use file: protocol and be a string',
	missingIcon: 'Node/Credential class must have an icon property defined',
	addPlaceholder: 'Add icon property with placeholder',
	addFileProtocol: "Add 'file:' protocol to icon path",
	changeExtension: "Change icon extension to '.svg'",
	similarIcon: "Use existing icon '{{ suggestedName }}'",
} as const;

export const IconValidationRule = createRule({
	name: 'icon-validation',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Validate node and credential icon files exist, are SVG format, and light/dark icons are different',
		},
		messages,
		schema: [],
		hasSuggestions: true,
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
					data: { iconPath: iconPath ?? '' },
				});
				return false;
			}

			const currentDir = dirname(context.filename);
			const validation = validateIconPath(iconPath, currentDir);

			if (!validation.isFile) {
				const suggestions: ReportSuggestionArray<keyof typeof messages> = [];
				if (!iconPath.startsWith('file:')) {
					suggestions.push({
						messageId: 'addFileProtocol',
						fix(fixer) {
							return fixer.replaceText(node, `"file:${iconPath}"`);
						},
					});
				}

				context.report({
					node,
					messageId: 'invalidIconPath',
					data: { iconPath },
					suggest: suggestions,
				});
				return false;
			}

			if (!validation.isSvg) {
				const relativePath = iconPath.replace(/^file:/, '');
				const suggestions: ReportSuggestionArray<keyof typeof messages> = [];

				const pathWithoutExt = relativePath.replace(/\.[^/.]+$/, '');
				const svgPath = `${pathWithoutExt}.svg`;
				suggestions.push({
					messageId: 'changeExtension',
					fix(fixer) {
						return fixer.replaceText(node, `"file:${svgPath}"`);
					},
				});

				context.report({
					node,
					messageId: 'iconNotSvg',
					data: { iconPath: relativePath },
					suggest: suggestions,
				});
				return false;
			}

			if (!validation.exists) {
				const relativePath = iconPath.replace(/^file:/, '');
				const suggestions: ReportSuggestionArray<keyof typeof messages> = [];

				// Find similar SVG files in the same directory
				const similarFiles = findSimilarSvgFiles(relativePath, currentDir);
				for (const similarFile of similarFiles) {
					suggestions.push({
						messageId: 'similarIcon',
						data: { suggestedName: similarFile },
						fix(fixer) {
							return fixer.replaceText(node, `"file:${similarFile}"`);
						},
					});
				}

				context.report({
					node,
					messageId: 'iconFileNotFound',
					data: { iconPath: relativePath },
					suggest: suggestions,
				});
				return false;
			}

			return true;
		};

		const validateIconValue = (iconValue: TSESTree.Node) => {
			if (iconValue.type === TSESTree.AST_NODE_TYPES.Literal) {
				const iconPath = getStringLiteralValue(iconValue);
				validateIcon(iconPath, iconValue);
			} else if (iconValue.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
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
						descriptionProperty.value.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
					) {
						context.report({
							node,
							messageId: 'missingIcon',
						});
						return;
					}

					const descriptionValue = descriptionProperty.value;
					const iconProperty = findObjectProperty(descriptionValue, 'icon');
					if (!iconProperty) {
						const suggestions: ReportSuggestionArray<keyof typeof messages> = [];

						suggestions.push({
							messageId: 'addPlaceholder',
							fix(fixer) {
								const lastProperty =
									descriptionValue.properties[descriptionValue.properties.length - 1];
								if (lastProperty) {
									return fixer.insertTextAfter(lastProperty, ',\n\t\ticon: "file:./icon.svg"');
								}
								return null;
							},
						});

						context.report({
							node,
							messageId: 'missingIcon',
							suggest: suggestions,
						});
						return;
					}

					validateIconValue(iconProperty.value);
				} else if (isCredentialClass) {
					const iconProperty = findClassProperty(node, 'icon');
					if (!iconProperty?.value) {
						const suggestions: ReportSuggestionArray<keyof typeof messages> = [];

						suggestions.push({
							messageId: 'addPlaceholder',
							fix(fixer) {
								const classBody = node.body.body;
								const lastProperty = classBody[classBody.length - 1];
								if (lastProperty) {
									return fixer.insertTextAfter(lastProperty, '\n\n\ticon = "file:./icon.svg";');
								}
								return null;
							},
						});

						context.report({
							node,
							messageId: 'missingIcon',
							suggest: suggestions,
						});
						return;
					}

					validateIconValue(iconProperty.value);
				}
			},
		};
	},
});
