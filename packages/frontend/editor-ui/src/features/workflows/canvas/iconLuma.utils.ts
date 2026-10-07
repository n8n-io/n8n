/** Tonal range of an icon: the 5th and 95th percentile luma of its opaque pixels (0–1). */
export type LumaRange = { lo: number; hi: number };

/** The full 0–1 range. Used until an icon is measured, or when it can't be. */
export const FULL_LUMA_RANGE: LumaRange = { lo: 0, hi: 1 };

// Below this spread an icon counts as one flat color and maps to the top of the band
const FLAT_RANGE_THRESHOLD = 0.04;
const MEASURE_SIZE = 96;
const TABLE_STEPS = 32;

/** Rec. 709 luma coefficients, the same ones the CSS `grayscale()` filter uses. */
export const LUMA_MATRIX =
	'.2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0';

/** Reads the luma range from RGBA pixel data and skips mostly transparent pixels. */
export function getLumaRange(data: Uint8ClampedArray): LumaRange | null {
	const lumas: number[] = [];
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 128) continue;
		lumas.push((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255);
	}
	if (lumas.length === 0) return null;

	lumas.sort((a, b) => a - b);
	const at = (p: number) => lumas[Math.min(lumas.length - 1, Math.floor(p * lumas.length))];
	return { lo: at(0.05), hi: at(0.95) };
}

/**
 * Builds `tableValues` for an `feFuncR/G/B` that maps the range linearly onto
 * `floor…1`. Values outside the range clamp to the band's ends.
 */
export function getLumaRemapTable({ lo, hi }: LumaRange, floor: number): string {
	const isFlat = hi - lo < FLAT_RANGE_THRESHOLD;
	const values: string[] = [];
	for (let i = 0; i <= TABLE_STEPS; i++) {
		const x = i / TABLE_STEPS;
		const t = isFlat ? 1 : Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
		values.push((floor + t * (1 - floor)).toFixed(4));
	}
	return values.join(' ');
}

const rangeCache = new Map<string, Promise<LumaRange | null>>();

async function measure(src: string): Promise<LumaRange | null> {
	try {
		const img = new Image();
		// Lets CORS-enabled remote icons be read; other remote icons fail and fall back
		img.crossOrigin = 'anonymous';
		img.src = src;
		await img.decode();

		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = MEASURE_SIZE;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return null;

		ctx.drawImage(img, 0, 0, MEASURE_SIZE, MEASURE_SIZE);
		return getLumaRange(ctx.getImageData(0, 0, MEASURE_SIZE, MEASURE_SIZE).data);
	} catch {
		return null;
	}
}

/** Measures an icon's luma range once per URL. Resolves to `null` if the icon can't be read. */
export async function measureIconLumaRange(src: string): Promise<LumaRange | null> {
	let range = rangeCache.get(src);
	if (!range) {
		range = measure(src);
		rangeCache.set(src, range);
	}
	return await range;
}
