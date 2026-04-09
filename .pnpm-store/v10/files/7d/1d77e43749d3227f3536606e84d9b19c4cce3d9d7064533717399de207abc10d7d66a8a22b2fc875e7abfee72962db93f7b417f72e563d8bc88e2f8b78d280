
//#region src/shared/color/parse.ts
/**
* Parses a color string into a Color object.
* Supports hex (#rrggbb, #rgb), rgb(), hsl(), and hsb()/hsv() formats.
*/
function parseColor(value) {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.startsWith("#")) return parseHex(trimmed);
	if (trimmed.startsWith("rgb")) return parseRgb(trimmed);
	if (trimmed.startsWith("hsl")) return parseHsl(trimmed);
	if (trimmed.startsWith("hsb") || trimmed.startsWith("hsv")) return parseHsb(trimmed);
	throw new Error(`Unable to parse color: ${value}`);
}
function parseHex(hex) {
	let normalized = hex.slice(1);
	if (!/^[0-9A-F]{3}$/i.test(normalized) && !/^[0-9A-F]{6}$/i.test(normalized) && !/^[0-9A-F]{8}$/i.test(normalized)) throw new Error(`Invalid hex color: ${hex}. Expected format: #RGB, #RRGGBB, or #RRGGBBAA`);
	if (normalized.length === 3) normalized = normalized.split("").map((c) => c + c).join("");
	if (normalized.length === 6) {
		const bigint = parseInt(normalized, 16);
		return {
			space: "rgb",
			r: bigint >> 16 & 255,
			g: bigint >> 8 & 255,
			b: bigint & 255,
			alpha: 1
		};
	}
	if (normalized.length === 8) {
		const bigint = parseInt(normalized, 16);
		return {
			space: "rgb",
			r: bigint >> 24 & 255,
			g: bigint >> 16 & 255,
			b: bigint >> 8 & 255,
			alpha: (bigint & 255) / 255
		};
	}
	throw new Error(`Invalid hex color: ${hex}`);
}
function parseRgb(rgb) {
	const match = rgb.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
	if (!match) throw new Error(`Invalid RGB color: ${rgb}`);
	return {
		space: "rgb",
		r: parseFloat(match[1]),
		g: parseFloat(match[2]),
		b: parseFloat(match[3]),
		alpha: match[4] ? parseFloat(match[4]) : 1
	};
}
function parseHsl(hsl) {
	const match = hsl.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/);
	if (!match) throw new Error(`Invalid HSL color: ${hsl}`);
	return {
		space: "hsl",
		h: parseFloat(match[1]),
		s: parseFloat(match[2]),
		l: parseFloat(match[3]),
		alpha: match[4] ? parseFloat(match[4]) : 1
	};
}
function parseHsb(hsb) {
	const match = hsb.match(/hsb[av]?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+)\s*)?\)/);
	if (!match) throw new Error(`Invalid HSB color: ${hsb}`);
	return {
		space: "hsb",
		h: parseFloat(match[1]),
		s: parseFloat(match[2]),
		b: parseFloat(match[3]),
		alpha: match[4] ? parseFloat(match[4]) : 1
	};
}
/**
* Normalizes a value to a Color object.
* If already a Color, returns it. If a string, parses it.
*/
function normalizeColor(value) {
	if (typeof value === "string") return parseColor(value);
	return value;
}
/**
* Checks if a string is a valid color.
*/
function isValidColor(value) {
	try {
		parseColor(value);
		return true;
	} catch {
		return false;
	}
}

//#endregion
Object.defineProperty(exports, 'isValidColor', {
  enumerable: true,
  get: function () {
    return isValidColor;
  }
});
Object.defineProperty(exports, 'normalizeColor', {
  enumerable: true,
  get: function () {
    return normalizeColor;
  }
});
Object.defineProperty(exports, 'parseColor', {
  enumerable: true,
  get: function () {
    return parseColor;
  }
});
//# sourceMappingURL=parse.cjs.map