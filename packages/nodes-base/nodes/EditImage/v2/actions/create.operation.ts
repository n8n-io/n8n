import type { Canvas } from '@napi-rs/canvas';

import { createCanvas, getNumber, getString, type OperationData } from '../helpers';

export async function execute(operation: OperationData): Promise<Canvas> {
	return await createCanvas(
		getNumber(operation, 'width'),
		getNumber(operation, 'height'),
		getString(operation, 'backgroundColor'),
	);
}
