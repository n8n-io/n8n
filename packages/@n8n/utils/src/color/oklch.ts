/**
 * sRGB ⇄ oklch conversions, using Björn Ottosson's matrices. Channels are
 * 0..255; oklch is [lightness 0..1, chroma, hue in degrees].
 */

export type Rgb = [number, number, number];
export type Oklch = [number, number, number];

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c >= 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);

/** Reads `#RRGGBB`. */
export function hexToRgb(hex: string): Rgb {
	const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
	return [channel(1), channel(3), channel(5)];
}

/** Writes `#RRGGBB` in upper case. */
export function rgbToHex(rgb: Rgb): string {
	return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function rgbToOklch([r, g, b]: Rgb): Oklch {
	const [lr, lg, lb] = [r, g, b].map((c) => toLinear(c / 255));
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}

/** Clips to the sRGB gamut. */
export function oklchToRgb([lightness, chroma, hue]: Oklch): Rgb {
	const hueRadians = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(hueRadians);
	const b = chroma * Math.sin(hueRadians);
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const channel = (value: number) => Math.round(clamp(fromLinear(value)) * 255);
	return [
		channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

/**
 * Mixes two colours in oklch along the shorter hue arc, as CSS
 * `color-mix(in oklch, …)` and `linear-gradient(in oklch, …)` do.
 */
export function oklchMixer(from: string, to: string): (progress: number) => Rgb {
	const [l1, c1, h1] = rgbToOklch(hexToRgb(from));
	const [l2, c2, h2] = rgbToOklch(hexToRgb(to));
	// A grey has no hue of its own, so it takes the other colour's.
	const [hueFrom, hueTo] = [c1 < 1e-4 ? h2 : h1, c2 < 1e-4 ? h1 : h2];
	const hueDelta = ((hueTo - hueFrom + 540) % 360) - 180;
	return (t) => oklchToRgb([l1 + (l2 - l1) * t, c1 + (c2 - c1) * t, hueFrom + hueDelta * t]);
}
