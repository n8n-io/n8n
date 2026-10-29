import type { Canvas } from '@napi-rs/canvas';
import { UserError } from 'n8n-workflow';

import { getNumber, type OperationData } from '../helpers';

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const requestedX = Math.round(getNumber(operation, 'positionX'));
	const requestedY = Math.round(getNumber(operation, 'positionY'));
	const requestedWidth = Math.round(getNumber(operation, 'width'));
	const requestedHeight = Math.round(getNumber(operation, 'height'));
	const sourceX = Math.max(0, requestedX);
	const sourceY = Math.max(0, requestedY);
	const right = Math.min(canvas.width, requestedX + requestedWidth);
	const bottom = Math.min(canvas.height, requestedY + requestedHeight);
	const width = right - sourceX;
	const height = bottom - sourceY;

	if (width <= 0 || height <= 0) throw new UserError('The crop area is outside the image');

	const { createCanvas } = await import('@napi-rs/canvas');
	const output = createCanvas(width, height);
	output.getContext('2d').drawImage(canvas, sourceX, sourceY, width, height, 0, 0, width, height);
	return output;
}
