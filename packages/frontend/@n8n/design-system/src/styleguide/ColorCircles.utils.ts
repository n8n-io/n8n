/**
 * Convert an HSL color to a Hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
	l /= 100;
	const a = (s * Math.min(l, 1 - l)) / 100;
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, '0');
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Resolve calc() expressions in HSL strings
 */
export function resolveHSLCalc(hslString: string): string {
	const calcRegex = /calc\(([^)]+)\)/;
	const matchCalc = hslString.match(calcRegex);
	if (!matchCalc) {
		return hslString;
	}
	const expression = matchCalc[1].replace(/%/g, '');
	const evaluation: number = eval(expression);
	const finalPercentage = `${evaluation}%`;
	return hslString.replace(calcRegex, finalPercentage);
}

/**
 * Get the Hex color from an HSL color string
 */
export function getHex(hsl: string): string {
	hsl = resolveHSLCalc(hsl);
	const colors = hsl
		.replace('hsl(', '')
		.replace(')', '')
		.replace(/%/g, '')
		.split(',')
		.map(parseFloat);
	return hslToHex(colors[0], colors[1], colors[2]);
}
