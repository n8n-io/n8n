import type { Canvas } from '@napi-rs/canvas';
import type { IDataObject } from 'n8n-workflow';

import { detectImageFormat } from '../helpers';

type ColorInformation = {
	colorType: 'grayscale' | 'grayscale-alpha' | 'rgb' | 'rgba' | 'unknown';
	bitDepth?: number;
	channels?: number;
	hasAlpha?: boolean;
};

const COLOR_TYPES = {
	luminance8: 0,
	luminanceAlpha8: 1,
	rgb8: 2,
	rgba8: 3,
	luminance16: 4,
	luminanceAlpha16: 5,
	rgb16: 6,
	rgba16: 7,
	rgb32Float: 8,
	rgba32Float: 9,
} as const;

function getColorInformation(colorType: number): ColorInformation {
	switch (colorType) {
		case COLOR_TYPES.luminance8:
			return { colorType: 'grayscale', bitDepth: 8, channels: 1, hasAlpha: false };
		case COLOR_TYPES.luminanceAlpha8:
			return { colorType: 'grayscale-alpha', bitDepth: 8, channels: 2, hasAlpha: true };
		case COLOR_TYPES.rgb8:
			return { colorType: 'rgb', bitDepth: 8, channels: 3, hasAlpha: false };
		case COLOR_TYPES.rgba8:
			return { colorType: 'rgba', bitDepth: 8, channels: 4, hasAlpha: true };
		case COLOR_TYPES.luminance16:
			return { colorType: 'grayscale', bitDepth: 16, channels: 1, hasAlpha: false };
		case COLOR_TYPES.luminanceAlpha16:
			return { colorType: 'grayscale-alpha', bitDepth: 16, channels: 2, hasAlpha: true };
		case COLOR_TYPES.rgb16:
			return { colorType: 'rgb', bitDepth: 16, channels: 3, hasAlpha: false };
		case COLOR_TYPES.rgba16:
			return { colorType: 'rgba', bitDepth: 16, channels: 4, hasAlpha: true };
		case COLOR_TYPES.rgb32Float:
			return { colorType: 'rgb', bitDepth: 32, channels: 3, hasAlpha: false };
		case COLOR_TYPES.rgba32Float:
			return { colorType: 'rgba', bitDepth: 32, channels: 4, hasAlpha: true };
		default:
			return { colorType: 'unknown' };
	}
}

function getOrientation(orientation: number): string {
	switch (orientation) {
		case 1:
			return 'normal';
		case 2:
			return 'flip-horizontal';
		case 3:
			return 'rotate-180';
		case 4:
			return 'flip-vertical';
		case 5:
			return 'transpose';
		case 6:
			return 'rotate-90';
		case 7:
			return 'transverse';
		case 8:
			return 'rotate-270';
		default:
			return 'unknown';
	}
}

export async function execute(buffer: Buffer, canvas: Canvas): Promise<IDataObject> {
	const { Transformer } = await import('@napi-rs/image');
	try {
		const metadata = await new Transformer(buffer).metadata(true);
		return {
			size: {
				width: canvas.width,
				height: canvas.height,
			},
			format: metadata.format,
			...getColorInformation(metadata.colorType),
			fileSize: buffer.length,
			...(metadata.orientation === undefined
				? {}
				: { orientation: getOrientation(metadata.orientation) }),
			...(metadata.exif === undefined ? {} : { exif: metadata.exif }),
		};
	} catch {
		return {
			size: {
				width: canvas.width,
				height: canvas.height,
			},
			format: detectImageFormat(buffer) ?? 'unknown',
			colorType: 'unknown',
			fileSize: buffer.length,
		};
	}
}
