
//#region src/shared/color/utils.ts
/**
* Converts a hex color string to RGB (Red, Green, Blue).
* @param hex Hex color string (e.g., "#ff5733" or "#f53")
* @returns An object containing red, green, and blue values (0-255).
*/
function hexToRGB(hex) {
	hex = hex.replace(/^#/, "");
	if (!/^[0-9A-F]{6}$/i.test(hex) && !/^[0-9A-F]{3}$/i.test(hex)) throw new Error(`Invalid hex color: ${hex}. Expected format: #RGB or #RRGGBB`);
	if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
	const bigint = parseInt(hex, 16);
	const r = bigint >> 16 & 255;
	const g = bigint >> 8 & 255;
	const b = bigint & 255;
	return {
		r,
		g,
		b
	};
}
/**
* Converts a hex color string to HSL (Hue, Saturation, Lightness).
* @param hex Hex color string (e.g., "#ff5733")
* @returns An object containing hue (0-360), saturation (0-100), and lightness (0-100) values.
*/
function hexToHSL(hex) {
	let { r, g, b } = hexToRGB(hex);
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h;
	let s;
	let l = (max + min) / 2;
	if (max === min) {
		h = s = 0;
		l *= 100;
	} else {
		const d = max - min;
		s = l > .5 ? d / (2 - max - min) : d / (max + min);
		if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h /= 6;
		h *= 360;
		s *= 100;
		l *= 100;
	}
	return {
		h,
		s,
		l
	};
}
/**
* Converts a hex color string to a human-readable color name.
* @param hex Hex color string (e.g., "#ff5733")
* @returns A human-readable color name based on the hue, saturation, and lightness.
*/
function getColorName(hex) {
	const { h, s, l } = hexToHSL(hex);
	if (s < 10) {
		if (l < 10) return "black";
		if (l > 95) return "white";
		if (l < 20) return "very dark gray";
		if (l < 35) return "dark gray";
		if (l < 65) return "gray";
		if (l < 80) return "light gray";
		return "very light gray";
	}
	let baseName;
	if (h < 15 || h >= 345) baseName = "red";
	else if (h < 45) baseName = "orange";
	else if (h < 75) baseName = "yellow";
	else if (h < 105) baseName = "yellow-green";
	else if (h < 135) baseName = "green";
	else if (h < 165) baseName = "green-cyan";
	else if (h < 195) baseName = "cyan";
	else if (h < 225) baseName = "blue";
	else if (h < 255) baseName = "blue-violet";
	else if (h < 285) baseName = "violet";
	else if (h < 315) baseName = "magenta";
	else baseName = "red-magenta";
	const descriptors = [];
	if (s > 80) descriptors.push("vibrant");
	else if (s < 30) descriptors.push("muted");
	if (l > 80) descriptors.push("light");
	else if (l < 30) descriptors.push("dark");
	return descriptors.length > 0 ? `${descriptors.join(" ")} ${baseName}` : baseName;
}
function getColorContrast(hex) {
	const { r, g, b } = hexToRGB(hex);
	const luminance = (.299 * r + .587 * g + .114 * b) / 255;
	return luminance > .5 ? "dark" : "light";
}

//#endregion
Object.defineProperty(exports, 'getColorContrast', {
  enumerable: true,
  get: function () {
    return getColorContrast;
  }
});
Object.defineProperty(exports, 'getColorName', {
  enumerable: true,
  get: function () {
    return getColorName;
  }
});
//# sourceMappingURL=utils.cjs.map