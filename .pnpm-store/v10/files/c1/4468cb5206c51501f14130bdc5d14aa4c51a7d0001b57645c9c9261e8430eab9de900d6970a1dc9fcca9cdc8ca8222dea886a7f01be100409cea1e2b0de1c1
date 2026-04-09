import { colorToString, convertToHsb, convertToHsl, convertToRgb } from "./convert.js";

//#region src/shared/color/gradient.ts
/**
* Generates a CSS gradient for a color slider track.
*/
function getSliderGradient(color, channel, colorSpace = color.space) {
	const hsl = convertToHsl(color);
	const hsb = convertToHsb(color);
	switch (channel) {
		case "hue": return getHueGradient();
		case "saturation": return getSaturationGradient(hsl, colorSpace);
		case "lightness": return getLightnessGradient(hsl);
		case "brightness": return getBrightnessGradient(hsb);
		case "red": return getRedGradient(color);
		case "green": return getGreenGradient(color);
		case "blue": return getBlueGradient(color);
		case "alpha": return getAlphaGradient(color);
		default: return "";
	}
}
/**
* Generates a CSS gradient for a color area (2D picker).
*/
function getAreaGradient(color, xChannel, yChannel, colorSpace = color.space) {
	const hsl = convertToHsl(color);
	const hsb = convertToHsb(color);
	const gradientX = getChannelGradientForArea(color, xChannel, colorSpace, "x");
	const gradientY = getChannelGradientForArea(color, yChannel, colorSpace, "y");
	const bgColor = getAreaBackgroundColor(color, xChannel, yChannel, colorSpace);
	return {
		background: bgColor,
		gradientX,
		gradientY
	};
}
function getHueGradient() {
	return "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
}
function getSaturationGradient(hsl, colorSpace) {
	const start = colorToString({
		space: "hsl",
		h: hsl.h,
		s: 0,
		l: colorSpace === "hsl" ? hsl.l : 50,
		alpha: 1
	}, "hsl");
	const end = colorToString({
		space: "hsl",
		h: hsl.h,
		s: 100,
		l: colorSpace === "hsl" ? hsl.l : 50,
		alpha: 1
	}, "hsl");
	return `linear-gradient(to right, ${start}, ${end})`;
}
function getLightnessGradient(hsl) {
	const start = colorToString({
		space: "hsl",
		h: hsl.h,
		s: hsl.s,
		l: 0,
		alpha: 1
	}, "hsl");
	const mid = colorToString({
		space: "hsl",
		h: hsl.h,
		s: hsl.s,
		l: 50,
		alpha: 1
	}, "hsl");
	const end = colorToString({
		space: "hsl",
		h: hsl.h,
		s: hsl.s,
		l: 100,
		alpha: 1
	}, "hsl");
	return `linear-gradient(to right, ${start}, ${mid}, ${end})`;
}
function getBrightnessGradient(hsb) {
	const start = colorToString({
		space: "hsb",
		h: hsb.h,
		s: hsb.s,
		b: 0,
		alpha: 1
	}, "rgb");
	const end = colorToString({
		space: "hsb",
		h: hsb.h,
		s: hsb.s,
		b: 100,
		alpha: 1
	}, "rgb");
	return `linear-gradient(to right, ${start}, ${end})`;
}
function getRedGradient(color) {
	const { g, b, alpha } = color.space === "rgb" ? color : {
		g: 128,
		b: 128,
		alpha: 1
	};
	const start = colorToString({
		space: "rgb",
		r: 0,
		g,
		b,
		alpha: 1
	}, "rgb");
	const end = colorToString({
		space: "rgb",
		r: 255,
		g,
		b,
		alpha: 1
	}, "rgb");
	return `linear-gradient(to right, ${start}, ${end})`;
}
function getGreenGradient(color) {
	const { r, b, alpha } = color.space === "rgb" ? color : {
		r: 128,
		b: 128,
		alpha: 1
	};
	const start = colorToString({
		space: "rgb",
		r,
		g: 0,
		b,
		alpha: 1
	}, "rgb");
	const end = colorToString({
		space: "rgb",
		r,
		g: 255,
		b,
		alpha: 1
	}, "rgb");
	return `linear-gradient(to right, ${start}, ${end})`;
}
function getBlueGradient(color) {
	const { r, g, alpha } = color.space === "rgb" ? color : {
		r: 128,
		g: 128,
		alpha: 1
	};
	const start = colorToString({
		space: "rgb",
		r,
		g,
		b: 0,
		alpha: 1
	}, "rgb");
	const end = colorToString({
		space: "rgb",
		r,
		g,
		b: 255,
		alpha: 1
	}, "rgb");
	return `linear-gradient(to right, ${start}, ${end})`;
}
const CHECKERBOARD_LAYERS = [
	"linear-gradient(45deg, #ccc 25%, transparent 25%)",
	"linear-gradient(-45deg, #ccc 25%, transparent 25%)",
	"linear-gradient(45deg, transparent 75%, #ccc 75%)",
	"linear-gradient(-45deg, transparent 75%, #ccc 75%)"
].join(", ");
function getAlphaGradient(color) {
	const { r, g, b } = color.space === "rgb" ? color : convertToRgb(color);
	const solidRgb = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
	return `linear-gradient(to right, transparent, ${solidRgb}), ${CHECKERBOARD_LAYERS}`;
}
function getChannelGradientForArea(color, channel, colorSpace, axis) {
	const direction = axis === "x" ? "to right" : "to top";
	const hsl = convertToHsl(color);
	const hsb = convertToHsb(color);
	switch (channel) {
		case "saturation": {
			if (colorSpace === "hsb") return `linear-gradient(${direction}, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))`;
			const fullColor = colorToString({
				space: "hsl",
				h: hsl.h,
				s: 100,
				l: 50,
				alpha: 1
			}, "rgb");
			return `linear-gradient(${direction}, #ffffff, ${fullColor})`;
		}
		case "lightness": {
			const mid = colorToString({
				space: "hsl",
				h: hsl.h,
				s: hsl.s,
				l: 50,
				alpha: 1
			}, "rgb");
			return `linear-gradient(${direction}, #000000, ${mid}, #ffffff)`;
		}
		case "brightness": return `linear-gradient(${direction}, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1))`;
		default: return "";
	}
}
function getAreaBackgroundColor(color, xChannel, yChannel, colorSpace) {
	const hsl = convertToHsl(color);
	const hsb = convertToHsb(color);
	if (colorSpace === "hsl" && xChannel === "saturation" && yChannel === "lightness") return colorToString({
		space: "hsl",
		h: hsl.h,
		s: 100,
		l: 50,
		alpha: 1
	}, "rgb");
	if (colorSpace === "hsb" && xChannel === "saturation" && yChannel === "brightness") return colorToString({
		space: "hsb",
		h: hsb.h,
		s: 100,
		b: 100,
		alpha: 1
	}, "rgb");
	return "#ffffff";
}
/**
* Gets the CSS background style for a color area.
*/
function getAreaBackgroundStyle(color, xChannel, yChannel, colorSpace = color.space) {
	const hsl = convertToHsl(color);
	const hsb = convertToHsb(color);
	if (xChannel === "hue") {
		const hueGradient = "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
		if (yChannel === "saturation") {
			const desatColor = colorToString({
				space: "hsl",
				h: hsl.h,
				s: 0,
				l: hsl.l,
				alpha: 1
			}, "rgb");
			return { backgroundImage: `linear-gradient(to bottom, transparent, ${desatColor}), ${hueGradient}` };
		}
		if (yChannel === "lightness") return { backgroundImage: `linear-gradient(to top, #000000, transparent, #ffffff), ${hueGradient}` };
		if (yChannel === "brightness") return { backgroundImage: `linear-gradient(to top, #000000, transparent), ${hueGradient}` };
	}
	if (xChannel === "saturation" && (yChannel === "lightness" || yChannel === "brightness")) {
		if (colorSpace === "hsl") {
			const hueColor = colorToString({
				space: "hsl",
				h: hsl.h,
				s: 100,
				l: 50,
				alpha: 1
			}, "rgb");
			const grayColor = colorToString({
				space: "hsl",
				h: hsl.h,
				s: 0,
				l: 50,
				alpha: 1
			}, "rgb");
			const satGradient = `linear-gradient(to right, ${grayColor}, transparent)`;
			const lightGradient = `linear-gradient(to top, #000000, transparent, #ffffff)`;
			return {
				backgroundColor: hueColor,
				backgroundImage: `${lightGradient}, ${satGradient}`
			};
		}
		if (colorSpace === "hsb") {
			const hueColor = colorToString({
				space: "hsb",
				h: hsb.h,
				s: 100,
				b: 100,
				alpha: 1
			}, "rgb");
			const satGradient = `linear-gradient(to right, #ffffff, transparent)`;
			const brightGradient = `linear-gradient(to top, #000000, transparent)`;
			return {
				backgroundColor: hueColor,
				backgroundImage: `${brightGradient}, ${satGradient}`
			};
		}
	}
	if (colorSpace === "rgb" && (xChannel === "red" || xChannel === "green" || xChannel === "blue") && (yChannel === "red" || yChannel === "green" || yChannel === "blue")) {
		const rgb = convertToRgb(color);
		const allChannels = [
			"red",
			"green",
			"blue"
		];
		const varyingChannels = [xChannel, yChannel];
		const constantChannel = allChannels.find((c) => !varyingChannels.includes(c));
		const constantValue = rgb[constantChannel === "red" ? "r" : constantChannel === "green" ? "g" : "b"];
		const xColorStart = {
			space: "rgb",
			r: 0,
			g: 0,
			b: 0,
			alpha: 1
		};
		const xColorEnd = {
			space: "rgb",
			r: xChannel === "red" ? 255 : 0,
			g: xChannel === "green" ? 255 : 0,
			b: xChannel === "blue" ? 255 : 0,
			alpha: 1
		};
		const xGradient = `linear-gradient(to right, ${colorToString(xColorStart, "rgb")}, ${colorToString(xColorEnd, "rgb")})`;
		const yColorEnd = {
			space: "rgb",
			r: yChannel === "red" ? 255 : 0,
			g: yChannel === "green" ? 255 : 0,
			b: yChannel === "blue" ? 255 : 0,
			alpha: 1
		};
		const yGradient = `linear-gradient(to top, ${colorToString(xColorStart, "rgb")}, ${colorToString(yColorEnd, "rgb")})`;
		const bgColor = {
			space: "rgb",
			r: constantChannel === "red" ? constantValue : 0,
			g: constantChannel === "green" ? constantValue : 0,
			b: constantChannel === "blue" ? constantValue : 0,
			alpha: 1
		};
		return {
			backgroundColor: colorToString(bgColor, "rgb"),
			backgroundImage: `${yGradient}, ${xGradient}`,
			backgroundBlendMode: "screen"
		};
	}
	const { background, gradientX, gradientY } = getAreaGradient(color, xChannel, yChannel, colorSpace);
	const gradients = [];
	if (gradientY) gradients.push(gradientY);
	if (gradientX) gradients.push(gradientX);
	return {
		backgroundColor: background,
		backgroundImage: gradients.join(", ")
	};
}
/**
* Gets the CSS background for a slider track.
*/
function getSliderBackgroundStyle(color, channel, colorSpace = color.space) {
	const gradient = getSliderGradient(color, channel, colorSpace);
	if (channel === "alpha") return {
		background: gradient,
		backgroundSize: "100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px",
		backgroundPosition: "0 0, 0 0, 0 4px, 4px -4px, -4px 0px"
	};
	return { background: gradient };
}

//#endregion
export { getAreaBackgroundStyle, getAreaGradient, getSliderBackgroundStyle, getSliderGradient };
//# sourceMappingURL=gradient.js.map