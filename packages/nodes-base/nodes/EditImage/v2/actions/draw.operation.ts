import type { Canvas } from '@napi-rs/canvas';

import { getNumber, getString, type OperationData, toCanvasColor } from '../helpers';

export function execute(canvas: Canvas, operation: OperationData): Canvas {
	const context = canvas.getContext('2d');
	const startX = getNumber(operation, 'startPositionX');
	const startY = getNumber(operation, 'startPositionY');
	const endX = getNumber(operation, 'endPositionX');
	const endY = getNumber(operation, 'endPositionY');
	const primitive = getString(operation, 'primitive');
	const color = getString(operation, 'color');

	context.beginPath();
	context.fillStyle = toCanvasColor(color);
	context.strokeStyle = toCanvasColor(color);

	if (primitive === 'line') {
		context.moveTo(startX, startY);
		context.lineTo(endX, endY);
		context.stroke();
	} else if (primitive === 'circle') {
		context.arc(startX, startY, Math.hypot(endX - startX, endY - startY), 0, Math.PI * 2);
		context.fill();
	} else if (primitive === 'rectangle') {
		const x = Math.min(startX, endX);
		const y = Math.min(startY, endY);
		const width = Math.abs(endX - startX);
		const height = Math.abs(endY - startY);
		const cornerRadius = Math.max(0, getNumber(operation, 'cornerRadius'));
		context.roundRect(x, y, width, height, cornerRadius);
		context.fill();
	}

	return canvas;
}
