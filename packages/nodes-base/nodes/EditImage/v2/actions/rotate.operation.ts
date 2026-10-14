import type { Canvas } from '@napi-rs/canvas';

import { createCanvas, getNumber, getString, type OperationData } from '../helpers';

const DEGREES_TO_RADIANS = Math.PI / 180;

export async function execute(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const angle = getNumber(operation, 'rotate');
	const radians = angle * DEGREES_TO_RADIANS;
	const cosine = Math.abs(Math.cos(radians));
	const sine = Math.abs(Math.sin(radians));
	const width = Math.max(1, Math.ceil(canvas.width * cosine + canvas.height * sine));
	const height = Math.max(1, Math.ceil(canvas.width * sine + canvas.height * cosine));
	const output = await createCanvas(width, height, getString(operation, 'backgroundColor'));
	const context = output.getContext('2d');
	context.translate(width / 2, height / 2);
	context.rotate(radians);
	context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
	return output;
}
