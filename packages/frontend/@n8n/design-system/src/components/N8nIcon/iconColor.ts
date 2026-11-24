import type { IconColor } from '../../types/icon';

// @TODO Tech debt - property value should be updated to match token names (text-shade-2 instead of text-dark for example)
const colorMap: Record<IconColor, string> = {
	primary: '--color--primary',
	secondary: '--color--secondary',
	'text-dark': '--color--text--shade-1',
	'text-base': '--color--text',
	'text-light': '--color--text--tint-1',
	'text-xlight': '--color--text--tint-2',
	danger: '--color--danger',
	success: '--color--success',
	warning: '--color--warning',
	'foreground-dark': '--color--foreground--shade-1',
	'foreground-xdark': '--color--foreground--shade-2',
};

/**
 * Resolve an icon color to a CSS `color` value.
 *
 * Named `IconColor` tokens map to their design-system CSS variable; a raw CSS custom
 * property (e.g. `--node--icon--color--blue`) is used directly. Anything else (no color,
 * or an unknown non-variable value) yields `undefined` so no inline color is applied.
 */
export function resolveIconColor(color: IconColor | (string & {}) | undefined): string | undefined {
	if (!color) return undefined;
	if (color in colorMap) return `var(${colorMap[color as IconColor]})`;
	if (color.startsWith('--')) return `var(${color})`;
	return undefined;
}
