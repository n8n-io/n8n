/**
 * Client-side preparation of an uploaded picture. The browser does the heavy
 * lifting so the server only ever receives a small, square, still image:
 * decoding (which also applies EXIF orientation), cropping, resizing and
 * re-encoding all happen on a canvas here. Re-encoding drops metadata and any
 * animation frames as a side effect.
 *
 * This is also where the picture gets compressed. A 12 MB photo leaves here
 * as a 512 px WebP of a few dozen kilobytes; the server checks the result
 * against the same limits but never re-encodes, so what is stored is exactly
 * what was previewed.
 */

import { USER_AVATAR_IMAGE_SIZE, USER_AVATAR_MIME_TYPES } from '@n8n/api-types';

export const AVATAR_ACCEPTED_TYPES = USER_AVATAR_MIME_TYPES;
export const AVATAR_ACCEPT_ATTRIBUTE = AVATAR_ACCEPTED_TYPES.join(',');
/** Raw files above this are refused before decoding; the output is always far smaller. */
export const AVATAR_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = USER_AVATAR_IMAGE_SIZE;
/**
 * Indistinguishable from the source at the sizes an avatar is shown at, and
 * about a quarter smaller than the next step up; below it artefacts start to
 * show on skin and gradients.
 */
const AVATAR_ENCODE_QUALITY = 0.85;
export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 3;

export type AvatarImageProblem = 'type' | 'size' | 'decode';

export class AvatarImageError extends Error {
	constructor(readonly problem: AvatarImageProblem) {
		super(`Avatar image problem: ${problem}`);
	}
}

export interface CropState {
	/** 1 = the shorter edge fills the frame; larger values zoom in. */
	zoom: number;
	/** Pan as a fraction (−1…1) of the available slack on each axis, so it stays valid across zooms. */
	panX: number;
	panY: number;
}

export interface DecodedAvatarSource {
	bitmap: ImageBitmap;
	width: number;
	height: number;
	/** Whether any pixel is see-through; decides whether a backdrop is dealt. */
	hasTransparency: boolean;
	/** Object URL for previewing; call `revoke()` when done. */
	previewUrl: string;
	revoke: () => void;
}

export function isAcceptedAvatarFile(file: File) {
	return (AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type);
}

export async function decodeAvatarSource(file: File): Promise<DecodedAvatarSource> {
	if (!isAcceptedAvatarFile(file)) throw new AvatarImageError('type');
	if (file.size > AVATAR_MAX_SOURCE_BYTES) throw new AvatarImageError('size');

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		throw new AvatarImageError('decode');
	}

	const previewUrl = URL.createObjectURL(file);
	return {
		bitmap,
		width: bitmap.width,
		height: bitmap.height,
		hasTransparency: file.type === 'image/jpeg' ? false : detectTransparency(bitmap),
		previewUrl,
		revoke: () => {
			URL.revokeObjectURL(previewUrl);
			bitmap.close();
		},
	};
}

/**
 * Whether a picture the server already holds has see-through pixels, so the
 * dialog knows whether to offer a backdrop for it. Anything going wrong
 * (offline, a broken picture) counts as opaque: the backdrop is then merely
 * not offered.
 */
export async function probeTransparency(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { credentials: 'include' });
		if (!response.ok) return false;
		const blob = await response.blob();
		if (blob.type === 'image/jpeg') return false;
		const bitmap = await createImageBitmap(blob);
		try {
			return detectTransparency(bitmap);
		} finally {
			bitmap.close();
		}
	} catch {
		return false;
	}
}

/** Samples the alpha channel of a downscaled copy; exact enough to decide on a backdrop. */
function detectTransparency(bitmap: ImageBitmap): boolean {
	const sample = 64;
	const canvas = document.createElement('canvas');
	canvas.width = sample;
	canvas.height = sample;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return false;
	context.drawImage(bitmap, 0, 0, sample, sample);
	const { data } = context.getImageData(0, 0, sample, sample);
	for (let i = 3; i < data.length; i += 4) {
		if (data[i] < 250) return true;
	}
	return false;
}

/**
 * The source rectangle the crop state selects, in source pixels. The crop is
 * always square and always inside the picture.
 */
export function cropRectangle(
	source: { width: number; height: number },
	crop: CropState,
): { x: number; y: number; size: number } {
	const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, crop.zoom));
	const size = Math.min(source.width, source.height) / zoom;
	const slackX = source.width - size;
	const slackY = source.height - size;
	const clampPan = (pan: number) => Math.min(1, Math.max(-1, pan));
	return {
		x: slackX / 2 + (clampPan(crop.panX) * slackX) / 2,
		y: slackY / 2 + (clampPan(crop.panY) * slackY) / 2,
		size,
	};
}

/**
 * CSS for showing the crop in a square preview element of any size, without a
 * canvas. Meant for an absolutely positioned image inside the preview box:
 * every value is a percentage of that box, so it holds at any preview size.
 */
export function cropPreviewStyle(source: { width: number; height: number }, crop: CropState) {
	const { x, y, size } = cropRectangle(source, crop);
	const scale = 100 / size;
	return {
		width: `${source.width * scale}%`,
		height: `${source.height * scale}%`,
		left: `${-x * scale}%`,
		top: `${-y * scale}%`,
	};
}

export interface RenderedAvatar {
	blob: Blob;
	fileName: string;
}

/**
 * Draws the crop into a square canvas, never upscaling, and encodes it. WebP
 * keeps transparency and is the smallest; a browser that can't encode WebP
 * (it hands back a PNG instead) gets JPEG, or PNG when there is transparency
 * to keep.
 */
export async function renderAvatar(
	source: DecodedAvatarSource,
	crop: CropState,
	outputSize = AVATAR_OUTPUT_SIZE,
): Promise<RenderedAvatar> {
	const { x, y, size } = cropRectangle(source, crop);
	const target = Math.min(outputSize, Math.round(size));

	const canvas = document.createElement('canvas');
	canvas.width = target;
	canvas.height = target;
	const context = canvas.getContext('2d');
	if (!context) throw new AvatarImageError('decode');
	context.imageSmoothingQuality = 'high';
	context.drawImage(source.bitmap, x, y, size, size, 0, 0, target, target);

	const webp = await encode(canvas, 'image/webp', AVATAR_ENCODE_QUALITY);
	if (webp?.type === 'image/webp') return { blob: webp, fileName: 'avatar.webp' };

	const fallbackType = source.hasTransparency ? 'image/png' : 'image/jpeg';
	const fallback = await encode(canvas, fallbackType, AVATAR_ENCODE_QUALITY);
	if (!fallback) throw new AvatarImageError('decode');
	return { blob: fallback, fileName: source.hasTransparency ? 'avatar.png' : 'avatar.jpg' };
}

async function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
	return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
