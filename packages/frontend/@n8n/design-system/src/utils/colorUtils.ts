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

/**
 * Converts a hex color to HSL components
 * @param hex - Hex color code (#RRGGBB)
 * @returns Object with h (0-360), s (0-100), l (0-100)
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const cleanHex = hex.replace('#', '');
	const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
	const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
	const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		return { h: 0, s: 0, l: Math.round(l * 100) };
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h: number;
	if (max === r) {
		h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	} else if (max === g) {
		h = ((b - r) / d + 2) / 6;
	} else {
		h = ((r - g) / d + 4) / 6;
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

/**
 * Converts HSL components to a hex color
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string (#RRGGBB)
 */
export function hslToHex(h: number, s: number, l: number): string {
	const sNorm = s / 100;
	const lNorm = l / 100;

	const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lNorm - c / 2;

	let r: number, g: number, b: number;

	if (h < 60) {
		[r, g, b] = [c, x, 0];
	} else if (h < 120) {
		[r, g, b] = [x, c, 0];
	} else if (h < 180) {
		[r, g, b] = [0, c, x];
	} else if (h < 240) {
		[r, g, b] = [0, x, c];
	} else if (h < 300) {
		[r, g, b] = [x, 0, c];
	} else {
		[r, g, b] = [c, 0, x];
	}

	const toHex = (n: number) =>
		Math.round((n + m) * 255)
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Calculates WCAG 2.0 relative luminance of a hex color
 * @param hex - Hex color code (#RRGGBB)
 * @returns Relative luminance (0-1)
 */
export function getRelativeLuminance(hex: string): number {
	const cleanHex = hex.replace('#', '');
	const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
	const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
	const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

	const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Returns an appropriate text color (dark or light) for a given background color
 * Uses WCAG luminance contrast threshold
 * @param bgHex - Background hex color code (#RRGGBB)
 * @returns Dark text (#2B2B2B) or light text (#F5F5F5)
 */
export function getContrastTextColor(bgHex: string): string {
	const DARK_TEXT = '#2B2B2B'; // ~neutral-850
	const LIGHT_TEXT = '#F5F5F5'; // ~neutral-125
	const luminance = getRelativeLuminance(bgHex);
	return luminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Normalizes a custom hex color for theme-appropriate display.
 * Extracts hue and saturation from the input, then sets lightness to match
 * the preset sticky note pattern (light backgrounds in light mode, dark in dark mode).
 * @param hex - User's chosen hex color (#RRGGBB)
 * @param isDark - Whether dark theme is active
 * @returns Object with normalized background, border, and text hex colors
 */
export function normalizeCustomColorForTheme(
	hex: string,
	isDark: boolean,
): { background: string; border: string; text: string } {
	const { h, s } = hexToHsl(hex);

	const bgLightness = isDark ? 15 : 90;
	const borderLightness = isDark ? 25 : 75;

	const background = hslToHex(h, s, bgLightness);
	const border = hslToHex(h, s, borderLightness);
	const text = getContrastTextColor(background);

	return { background, border, text };
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
