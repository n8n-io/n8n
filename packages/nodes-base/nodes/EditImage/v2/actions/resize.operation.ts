import type { Canvas } from '@napi-rs/canvas';
import { UserError } from 'n8n-workflow';

import { copyCanvas, getNumber, getString, type OperationData } from '../helpers';

export function calculateResizeDimensions(
	currentWidth: number,
	currentHeight: number,
	width: number,
	height: number,
	resizeOption: string,
): { width: number; height: number } {
	if (width <= 0 || height <= 0) {
		throw new UserError('Resize width and height must be greater than zero');
	}

	if (resizeOption === 'ignoreAspectRatio') {
		return { width: Math.round(width), height: Math.round(height) };
	}
	if (resizeOption === 'percent') {
		return {
			width: Math.round((currentWidth * width) / 100),
			height: Math.round((currentHeight * height) / 100),
		};
	}
	if (resizeOption === 'maximumArea') {
		// GraphicsMagick's @ geometry treats width × height as a total pixel budget.
		const scale = Math.sqrt((width * height) / (currentWidth * currentHeight));
		return {
			width: Math.floor(currentWidth * scale),
			height: Math.floor(currentHeight * scale),
		};
	}

	const scale =
		resizeOption === 'minimumArea'
			? Math.max(width / currentWidth, height / currentHeight)
			: Math.min(width / currentWidth, height / currentHeight);

	if (resizeOption === 'onlyIfLarger' && scale >= 1) {
		return { width: currentWidth, height: currentHeight };
	}
	if (resizeOption === 'onlyIfSmaller' && scale <= 1) {
		return { width: currentWidth, height: currentHeight };
	}

	return {
		width: Math.round(currentWidth * scale),
		height: Math.round(currentHeight * scale),
	};
}

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const dimensions = calculateResizeDimensions(
		canvas.width,
		canvas.height,
		getNumber(operation, 'width'),
		getNumber(operation, 'height'),
		getString(operation, 'resizeOption'),
	);
	if (dimensions.width === canvas.width && dimensions.height === canvas.height) return canvas;
	return await copyCanvas(canvas, dimensions.width, dimensions.height);
}
