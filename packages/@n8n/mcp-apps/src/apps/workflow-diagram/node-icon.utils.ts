import { getNodeIconSvg } from '@n8n/node-icons';

import type { PreviewWorkflowNodeIcon } from '../../shared/workflow-diagram';

const THEME_ICON_COLOR_VALUES = {
	neutral: { light: 'oklch(79.21% 0 89.88)', dark: 'oklch(92.19% 0 89.88)' },
	gray: { light: '#7d7d87', dark: '#a5a5ad' },
	black: { light: 'oklch(31.71% 0 89.88)', dark: 'oklch(92.19% 0 89.88)' },
	blue: { light: '#3a42e9', dark: '#898fff' },
	'light-blue': { light: '#5fabf7', dark: '#58abff' },
	'dark-blue': { light: '#353f6e', dark: '#7ba7ff' },
	'sky-blue': { light: '#5699ff', dark: '#7fb3ff' },
	orange: { light: '#ff965a', dark: '#ffb080' },
	'orange-red': {
		light: 'oklch(69.96% 0.202 44.44)',
		dark: 'oklch(69.96% 0.202 44.44)',
	},
	amber: { light: '#f92', dark: '#ffb966' },
	rust: { light: '#e44d26', dark: '#f75' },
	'pink-red': { light: '#ea4b71', dark: '#f85d82' },
	magenta: { light: '#e91e63', dark: '#ff4d80' },
	red: { light: 'oklch(58.3% 0.2387 28.48)', dark: 'oklch(70.22% 0.1892 22.23)' },
	'light-green': { light: '#31c4ab', dark: '#20b69e' },
	green: { light: 'oklch(51.52% 0.0905 185.73)', dark: 'oklch(72.89% 0.2119 147.82)' },
	'dark-green': { light: '#157562', dark: '#86decc' },
	emerald: { light: '#2fb67c', dark: '#50d499' },
	'forest-green': { light: '#4a4', dark: '#6c6' },
	lime: { light: '#62f730', dark: '#7fff55' },
	azure: { light: '#54b8c9', dark: '#7dd6e3' },
	teal: { light: '#00b7bc', dark: '#33d6db' },
	purple: { light: '#539', dark: '#9b6dd5' },
	violet: { light: '#9b6dd5', dark: '#b48de6' },
	lavender: { light: '#8287eb', dark: '#a8acff' },
	crimson: { light: '#724', dark: '#f188a2' },
} as const;

type ThemeIconColor = keyof typeof THEME_ICON_COLOR_VALUES;

export function getPreviewNodeIconSvg(icon: PreviewWorkflowNodeIcon): string | undefined {
	return icon.type === 'icon' ? getNodeIconSvg(icon.name) : undefined;
}

export function resolvePreviewNodeIconColor(color?: string): string | undefined {
	if (!color) return undefined;

	const normalized = color.trim().toLowerCase();
	if (isThemeIconColor(normalized)) {
		const tokenColor = THEME_ICON_COLOR_VALUES[normalized];

		return `light-dark(${tokenColor.light}, ${tokenColor.dark})`;
	}

	if (isNeutralCssColor(normalized)) return undefined;

	return color.trim();
}

function isThemeIconColor(color: string): color is ThemeIconColor {
	return color in THEME_ICON_COLOR_VALUES;
}

function isNeutralCssColor(color: string) {
	return (
		color === 'white' ||
		color === '#fff' ||
		color === '#ffffff' ||
		color === 'rgb(255, 255, 255)' ||
		color === 'black' ||
		color === '#000' ||
		color === '#000000' ||
		color === 'rgb(0, 0, 0)'
	);
}
