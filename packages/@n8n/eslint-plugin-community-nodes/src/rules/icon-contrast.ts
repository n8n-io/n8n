import type { Resvg as ResvgClass } from '@resvg/resvg-js';
import { TSESTree } from '@typescript-eslint/utils';
import { parse, wcagContrast, type Rgb } from 'culori';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';

import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

type Theme = 'light' | 'dark';

/**
 * `--node--color--background` of each editor theme. The design system defines it in
 * SCSS only, so the published plugin keeps a copy of the values.
 */
const NODE_BACKGROUNDS: Record<Theme, string> = { light: '#ffffff', dark: '#2b2b2b' };

/** Share of the icon's pixels that must be visible. Calibrated on the icons n8n ships. */
const VISIBLE_SHARE_MINIMUM = 0.1;

/** Icon formats the editor shows, with the media type to embed them. */
const MEDIA_TYPES: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png' };

const RENDER_SIZE = 64;

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
 * Renders the icon file the way the editor shows it, as an image scaled into a square,
 * and returns the share of icon pixels that reach the contrast minimum on the background.
 * Returns null when the icon paints no pixels.
 */
function getVisibleShare(
	Resvg: typeof ResvgClass,
	image: string,
	background: string,
	minimum: number,
): number | null {
	const backgroundColor = parse(background);
	if (!backgroundColor) return null;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_SIZE}" height="${RENDER_SIZE}"><image width="${RENDER_SIZE}" height="${RENDER_SIZE}" href="${image}"/></svg>`;
	// System fonts differ between machines, so text in an icon does not count.
	const options = { font: { loadSystemFonts: false } };
	// The first render gives the icon's shape, the second its colors on the background.
	const shape = new Resvg(svg, options).render().pixels;
	const shown = new Resvg(svg, { ...options, background }).render().pixels;

	let iconPixels = 0;
	let visiblePixels = 0;
	for (let i = 0; i < shape.length; i += 4) {
		const [, , , alpha = 0] = shape.subarray(i, i + 4);
		if (alpha < 128) continue;
		iconPixels++;
		const [r = 0, g = 0, b = 0] = shown.subarray(i, i + 3);
		const pixel: Rgb = { mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 };
		if (wcagContrast(pixel, backgroundColor) >= minimum) visiblePixels++;
	}
	return iconPixels === 0 ? null : visiblePixels / iconPixels;
}

export const IconContrastRule = createRule({
	name: 'icon-contrast',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Warn when an icon is hard to see on the light or dark node background',
		},
		messages: {
			lowContrast:
				'Icon "{{ iconPath }}" is hard to see on the {{ theme }} theme: only {{ visible }}% of it stands out from the node background.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					minimum: {
						type: 'number',
						minimum: 1,
						description:
							'Contrast ratio with the node background at which a pixel counts as visible.',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ minimum: 1.5 }],
	create(context, [{ minimum }]) {
		const isNodeOrCredentialFile =
			isFileType(context.filename, '.node.ts') || isFileType(context.filename, '.credentials.ts');
		if (!isNodeOrCredentialFile) return {};

		const Resvg = loadResvg();
		if (!Resvg) return {};

		const checkIcon = (iconNode: TSESTree.Node, themes: Theme[]) => {
			const icon = getStringLiteralValue(iconNode);
			if (!icon?.startsWith('file:')) return;
			const iconPath = icon.slice('file:'.length);
			const mediaType = MEDIA_TYPES[extname(iconPath).toLowerCase()];
			if (!mediaType) return;

			let image: string;
			try {
				const file = readFileSync(join(dirname(context.filename), iconPath));
				image = `data:${mediaType};base64,${file.toString('base64')}`;
			} catch {
				// icon-validation reports missing files.
				return;
			}

			for (const theme of themes) {
				const share = getVisibleShare(Resvg, image, NODE_BACKGROUNDS[theme], minimum);
				if (share !== null && share < VISIBLE_SHARE_MINIMUM) {
					context.report({
						node: iconNode,
						messageId: 'lowContrast',
						data: { iconPath, theme, visible: Math.floor(share * 100) },
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
