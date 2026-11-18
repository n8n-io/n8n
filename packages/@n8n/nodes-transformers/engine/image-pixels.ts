import { UserError } from '@n8n/errors';

export type RgbImage = { data: Uint8ClampedArray; width: number; height: number };

function toRgbOnWhite(pixels: Uint8Array, channels: number): Uint8ClampedArray {
	const count = pixels.length / channels;
	const rgb = new Uint8ClampedArray(count * 3);
	for (let i = 0; i < count; i++) {
		const source = i * channels;
		const gray = channels <= 2;
		const alpha = channels === 2 || channels === 4 ? pixels[source + channels - 1] / 255 : 1;
		for (let c = 0; c < 3; c++) {
			const value = pixels[source + (gray ? 0 : c)];
			rgb[i * 3 + c] = value * alpha + 255 * (1 - alpha);
		}
	}
	return rgb;
}

export async function toSquareRgb(buffer: Buffer, size: number): Promise<RgbImage> {
	const { Transformer, ResizeFilterType } = await import('@napi-rs/image');

	let oriented: Buffer;
	let width: number;
	let height: number;
	try {
		oriented = await new Transformer(buffer).rotate().png();
		({ width, height } = await new Transformer(oriented).metadata());
	} catch {
		throw new UserError('The file is not an image this node can read', {
			description: 'Use a JPEG, PNG, WebP, BMP or TIFF image.',
		});
	}

	const scale = size / Math.min(width, height);
	const resizedWidth = Math.max(size, Math.round(width * scale));
	const resizedHeight = Math.max(size, Math.round(height * scale));
	const pixels = await new Transformer(oriented)
		.resize(resizedWidth, resizedHeight, ResizeFilterType.CatmullRom)
		.crop(Math.floor((resizedWidth - size) / 2), Math.floor((resizedHeight - size) / 2), size, size)
		.rawPixels();

	const channels = pixels.length / (size * size);
	if (![1, 2, 3, 4].includes(channels)) {
		throw new UserError('The image has an unsupported pixel format', {
			description: 'Convert the image to an 8-bit JPEG or PNG.',
		});
	}

	return { data: toRgbOnWhite(pixels, channels), width: size, height: size };
}
