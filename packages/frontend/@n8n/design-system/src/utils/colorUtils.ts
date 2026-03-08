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
