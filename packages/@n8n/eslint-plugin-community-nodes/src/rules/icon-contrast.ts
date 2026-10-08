import { TSESTree } from '@typescript-eslint/utils';
import { dirname } from 'node:path';

import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
	DEFAULT_CONTRAST_MINIMUM,
	THEME_BACKGROUNDS,
	getSvgContrastRatio,
	readSvgIcon,
} from '../utils/index.js';
import type { IconTheme } from '../utils/index.js';

const messages = {
	lowContrast:
		'Icon "{{ iconPath }}" has a contrast ratio of {{ ratio }}:1 on the {{ theme }} theme. The minimum is {{ minimum }}:1. Provide a {{ theme }} variant via the `{ light, dark }` form or adjust the icon colors.',
} as const;

export const IconContrastRule = createRule({
	name: 'icon-contrast',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Warn when an SVG icon has low contrast against the node background of the light or dark theme',
		},
		messages,
		schema: [
			{
				type: 'object',
				properties: {
					minimum: {
						type: 'number',
						minimum: 1,
						description: 'Lowest contrast ratio an icon must reach against the node background',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ minimum: DEFAULT_CONTRAST_MINIMUM }],
	create(context, [{ minimum }]) {
		if (
			!isFileType(context.filename, '.node.ts') &&
			!isFileType(context.filename, '.credentials.ts')
		) {
			return {};
		}

		const checkIcon = (iconNode: TSESTree.Node, themes: IconTheme[]) => {
			const iconPath = getStringLiteralValue(iconNode);
			if (!iconPath?.startsWith('file:')) return;

			const svg = readSvgIcon(iconPath, dirname(context.filename));
			if (svg === null) return;

			for (const theme of themes) {
				const ratio = getSvgContrastRatio(svg, THEME_BACKGROUNDS[theme]);
				if (ratio === null || ratio >= minimum) continue;

				context.report({
					node: iconNode,
					messageId: 'lowContrast',
					data: {
						iconPath: iconPath.replace(/^file:/, ''),
						ratio: ratio.toFixed(1),
						theme,
						minimum,
					},
				});
			}
		};

		const checkIconValue = (iconValue: TSESTree.Node) => {
			if (iconValue.type === TSESTree.AST_NODE_TYPES.Literal) {
				checkIcon(iconValue, ['light', 'dark']);
			} else if (iconValue.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
				const lightProperty = findObjectProperty(iconValue, 'light');
				const darkProperty = findObjectProperty(iconValue, 'dark');
				if (lightProperty) checkIcon(lightProperty.value, ['light']);
				if (darkProperty) checkIcon(darkProperty.value, ['dark']);
			}
		};

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
						return;
					}

					const iconProperty = findObjectProperty(descriptionProperty.value, 'icon');
					if (iconProperty) {
						checkIconValue(iconProperty.value);
					}
				} else if (isCredentialTypeClass(node)) {
					const iconProperty = findClassProperty(node, 'icon');
					if (iconProperty?.value) {
						checkIconValue(iconProperty.value);
					}
				}
			},
		};
	},
});
