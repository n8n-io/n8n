export const COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'hsv'] as const;

export type ColorFormat = (typeof COLOR_FORMATS)[number];

/** Hue, saturation, value, and alpha. Hue is 0–360. The other channels are 0–100. */
export type Hsva = {
	h: number;
	s: number;
	v: number;
	a: number;
};

/** Red at full saturation. The panel uses this when the field has no color yet. */
export const DEFAULT_HSVA: Hsva = { h: 0, s: 100, v: 100, a: 100 };

export function isColorFormat(value: string | undefined): value is ColorFormat {
	return value === 'hex' || value === 'rgb' || value === 'hsl' || value === 'hsv';
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function parseColor(value: string | null | undefined): Hsva | null {
	if (value === null || value === undefined) return null;
	const text = value.trim();
	if (text === '') return null;

	if (text.startsWith('#')) return parseHex(text);
	if (text.includes('hsl')) return parseHsl(text);
	if (text.includes('hsv')) return parseHsv(text);
	if (text.includes('rgb')) return parseRgb(text);
	return null;
}

/**
 * Writes a color in the same shape Element Plus wrote.
 * An omitted format is hex without alpha and `rgba()` with alpha.
 */
export function formatColor(
	color: Hsva,
	format: ColorFormat | undefined,
	showAlpha: boolean,
): string {
	const { r, g, b } = hsvToRgb(color.h, color.s, color.v);
	const alpha = Math.floor(clamp(color.a, 0, 100)) / 100;

	if (showAlpha) {
		if (format === 'hsl') {
			const hsl = hsvToHsl(color.h, color.s, color.v);
			return `hsla(${Math.round(color.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%, ${alpha})`;
		}
		if (format === 'hsv') {
			return `hsva(${Math.round(color.h)}, ${Math.round(color.s)}%, ${Math.round(color.v)}%, ${alpha})`;
		}
		if (format === 'hex') {
			return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}${channelToHex(alpha * 255)}`;
		}
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	if (format === 'hsl') {
		const hsl = hsvToHsl(color.h, color.s, color.v);
		return `hsl(${Math.round(color.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`;
	}
	if (format === 'hsv') {
		return `hsv(${Math.round(color.h)}, ${Math.round(color.s)}%, ${Math.round(color.v)}%)`;
	}
	if (format === 'rgb') {
		return `rgb(${r}, ${g}, ${b})`;
	}
	return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

/** CSS color for the trigger and the opacity gradient. */
export function toCssColor(color: Hsva): string {
	const { r, g, b } = hsvToRgb(color.h, color.s, color.v);
	const alpha = Math.floor(clamp(color.a, 0, 100)) / 100;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function toOpaqueCss(color: Hsva): string {
	const { r, g, b } = hsvToRgb(color.h, color.s, color.v);
	return `rgb(${r}, ${g}, ${b})`;
}

function parseHex(value: string): Hsva | null {
	const hex = value.slice(1);
	if (!/^[\da-f]{3}$|^[\da-f]{6}$|^[\da-f]{8}$/i.test(hex)) return null;

	const expanded =
		hex.length === 3
			? hex
					.split('')
					.map((channel) => channel + channel)
					.join('')
			: hex;
	const r = Number.parseInt(expanded.slice(0, 2), 16);
	const g = Number.parseInt(expanded.slice(2, 4), 16);
	const b = Number.parseInt(expanded.slice(4, 6), 16);
	const alpha =
		expanded.length === 8 ? (Number.parseInt(expanded.slice(6, 8), 16) / 255) * 100 : 100;
	return { ...rgbToHsv(r, g, b), a: alpha };
}

function parseRgb(value: string): Hsva | null {
	const channels = readChannels(value);
	if (channels === null || channels.length < 3) return null;
	const [r, g, b, alpha = 1] = channels;
	return { ...rgbToHsv(r, g, b), a: clamp(alpha, 0, 1) * 100 };
}

function parseHsl(value: string): Hsva | null {
	const channels = readChannels(value);
	if (channels === null || channels.length < 3) return null;
	const [h, s, l, alpha = 1] = channels;
	const hsv = hslToHsv(h, s, l);
	return { ...hsv, a: clamp(alpha, 0, 1) * 100 };
}

function parseHsv(value: string): Hsva | null {
	const channels = readChannels(value);
	if (channels === null || channels.length < 3) return null;
	const [h, s, v, alpha = 1] = channels;
	return {
		h: clamp(h, 0, 360),
		s: clamp(s, 0, 100),
		v: clamp(v, 0, 100),
		a: clamp(alpha, 0, 1) * 100,
	};
}

function readChannels(value: string): number[] | null {
	const match = /\(([^)]+)\)/.exec(value);
	if (match?.[1] === undefined) return null;
	const parts = match[1]
		.split(/[\s,/]+/)
		.map((part) => part.trim())
		.filter((part) => part !== '');
	if (parts.length === 0) return null;
	return parts.map((part) => Number.parseFloat(part));
}

function channelToHex(value: number): string {
	return Math.min(255, Math.max(0, Math.round(value)))
		.toString(16)
		.padStart(2, '0')
		.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): Pick<Hsva, 'h' | 's' | 'v'> {
	const rn = clamp(r, 0, 255) / 255;
	const gn = clamp(g, 0, 255) / 255;
	const bn = clamp(b, 0, 255) / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;
	let hue = 0;

	if (delta !== 0) {
		if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
		else if (max === gn) hue = (bn - rn) / delta + 2;
		else hue = (rn - gn) / delta + 4;
		hue /= 6;
	}

	return {
		h: hue * 360,
		s: (max === 0 ? 0 : delta / max) * 100,
		v: max * 100,
	};
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
	const hue = (((h % 360) + 360) % 360) / 60;
	const sat = clamp(s, 0, 100) / 100;
	const val = clamp(v, 0, 100) / 100;
	const sector = Math.floor(hue) % 6;
	const fraction = hue - Math.floor(hue);
	const p = val * (1 - sat);
	const q = val * (1 - fraction * sat);
	const t = val * (1 - (1 - fraction) * sat);
	const channels = [
		[val, t, p],
		[q, val, p],
		[p, val, t],
		[p, q, val],
		[t, p, val],
		[val, p, q],
	][sector];

	return {
		r: Math.round((channels?.[0] ?? 0) * 255),
		g: Math.round((channels?.[1] ?? 0) * 255),
		b: Math.round((channels?.[2] ?? 0) * 255),
	};
}

function hsvToHsl(h: number, s: number, v: number): { h: number; s: number; l: number } {
	const sat = clamp(s, 0, 100) / 100;
	const val = clamp(v, 0, 100) / 100;
	const lightnessBase = (2 - sat) * val;
	const saturation = (sat * val) / (lightnessBase < 1 ? lightnessBase : 2 - lightnessBase) || 0;
	return { h, s: saturation, l: lightnessBase / 2 };
}

function hslToHsv(h: number, s: number, l: number): Pick<Hsva, 'h' | 's' | 'v'> {
	let sat = s / 100;
	let light = l / 100;
	let smin = sat;
	const lmin = Math.max(light, 0.01);
	light *= 2;
	sat *= light <= 1 ? light : 2 - light;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	const value = (light + sat) / 2;
	const sv = light === 0 ? (2 * smin) / (lmin + smin) : (2 * sat) / (light + sat);
	return { h: clamp(h, 0, 360), s: clamp(sv * 100, 0, 100), v: clamp(value * 100, 0, 100) };
}
