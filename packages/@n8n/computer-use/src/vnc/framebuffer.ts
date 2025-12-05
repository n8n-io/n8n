/**
 * Framebuffer handling and PNG encoding for VNC screenshots.
 * Uses pngjs library for PNG encoding.
 */

import { PNG } from 'pngjs';

/**
 * Encode RGBA pixel data as a PNG image using pngjs.
 *
 * @param pixelData - Raw pixel data in RGBA format
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns PNG-encoded buffer
 */
export function encodePng(pixelData: Uint8Array, width: number, height: number): Buffer {
	const png = new PNG({ width, height });

	// Copy pixel data to PNG buffer
	for (let i = 0; i < pixelData.length; i++) {
		png.data[i] = pixelData[i];
	}

	return PNG.sync.write(png);
}

/**
 * Convert raw VNC pixel data to RGBA based on the pixel format.
 * Handles various bit depths and channel layouts.
 *
 * @param rawData - Raw pixel data from VNC
 * @param width - Image width
 * @param height - Image height
 * @param bitsPerPixel - Bits per pixel (8, 16, or 32)
 * @param redShift - Bit position of red channel
 * @param greenShift - Bit position of green channel
 * @param blueShift - Bit position of blue channel
 * @param redMax - Maximum value for red channel
 * @param greenMax - Maximum value for green channel
 * @param blueMax - Maximum value for blue channel
 * @param bigEndian - Whether multi-byte values are big-endian
 * @returns RGBA pixel data
 */
export function convertVncPixelData(
	rawData: Uint8Array,
	width: number,
	height: number,
	bitsPerPixel: 8 | 16 | 32,
	redShift: number,
	greenShift: number,
	blueShift: number,
	redMax: number,
	greenMax: number,
	blueMax: number,
	bigEndian: boolean,
): Uint8Array {
	const pixelCount = width * height;
	const bytesPerPixel = bitsPerPixel / 8;
	const result = new Uint8Array(pixelCount * 4);

	for (let i = 0; i < pixelCount; i++) {
		const srcOffset = i * bytesPerPixel;
		const dstOffset = i * 4;

		// Read pixel value based on bit depth and endianness
		let pixel = 0;
		if (bitsPerPixel === 8) {
			pixel = rawData[srcOffset];
		} else if (bitsPerPixel === 16) {
			if (bigEndian) {
				pixel = (rawData[srcOffset] << 8) | rawData[srcOffset + 1];
			} else {
				pixel = rawData[srcOffset] | (rawData[srcOffset + 1] << 8);
			}
		} else {
			// 32-bit
			if (bigEndian) {
				pixel =
					(rawData[srcOffset] << 24) |
					(rawData[srcOffset + 1] << 16) |
					(rawData[srcOffset + 2] << 8) |
					rawData[srcOffset + 3];
			} else {
				pixel =
					rawData[srcOffset] |
					(rawData[srcOffset + 1] << 8) |
					(rawData[srcOffset + 2] << 16) |
					(rawData[srcOffset + 3] << 24);
			}
		}

		// Extract and normalize color channels
		const r = ((pixel >> redShift) & redMax) * 255;
		const g = ((pixel >> greenShift) & greenMax) * 255;
		const b = ((pixel >> blueShift) & blueMax) * 255;

		result[dstOffset] = Math.round(r / redMax);
		result[dstOffset + 1] = Math.round(g / greenMax);
		result[dstOffset + 2] = Math.round(b / blueMax);
		result[dstOffset + 3] = 255; // Alpha = opaque
	}

	return result;
}

/**
 * Crop a region from pixel data.
 *
 * @param pixelData - Source RGBA pixel data
 * @param srcWidth - Source image width
 * @param srcHeight - Source image height
 * @param x - Crop region X offset
 * @param y - Crop region Y offset
 * @param cropWidth - Crop region width
 * @param cropHeight - Crop region height
 * @returns Cropped RGBA pixel data
 */
export function cropPixelData(
	pixelData: Uint8Array,
	srcWidth: number,
	_srcHeight: number,
	x: number,
	y: number,
	cropWidth: number,
	cropHeight: number,
): Uint8Array {
	const result = new Uint8Array(cropWidth * cropHeight * 4);
	const bytesPerPixel = 4;

	for (let row = 0; row < cropHeight; row++) {
		const srcRowOffset = ((y + row) * srcWidth + x) * bytesPerPixel;
		const dstRowOffset = row * cropWidth * bytesPerPixel;
		const rowBytes = cropWidth * bytesPerPixel;

		for (let i = 0; i < rowBytes; i++) {
			result[dstRowOffset + i] = pixelData[srcRowOffset + i];
		}
	}

	return result;
}

/**
 * Scale pixel data using nearest-neighbor interpolation.
 *
 * @param pixelData - Source RGBA pixel data
 * @param srcWidth - Source width
 * @param srcHeight - Source height
 * @param dstWidth - Destination width
 * @param dstHeight - Destination height
 * @returns Scaled RGBA pixel data
 */
export function scalePixelData(
	pixelData: Uint8Array,
	srcWidth: number,
	srcHeight: number,
	dstWidth: number,
	dstHeight: number,
): Uint8Array {
	const result = new Uint8Array(dstWidth * dstHeight * 4);
	const bytesPerPixel = 4;

	const xRatio = srcWidth / dstWidth;
	const yRatio = srcHeight / dstHeight;

	for (let y = 0; y < dstHeight; y++) {
		const srcY = Math.floor(y * yRatio);
		for (let x = 0; x < dstWidth; x++) {
			const srcX = Math.floor(x * xRatio);

			const srcOffset = (srcY * srcWidth + srcX) * bytesPerPixel;
			const dstOffset = (y * dstWidth + x) * bytesPerPixel;

			result[dstOffset] = pixelData[srcOffset];
			result[dstOffset + 1] = pixelData[srcOffset + 1];
			result[dstOffset + 2] = pixelData[srcOffset + 2];
			result[dstOffset + 3] = pixelData[srcOffset + 3];
		}
	}

	return result;
}
