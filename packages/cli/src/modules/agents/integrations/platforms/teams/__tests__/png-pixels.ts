import { inflateSync } from 'node:zlib';

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Minimal reader for the 8-bit RGBA, non-interlaced PNGs the Teams package carries.
 * Written out rather than pulling in a decoder and its types for a few assertions.
 */
export function readRgbaPixels(png: Buffer): Rgba[] {
	const width = png.readUInt32BE(16);
	const height = png.readUInt32BE(20);
	expect([png.readUInt8(24), png.readUInt8(25), png.readUInt8(28)]).toEqual([8, 6, 0]);

	const idat: Buffer[] = [];
	for (let offset = 8; offset + 8 <= png.length; ) {
		const length = png.readUInt32BE(offset);
		const type = png.toString('ascii', offset + 4, offset + 8);
		if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
		offset += length + 12;
	}

	const raw = inflateSync(Buffer.concat(idat));
	const bpp = 4;
	const stride = width * bpp;
	const out = Buffer.alloc(height * stride);

	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x++) {
			const left = x >= bpp ? out[y * stride + x - bpp] : 0;
			const up = y > 0 ? out[(y - 1) * stride + x] : 0;
			const upLeft = y > 0 && x >= bpp ? out[(y - 1) * stride + x - bpp] : 0;
			let value = line[x];
			if (filter === 1) value += left;
			else if (filter === 2) value += up;
			else if (filter === 3) value += Math.floor((left + up) / 2);
			else if (filter === 4) {
				const p = left + up - upLeft;
				const [dL, dU, dUL] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
				value += dL <= dU && dL <= dUL ? left : dU <= dUL ? up : upLeft;
			}
			out[y * stride + x] = value & 0xff;
		}
	}

	const pixels: Rgba[] = [];
	for (let i = 0; i < out.length; i += bpp) {
		pixels.push({ r: out[i], g: out[i + 1], b: out[i + 2], a: out[i + 3] });
	}
	return pixels;
}
