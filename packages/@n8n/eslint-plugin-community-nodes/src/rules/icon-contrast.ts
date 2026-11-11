import type { Resvg as ResvgClass } from '@resvg/resvg-js';
import { TSESTree } from '@typescript-eslint/utils';
import { parse, wcagContrast, type Rgb } from 'culori';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

type Theme = 'light' | 'dark';

/** `--node--color--background` of each editor theme. */
const NODE_BACKGROUNDS: Record<Theme, string> = { light: '#ffffff', dark: '#2b2b2b' };

/** A pixel counts as visible when it reaches this contrast with the node background. */
const PIXEL_CONTRAST_MINIMUM = 1.5;

/** Share of the icon's pixels that must be visible. Calibrated on the icons n8n ships. */
const VISIBLE_SHARE_MINIMUM = 0.1;

const RENDER_OPTIONS = {
	fitTo: { mode: 'width', value: 64 },
	// System fonts differ between machines, so text in an icon does not count.
	font: { loadSystemFonts: false },
} as const;

function isResvgModule(value: unknown): value is typeof import('@resvg/resvg-js') {
	return typeof value === 'object' && value !== null && 'Resvg' in value;
}

/**
 * Loads the renderer on first use. It ships a native binary for each platform.
 * When the binary is missing (optional dependencies were skipped), the rule turns itself off.
 */
function loadResvg(): typeof ResvgClass | null {
	try {
		const resvg: unknown = createRequire(import.meta.url)('@resvg/resvg-js');
		return isResvgModule(resvg) ? resvg.Resvg : null;
	} catch {
		return null;
	}
}

/**
 * Renders the SVG on the background and returns the share of icon pixels that reach
 * the pixel contrast minimum. Returns null when the SVG paints no pixels.
 */
function getVisibleShare(Resvg: typeof ResvgClass, svg: string, background: string): number | null {
	const backgroundColor = parse(background);
	if (!backgroundColor) return null;
	// The first render gives the icon's shape, the second its colors on the background.
	const shape = new Resvg(svg, RENDER_OPTIONS).render().pixels;
	const shown = new Resvg(svg, { ...RENDER_OPTIONS, background }).render().pixels;

	let iconPixels = 0;
	let visiblePixels = 0;
	for (let i = 0; i < shape.length; i += 4) {
		const [, , , alpha = 0] = shape.subarray(i, i + 4);
		if (alpha < 128) continue;
		iconPixels++;
		const [r = 0, g = 0, b = 0] = shown.subarray(i, i + 3);
		const pixel: Rgb = { mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 };
		if (wcagContrast(pixel, backgroundColor) >= PIXEL_CONTRAST_MINIMUM) visiblePixels++;
	}
	return iconPixels === 0 ? null : visiblePixels / iconPixels;
}

export const IconContrastRule = createRule({
	name: 'icon-contrast',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Warn when an SVG icon is hard to see on the light or dark node background',
		},
		messages: {
			lowContrast:
				'Icon "{{ iconPath }}" is hard to see on the {{ theme }} theme: only {{ visible }}% of it stands out from the node background.',
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

		const Resvg = loadResvg();
		if (!Resvg) return {};

		const checkIcon = (iconNode: TSESTree.Node, themes: Theme[]) => {
			const iconPath = getStringLiteralValue(iconNode);
			if (!iconPath?.startsWith('file:') || !iconPath.toLowerCase().endsWith('.svg')) return;

			let svg: string;
			try {
				svg = readFileSync(join(dirname(context.filename), iconPath.slice(5)), 'utf8');
			} catch {
				// icon-validation reports missing files.
				return;
			}

			for (const theme of themes) {
				let share: number | null;
				try {
					share = getVisibleShare(Resvg, svg, NODE_BACKGROUNDS[theme]);
				} catch {
					// Invalid SVG markup is out of scope for this rule.
					return;
				}
				if (share !== null && share < VISIBLE_SHARE_MINIMUM) {
					context.report({
						node: iconNode,
						messageId: 'lowContrast',
						data: { iconPath: iconPath.slice(5), theme, visible: Math.round(share * 100) },
					});
				}
			}
		};

		const checkIconValue = (iconValue: TSESTree.Node) => {
			if (iconValue.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
				const light = findObjectProperty(iconValue, 'light');
				const dark = findObjectProperty(iconValue, 'dark');
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
					const descriptionProperty = findClassProperty(node, 'description');
					if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
						return;
					}
					const iconProperty = findObjectProperty(descriptionProperty.value, 'icon');
					if (iconProperty) checkIconValue(iconProperty.value);
				} else if (isCredentialTypeClass(node)) {
					const iconProperty = findClassProperty(node, 'icon');
					if (iconProperty?.value) checkIconValue(iconProperty.value);
				}
			},
		};
	},
});
