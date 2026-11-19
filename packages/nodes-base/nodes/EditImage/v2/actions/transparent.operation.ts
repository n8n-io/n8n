import type { Canvas } from '@napi-rs/canvas';

import { createCanvas, getString, type OperationData, toCanvasMatteColor } from '../helpers';

async function parseColor(color: string): Promise<[number, number, number]> {
	const canvas = await createCanvas(1, 1, toCanvasMatteColor(color));
	const data = canvas.getContext('2d').getImageData(0, 0, 1, 1).data;
	return [data[0], data[1], data[2]];
}

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const [red, green, blue] = await parseColor(getString(operation, 'color'));
	const context = canvas.getContext('2d');
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let index = 0; index < imageData.data.length; index += 4) {
		if (
			imageData.data[index] === red &&
			imageData.data[index + 1] === green &&
			imageData.data[index + 2] === blue
		) {
			imageData.data[index + 3] = 0;
		}
	}
	context.putImageData(imageData, 0, 0);
	return canvas;
}
