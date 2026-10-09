import { TSESTree } from '@typescript-eslint/utils';
import type { Rgb } from 'culori';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
	createRule,
	findClassProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isCredentialTypeClass,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';
import { contrastRatio, getSvgPaintColors } from '../utils/icon-contrast.js';

const backgrounds: Record<'light' | 'dark', Rgb> = {
	light: { mode: 'rgb', r: 1, g: 1, b: 1 },
	dark: { mode: 'rgb', r: 43 / 255, g: 43 / 255, b: 43 / 255 },
};

export const IconContrastRule = createRule({
	name: 'icon-contrast',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Warn when an SVG icon has low contrast on a light or dark node background',
		},
		messages: {
			lowContrast:
				'Icon has {{ ratio }}:1 contrast on the {{ theme }} theme (minimum {{ minimum }}:1).',
		},
		schema: [
			{
				description: 'Set the minimum contrast ratio for the icon.',
				type: 'object',
				properties: {
					minimum: { type: 'number', minimum: 1, description: 'Minimum WCAG contrast ratio.' },
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ minimum: 1.5 }],
	create(context, [options]) {
		if (
			!isFileType(context.filename, '.node.ts') &&
			!isFileType(context.filename, '.credentials.ts')
		) {
			return {};
		}

		const checkIcon = (icon: TSESTree.Node, theme: 'light' | 'dark') => {
			const iconPath = getStringLiteralValue(icon);
			if (!iconPath?.startsWith('file:') || !iconPath.toLowerCase().endsWith('.svg')) return;

			let svg: string;
			try {
				svg = readFileSync(join(dirname(context.filename), iconPath.slice(5)), 'utf8');
			} catch {
				return;
			}

			const colors = getSvgPaintColors(svg);
			if (!colors) return;
			const ratio = Math.max(...colors.map((color) => contrastRatio(color, backgrounds[theme])));
			if (ratio < options.minimum) {
				context.report({
					node: icon,
					messageId: 'lowContrast',
					data: {
						theme,
						ratio: ratio.toFixed(2),
						minimum: String(options.minimum),
					},
				});
			}
		};

		const checkIconValue = (icon: TSESTree.Node) => {
			if (icon.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
				for (const theme of ['light', 'dark'] as const) {
					const variant = findObjectProperty(icon, theme);
					if (variant) checkIcon(variant.value, theme);
				}
			} else {
				checkIcon(icon, 'light');
				checkIcon(icon, 'dark');
			}
		};

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					const description = findNodeDescriptionObject(node);
					if (!description) return;
					const icon = findObjectProperty(description, 'icon');
					if (icon) checkIconValue(icon.value);
				} else if (isCredentialTypeClass(node)) {
					const icon = findClassProperty(node, 'icon');
					if (icon?.value) checkIconValue(icon.value);
				}
			},
		};
	},
});
