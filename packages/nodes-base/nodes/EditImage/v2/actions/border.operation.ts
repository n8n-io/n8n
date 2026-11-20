import type { Canvas } from '@napi-rs/canvas';

import { createCanvas, getNumber, getString, type OperationData, toCanvasColor } from '../helpers';

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const width = Math.max(0, Math.round(getNumber(operation, 'borderWidth')));
	const height = Math.max(0, Math.round(getNumber(operation, 'borderHeight')));
	const output = await createCanvas(
		canvas.width + width * 2,
		canvas.height + height * 2,
		'#000000ff',
	);
	const context = output.getContext('2d');
	context.fillStyle = toCanvasColor(getString(operation, 'borderColor'));
	context.fillRect(0, 0, output.width, height);
	context.fillRect(0, output.height - height, output.width, height);
	context.fillRect(0, height, width, canvas.height);
	context.fillRect(output.width - width, height, width, canvas.height);
	context.drawImage(canvas, width, height);
	return output;
}
