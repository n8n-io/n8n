const require_color_convert = require('./convert.cjs');

//#region src/shared/color/channel.ts
/**
* Gets the range (min, max, step) for a color channel.
*/
function getChannelRange(channel) {
	switch (channel) {
		case "hue": return {
			min: 0,
			max: 360,
			step: 1
		};
		case "saturation":
		case "lightness":
		case "brightness":
		case "alpha": return {
			min: 0,
			max: 100,
			step: 1
		};
		case "red":
		case "green":
		case "blue": return {
			min: 0,
			max: 255,
			step: 1
		};
		default: throw new Error(`Unknown channel: ${channel}`);
	}
}
/**
* Gets the display name for a channel.
*/
function getChannelName(channel) {
	const names = {
		red: "Red",
		green: "Green",
		blue: "Blue",
		hue: "Hue",
		saturation: "Saturation",
		lightness: "Lightness",
		brightness: "Brightness",
		alpha: "Alpha"
	};
	return names[channel] ?? channel;
}
/**
* Gets the value of a specific channel from a color.
* Avoids conversion if the color is already in the target color space.
*/
function getChannelValue(color, channel) {
	switch (channel) {
		case "red": return color.space === "rgb" ? color.r : require_color_convert.convertToRgb(color).r;
		case "green": return color.space === "rgb" ? color.g : require_color_convert.convertToRgb(color).g;
		case "blue": return color.space === "rgb" ? color.b : require_color_convert.convertToRgb(color).b;
		case "hue": return color.space === "hsl" ? color.h : require_color_convert.convertToHsl(color).h;
		case "saturation":
			if (color.space === "hsl") return color.s;
			if (color.space === "hsb") return color.s;
			return require_color_convert.convertToHsl(color).s;
		case "lightness": return color.space === "hsl" ? color.l : require_color_convert.convertToHsl(color).l;
		case "brightness": return color.space === "hsb" ? color.b : require_color_convert.convertToHsb(color).b;
		case "alpha": return color.alpha * 100;
		default: throw new Error(`Unknown channel: ${channel}`);
	}
}
/**
* Sets a channel value on a color, returning a new color.
* The returned color maintains the original color space.
*/
function setChannelValue(color, channel, value) {
	const range = getChannelRange(channel);
	const clamped = Math.max(range.min, Math.min(range.max, value));
	if (channel === "alpha") return {
		...color,
		alpha: clamped / 100
	};
	if (channel === "red" || channel === "green" || channel === "blue") {
		const rgb = require_color_convert.convertToRgb(color);
		const newRgb = {
			...rgb,
			[channel === "red" ? "r" : channel === "green" ? "g" : "b"]: clamped
		};
		return convertFromRgb(newRgb, color.space);
	}
	if (channel === "hue" || channel === "lightness") {
		const hsl = require_color_convert.convertToHsl(color);
		const newHsl = {
			...hsl,
			[channel === "hue" ? "h" : "l"]: clamped
		};
		return convertFromHsl(newHsl, color.space);
	}
	if (channel === "saturation") {
		if (color.space === "hsb") {
			const hsb = require_color_convert.convertToHsb(color);
			const newHsb = {
				...hsb,
				s: clamped
			};
			return convertFromHsb(newHsb, color.space);
		}
		const hsl = require_color_convert.convertToHsl(color);
		const newHsl = {
			...hsl,
			s: clamped
		};
		return convertFromHsl(newHsl, color.space);
	}
	if (channel === "brightness") {
		const hsb = require_color_convert.convertToHsb(color);
		const newHsb = {
			...hsb,
			b: clamped
		};
		return convertFromHsb(newHsb, color.space);
	}
	throw new Error(`Unknown channel: ${channel}`);
}
/**
* Sets multiple channel values at once, preserving exact values.
* Useful when updating 2D color areas where both channels change simultaneously.
*/
function setChannelValues(color, channels) {
	if (channels.length === 0) return color;
	if (channels.length === 1) return setChannelValue(color, channels[0].channel, channels[0].value);
	const channelNames = channels.map((c) => c.channel);
	const hasBrightness = channelNames.includes("brightness");
	const hasLightness = channelNames.includes("lightness");
	const hasRgb = channelNames.some((c) => c === "red" || c === "green" || c === "blue");
	let workingColor;
	if (hasRgb) workingColor = require_color_convert.convertToRgb(color);
	else if (hasBrightness) workingColor = require_color_convert.convertToHsb(color);
	else if (hasLightness) workingColor = require_color_convert.convertToHsl(color);
	else workingColor = require_color_convert.convertToHsl(color);
	for (const { channel, value } of channels) {
		const range = getChannelRange(channel);
		const clamped = Math.max(range.min, Math.min(range.max, value));
		if (channel === "alpha") workingColor = {
			...workingColor,
			alpha: clamped / 100
		};
		else if (workingColor.space === "rgb" && (channel === "red" || channel === "green" || channel === "blue")) {
			const key = channel === "red" ? "r" : channel === "green" ? "g" : "b";
			workingColor = {
				...workingColor,
				[key]: clamped
			};
		} else if (workingColor.space === "hsl" && (channel === "hue" || channel === "saturation" || channel === "lightness")) {
			const key = channel === "hue" ? "h" : channel === "saturation" ? "s" : "l";
			workingColor = {
				...workingColor,
				[key]: clamped
			};
		} else if (workingColor.space === "hsb" && (channel === "hue" || channel === "saturation" || channel === "brightness")) {
			const key = channel === "hue" ? "h" : channel === "saturation" ? "s" : "b";
			workingColor = {
				...workingColor,
				[key]: clamped
			};
		}
	}
	if (channels.length === 1 && workingColor.space !== color.space) {
		if (color.space === "rgb") return require_color_convert.convertToRgb(workingColor);
		if (color.space === "hsl") return require_color_convert.convertToHsl(workingColor);
		if (color.space === "hsb") return require_color_convert.convertToHsb(workingColor);
	}
	return workingColor;
}
/**
* Converts an RGB color to a specific color space.
*/
function convertFromRgb(rgb, targetSpace) {
	if (targetSpace === "rgb") return rgb;
	if (targetSpace === "hsl") return rgbToHsl(rgb);
	if (targetSpace === "hsb") return rgbToHsb(rgb);
	throw new Error(`Unknown color space: ${targetSpace}`);
}
/**
* Converts an HSL color to a specific color space.
*/
function convertFromHsl(hsl, targetSpace) {
	if (targetSpace === "hsl") return hsl;
	const rgb = hslToRgb(hsl);
	if (targetSpace === "rgb") return rgb;
	if (targetSpace === "hsb") return rgbToHsb(rgb);
	throw new Error(`Unknown color space: ${targetSpace}`);
}
/**
* Converts an HSB color to a specific color space.
*/
function convertFromHsb(hsb, targetSpace) {
	if (targetSpace === "hsb") return hsb;
	const rgb = hsbToRgb(hsb);
	if (targetSpace === "rgb") return rgb;
	if (targetSpace === "hsl") return rgbToHsl(rgb);
	throw new Error(`Unknown color space: ${targetSpace}`);
}
function rgbToHsl(rgb) {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > .5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return {
		space: "hsl",
		h: h * 360,
		s: s * 100,
		l: l * 100,
		alpha: rgb.alpha
	};
}
function hslToRgb(hsl) {
	const h = hsl.h / 360;
	const s = hsl.s / 100;
	const l = hsl.l / 100;
	let r, g, b;
	if (s === 0) r = g = b = l;
	else {
		const hue2rgb = (p$1, q$1, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p$1 + (q$1 - p$1) * 6 * t;
			if (t < 1 / 2) return q$1;
			if (t < 2 / 3) return p$1 + (q$1 - p$1) * (2 / 3 - t) * 6;
			return p$1;
		};
		const q = l < .5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return {
		space: "rgb",
		r: r * 255,
		g: g * 255,
		b: b * 255,
		alpha: hsl.alpha
	};
}
function rgbToHsb(rgb) {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	let h = 0;
	const s = max === 0 ? 0 : d / max;
	const v = max;
	if (max !== min) {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return {
		space: "hsb",
		h: h * 360,
		s: s * 100,
		b: v * 100,
		alpha: rgb.alpha
	};
}
function hsbToRgb(hsb) {
	const h = hsb.h / 360;
	const s = hsb.s / 100;
	const v = hsb.b / 100;
	let r = 0;
	let g = 0;
	let b = 0;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		case 5:
			r = v;
			g = p;
			b = q;
			break;
	}
	return {
		space: "rgb",
		r: r * 255,
		g: g * 255,
		b: b * 255,
		alpha: hsb.alpha
	};
}

//#endregion
Object.defineProperty(exports, 'getChannelName', {
  enumerable: true,
  get: function () {
    return getChannelName;
  }
});
Object.defineProperty(exports, 'getChannelRange', {
  enumerable: true,
  get: function () {
    return getChannelRange;
  }
});
Object.defineProperty(exports, 'getChannelValue', {
  enumerable: true,
  get: function () {
    return getChannelValue;
  }
});
Object.defineProperty(exports, 'setChannelValue', {
  enumerable: true,
  get: function () {
    return setChannelValue;
  }
});
Object.defineProperty(exports, 'setChannelValues', {
  enumerable: true,
  get: function () {
    return setChannelValues;
  }
});
//# sourceMappingURL=channel.cjs.map