import type { Canvas } from '@napi-rs/canvas';

import { getNumber, type OperationData } from '../helpers';

const DEGREES_TO_RADIANS = Math.PI / 180;
const HALF_ANGLE_DEGREES_TO_RADIANS = Math.PI / 360;

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	// GraphicsMagick decomposes shear into tan(X / 2), followed by sin(Y).
	const shearX = Math.tan(getNumber(operation, 'degreesX') * HALF_ANGLE_DEGREES_TO_RADIANS);
	const shearY = Math.sin(getNumber(operation, 'degreesY') * DEGREES_TO_RADIANS);
	const scaleY = 1 - shearX * shearY;
	const corners = [
		{ x: 0, y: 0 },
		{ x: canvas.width, y: 0 },
		{ x: 0, y: canvas.height },
		{ x: canvas.width, y: canvas.height },
	].map(({ x, y }) => ({ x: x - shearX * y, y: shearY * x + scaleY * y }));
	const minX = Math.min(...corners.map(({ x }) => x));
	const maxX = Math.max(...corners.map(({ x }) => x));
	const minY = Math.min(...corners.map(({ y }) => y));
	const maxY = Math.max(...corners.map(({ y }) => y));
	const { createCanvas } = await import('@napi-rs/canvas');
	const output = createCanvas(
		Math.max(1, Math.round(maxX - minX)),
		Math.max(1, Math.round(maxY - minY)),
	);
	const context = output.getContext('2d');
	context.transform(1, shearY, -shearX, scaleY, -minX, -minY);
	context.drawImage(canvas, 0, 0);
	return output;
}
