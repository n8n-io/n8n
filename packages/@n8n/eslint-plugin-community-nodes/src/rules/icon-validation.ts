import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

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
		// Only run on .node.ts files
		if (!context.filename.endsWith('.node.ts')) {
			return {};
		}

		const validateIconPath = (iconPath: string, node: TSESTree.Node): boolean => {
			if (!iconPath.startsWith('file:')) {
				context.report({
					node,
					messageId: 'invalidIconPath',
					data: { iconPath },
				});
				return false;
			}

			// Remove file: prefix to get relative path
			const relativePath = iconPath.replace(/^file:/, '');

			if (!relativePath.endsWith('.svg')) {
				context.report({
					node,
					messageId: 'iconNotSvg',
					data: { iconPath: relativePath },
				});
				return false;
			}

			// Resolve path relative to the current file's directory
			const currentDir = dirname(context.filename);
			const fullPath = join(currentDir, relativePath);

			if (!existsSync(fullPath)) {
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
				// Check if this class implements INodeType
				const implementsNodeType = node.implements?.some(
					(impl) =>
						impl.type === 'TSClassImplements' &&
						impl.expression.type === 'Identifier' &&
						impl.expression.name === 'INodeType',
				);

				if (!implementsNodeType) {
					return;
				}

				// Look for description property containing icon
				const descriptionProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'description',
				);

				if (!descriptionProperty || descriptionProperty.type !== 'PropertyDefinition') {
					context.report({
						node,
						messageId: 'missingIcon',
					});
					return;
				}

				// Look for icon property within description object
				let iconProperty: TSESTree.Property | null = null;

				const descriptionValue = descriptionProperty.value;
				if (descriptionValue?.type === 'ObjectExpression') {
					const iconProp = descriptionValue.properties.find(
						(prop) =>
							prop.type === 'Property' &&
							prop.key.type === 'Identifier' &&
							prop.key.name === 'icon',
					);

					if (iconProp?.type === 'Property') {
						iconProperty = iconProp;
					}
				}

				if (!iconProperty) {
					context.report({
						node,
						messageId: 'missingIcon',
					});
					return;
				}

				// Validate the icon property directly
				const { value } = iconProperty;
				if (!value) return;

				if (value.type === 'Literal' && typeof value.value === 'string') {
					// Simple string icon: icon = 'file:icons/MyNode.svg'
					validateIconPath(value.value, value);
				} else if (value.type === 'ObjectExpression') {
					// Object with light/dark: icon = { light: '...', dark: '...' }
					let lightPath: string | null = null;
					let darkPath: string | null = null;
					let lightNode: TSESTree.Node | null = null;
					let darkNode: TSESTree.Node | null = null;

					for (const property of value.properties) {
						if (
							property.type === 'Property' &&
							property.key.type === 'Identifier' &&
							property.value.type === 'Literal' &&
							typeof property.value.value === 'string'
						) {
							if (property.key.name === 'light') {
								lightPath = property.value.value;
								lightNode = property.value;
							} else if (property.key.name === 'dark') {
								darkPath = property.value.value;
								darkNode = property.value;
							}
						}
					}

					// Validate individual paths
					if (lightPath && lightNode) {
						validateIconPath(lightPath, lightNode);
					}
					if (darkPath && darkNode) {
						validateIconPath(darkPath, darkNode);
					}

					// Check if light and dark are the same
					if (lightPath && darkPath && lightPath === darkPath && lightNode) {
						context.report({
							node: lightNode,
							messageId: 'lightDarkSame',
							data: { iconPath: lightPath.replace(/^file:/, '') },
						});
					}
				}
			},
		};
	},
});
