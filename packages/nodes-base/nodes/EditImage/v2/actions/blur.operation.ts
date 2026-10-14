import type { Canvas } from '@napi-rs/canvas';

import { getNumber, type OperationData } from '../helpers';

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const { createCanvas } = await import('@napi-rs/canvas');
	const output = createCanvas(canvas.width, canvas.height);
	const context = output.getContext('2d');
	context.filter = `blur(${getNumber(operation, 'blurRadius')}px)`;
	context.drawImage(canvas, 0, 0);
	return output;
}
