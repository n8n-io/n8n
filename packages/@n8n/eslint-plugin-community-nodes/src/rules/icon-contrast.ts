import { TSESTree } from '@typescript-eslint/utils';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';

import { getBestContrast, getSvgPaintColors } from '../utils/icon-contrast.js';
import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
	unwrapExpression,
} from '../utils/index.js';

type Theme = 'light' | 'dark';

/**
 * `--node--color--background` of each editor theme. The design system defines it in
 * SCSS only, so the published plugin keeps a copy of the values.
 */
const NODE_BACKGROUNDS: Record<Theme, string> = { light: '#ffffff', dark: '#2b2b2b' };

export const IconContrastRule = createRule<[{ minimum?: number }], 'lowContrast'>({
	name: 'icon-contrast',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Warn when an icon is hard to see on the light or dark node background',
		},
		messages: {
			lowContrast:
				'Icon "{{ iconPath }}" has a contrast ratio of {{ ratio }}:1 on the {{ theme }} theme. Use a color with a contrast ratio of at least {{ minimum }}:1.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					minimum: {
						type: 'number',
						minimum: 1,
						description: 'Minimum contrast ratio with the node background.',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ minimum: 1.5 }],
	create(context, [{ minimum = 1.5 }]) {
		const isNodeOrCredentialFile =
			isFileType(context.filename, '.node.ts') || isFileType(context.filename, '.credentials.ts');
		if (!isNodeOrCredentialFile) return {};

		const checkIcon = (iconNode: TSESTree.Node, themes: Theme[]) => {
			const icon = getStringLiteralValue(unwrapExpression(iconNode));
			if (!icon?.startsWith('file:')) return;
			const iconPath = icon.slice('file:'.length);
			if (extname(iconPath).toLowerCase() !== '.svg') return;

			let svg: string;
			try {
				svg = readFileSync(join(dirname(context.filename), iconPath), 'utf8');
			} catch {
				// icon-validation reports missing files.
				return;
			}

			const colors = getSvgPaintColors(svg);
			if (!colors) return;
			for (const theme of themes) {
				const ratio = getBestContrast(colors, NODE_BACKGROUNDS[theme]);
				if (ratio !== null && ratio < minimum) {
					context.report({
						node: iconNode,
						messageId: 'lowContrast',
						data: { iconPath, theme, ratio: ratio.toFixed(2), minimum },
					});
				}
			}
		};

		const checkIconValue = (iconValue: TSESTree.Node) => {
			const value = unwrapExpression(iconValue);
			if (value?.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
				const light = findObjectProperty(value, 'light');
				const dark = findObjectProperty(value, 'dark');
				if (light) checkIcon(light.value, ['light']);
				if (dark) checkIcon(dark.value, ['dark']);
			} else {
				// A single icon shows on both themes.
				checkIcon(iconValue, ['light', 'dark']);
			}
		};

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					const description = findNodeDescriptionObject(node);
					const iconProperty = description && findObjectProperty(description, 'icon');
					if (iconProperty) checkIconValue(iconProperty.value);
				} else if (isCredentialTypeClass(node)) {
					const iconProperty = findClassProperty(node, 'icon');
					if (iconProperty?.value) checkIconValue(iconProperty.value);
				}
			},
		};
	},
});
