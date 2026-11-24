/**
 * Contrast text colors for custom sticky backgrounds.
 * Must stay in sync with the design system primitive tokens:
 * - DARK_TEXT matches --color--neutral-850 = hsl(0, 0%, 17%) from _primitives.scss
 * - LIGHT_TEXT matches --color--neutral-125 = hsl(0, 0%, 96%) from _primitives.scss
 * These are also the values used by --sticky--color--text in _tokens.scss / _tokens.dark.scss.
 */
const CONTRAST_TEXT_DARK = '#2B2B2B';
const CONTRAST_TEXT_LIGHT = '#F5F5F5';

/**
 * Validates if a string is a valid 6-digit hex color code
 * @param color - The color string to validate
 * @returns True if the color is a valid hex color (#RRGGBB format)
 */
export function isValidHexColor(color: string): boolean {
	if (!color || typeof color !== 'string') {
		return false;
	}
	return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const cleanHex = hex.replace('#', '');
	return {
		r: parseInt(cleanHex.substring(0, 2), 16) / 255,
		g: parseInt(cleanHex.substring(2, 4), 16) / 255,
		b: parseInt(cleanHex.substring(4, 6), 16) / 255,
	};
}

/**
 * Calculates WCAG 2.0 relative luminance of a hex color
 * @param hex - Hex color code (#RRGGBB)
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);

	const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Returns an appropriate text color (dark or light) for a given background color
 * Uses WCAG luminance contrast threshold
 * @param bgHex - Background hex color code (#RRGGBB)
 * @returns Dark text or light text hex
 */
export function getContrastTextColor(bgHex: string): string {
	const luminance = getRelativeLuminance(bgHex);
	return luminance > 0.179 ? CONTRAST_TEXT_DARK : CONTRAST_TEXT_LIGHT;
}

/**
 * Adjusts the lightness of a hex color
 * @param hexColor - Hex color code (#RRGGBB)
 * @param percent - Percentage to adjust (-100 to 100, positive = lighter, negative = darker)
 * @returns Adjusted hex color
 */
export function adjustColorLightness(hexColor: string, percent: number): string {
	if (!isValidHexColor(hexColor)) {
		return hexColor;
	}

	// Remove # and convert to RGB
	const hex = hexColor.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	// Adjust each component
	const adjust = (component: number) => {
		const adjusted = component + (component * percent) / 100;
		return Math.min(255, Math.max(0, Math.round(adjusted)));
	};

	const newR = adjust(r);
	const newG = adjust(g);
	const newB = adjust(b);

	// Convert back to hex
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`.toUpperCase();
}
