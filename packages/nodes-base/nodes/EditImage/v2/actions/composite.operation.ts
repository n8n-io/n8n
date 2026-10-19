import type { Canvas } from '@napi-rs/canvas';
import type { IExecuteFunctions } from 'n8n-workflow';

import { getNumber, getString, loadCanvas, type OperationData } from '../helpers';

type CompositeMode = 'difference' | 'source-atop' | 'source-over';

const OPAQUE_ARITHMETIC_OPERATORS = new Set(['Plus', 'Add', 'Minus', 'Subtract']);
const CMYK_COPY_OPERATORS = new Set(['CopyBlack', 'CopyCyan', 'CopyMagenta', 'CopyYellow']);
const MAX_CHANNEL_VALUE = 255;
const CHANNEL_VALUE_COUNT = MAX_CHANNEL_VALUE + 1;

// GraphicsMagick calculates pixel intensity with Rec. 601 luma coefficients.
const LEGACY_LUMINANCE_WEIGHTS = {
	red: 0.299,
	green: 0.587,
	blue: 0.114,
};

function getCompositeMode(operator: string): CompositeMode | undefined {
	switch (operator) {
		case 'Atop':
			return 'source-atop';
		case 'Difference':
			return 'difference';
		case 'Over':
			return 'source-over';
		default:
			return undefined;
	}
}

function clampChannel(value: number): number {
	return Math.max(0, Math.min(MAX_CHANNEL_VALUE, Math.round(value)));
}

function wrapChannel(value: number): number {
	return (Math.round(value) + CHANNEL_VALUE_COUNT) % CHANNEL_VALUE_COUNT;
}

function legacyLuminance(red: number, green: number, blue: number): number {
	return (
		red * LEGACY_LUMINANCE_WEIGHTS.red +
		green * LEGACY_LUMINANCE_WEIGHTS.green +
		blue * LEGACY_LUMINANCE_WEIGHTS.blue
	);
}

function colorTypeHasAlpha(colorType: unknown): boolean {
	// image-rs assigns odd enum values to its alpha-bearing color types.
	return typeof colorType === 'number' && colorType % 2 === 1;
}

function applyArithmeticComposite(
	operator: string,
	source: number,
	target: number,
	luminance: number,
): number | undefined {
	switch (operator) {
		case 'Plus':
			return clampChannel(source + target);
		case 'Add':
			// Add wraps overflow across the 256 possible values of an 8-bit channel.
			return wrapChannel(source + target);
		case 'Minus':
			return clampChannel(target - source);
		case 'Subtract': {
			const difference = source - target;
			// GraphicsMagick wraps Subtract underflow at MaxRGB rather than at 256.
			return difference < 0 ? Math.round(difference + MAX_CHANNEL_VALUE) : Math.round(difference);
		}
		case 'Bumpmap':
			return Math.floor(target * luminance);
		case 'Divide':
			// GraphicsMagick divides the source by the target and normalizes to 8 bits.
			return target === 0
				? MAX_CHANNEL_VALUE
				: Math.min(MAX_CHANNEL_VALUE, Math.floor((source * MAX_CHANNEL_VALUE) / target));
		case 'Multiply':
			return Math.floor((source * target) / MAX_CHANNEL_VALUE);
		default:
			return undefined;
	}
}

function applyCustomComposite(
	canvas: Canvas,
	overlay: Canvas,
	positionX: number,
	positionY: number,
	operator: string,
	sourceHasAlpha: boolean,
): void {
	const context = canvas.getContext('2d');
	const overlayContext = overlay.getContext('2d');
	const targetData = context.getImageData(0, 0, canvas.width, canvas.height);
	const baseData = context.getImageData(0, 0, canvas.width, canvas.height);
	const overlayData = overlayContext.getImageData(0, 0, overlay.width, overlay.height);
	if (CMYK_COPY_OPERATORS.has(operator)) {
		// GraphicsMagick converts the full destination to CMYK before replacing one channel.
		for (let index = 0; index < baseData.data.length; index += 4) {
			baseData.data[index] = MAX_CHANNEL_VALUE - baseData.data[index];
			baseData.data[index + 1] = MAX_CHANNEL_VALUE - baseData.data[index + 1];
			baseData.data[index + 2] = MAX_CHANNEL_VALUE - baseData.data[index + 2];
		}
	}

	for (let overlayY = 0; overlayY < overlay.height; overlayY++) {
		const baseY = overlayY + Math.round(positionY);
		if (baseY < 0 || baseY >= canvas.height) continue;

		for (let overlayX = 0; overlayX < overlay.width; overlayX++) {
			const baseX = overlayX + Math.round(positionX);
			if (baseX < 0 || baseX >= canvas.width) continue;

			const sourceIndex = (overlayY * overlay.width + overlayX) * 4;
			const targetIndex = (baseY * canvas.width + baseX) * 4;
			const sourceRed = overlayData.data[sourceIndex];
			const sourceGreen = overlayData.data[sourceIndex + 1];
			const sourceBlue = overlayData.data[sourceIndex + 2];
			const sourceAlpha = overlayData.data[sourceIndex + 3];
			const targetRed = targetData.data[targetIndex];
			const targetGreen = targetData.data[targetIndex + 1];
			const targetBlue = targetData.data[targetIndex + 2];
			const targetAlpha = targetData.data[targetIndex + 3];

			if (operator === 'Copy') {
				baseData.data[targetIndex] = sourceRed;
				baseData.data[targetIndex + 1] = sourceGreen;
				baseData.data[targetIndex + 2] = sourceBlue;
				baseData.data[targetIndex + 3] = sourceAlpha;
			} else if (operator === 'In') {
				baseData.data[targetIndex] = sourceRed;
				baseData.data[targetIndex + 1] = sourceGreen;
				baseData.data[targetIndex + 2] = sourceBlue;
				baseData.data[targetIndex + 3] = Math.floor(
					(sourceAlpha * targetAlpha) / MAX_CHANNEL_VALUE,
				);
			} else if (operator === 'Out') {
				// Preserve GraphicsMagick's opaque RGB behavior. For partial alpha,
				// calculate the source coverage outside the target.
				if (targetAlpha < MAX_CHANNEL_VALUE && sourceAlpha > 0) {
					// Porter-Duff source-out keeps the source only where the target is transparent.
					baseData.data[targetIndex] = sourceRed;
					baseData.data[targetIndex + 1] = sourceGreen;
					baseData.data[targetIndex + 2] = sourceBlue;
					baseData.data[targetIndex + 3] = Math.floor(
						(sourceAlpha * (MAX_CHANNEL_VALUE - targetAlpha)) / MAX_CHANNEL_VALUE,
					);
				}
			} else if (operator === 'Xor') {
				if (sourceAlpha === MAX_CHANNEL_VALUE && targetAlpha === MAX_CHANNEL_VALUE) {
					// GraphicsMagick flattens fully opaque RGB inputs because they cannot
					// store the transparent result. Canvas does not retain the source color type.
					baseData.data[targetIndex] = 0;
					baseData.data[targetIndex + 1] = 0;
					baseData.data[targetIndex + 2] = 0;
					baseData.data[targetIndex + 3] = MAX_CHANNEL_VALUE;
				} else {
					// Porter-Duff XOR keeps the source outside the target and the target
					// outside the source. These weights are the two exclusive alpha regions.
					const sourceWeight = sourceAlpha * (MAX_CHANNEL_VALUE - targetAlpha);
					const targetWeight = targetAlpha * (MAX_CHANNEL_VALUE - sourceAlpha);
					const totalWeight = sourceWeight + targetWeight;
					for (let channel = 0; channel < 3; channel++) {
						baseData.data[targetIndex + channel] =
							totalWeight === 0
								? 0
								: Math.round(
										(overlayData.data[sourceIndex + channel] * sourceWeight +
											targetData.data[targetIndex + channel] * targetWeight) /
											totalWeight,
									);
					}
					baseData.data[targetIndex + 3] = Math.round(totalWeight / MAX_CHANNEL_VALUE);
				}
			} else if (operator === 'CopyRed') {
				baseData.data[targetIndex] = sourceRed;
			} else if (operator === 'CopyGreen') {
				baseData.data[targetIndex + 1] = sourceGreen;
			} else if (operator === 'CopyBlue') {
				baseData.data[targetIndex + 2] = sourceBlue;
			} else if (operator === 'CopyOpacity') {
				let opacity = sourceAlpha;
				if (!sourceHasAlpha) {
					// GraphicsMagick uses source intensity when no alpha channel exists.
					opacity = Math.floor(legacyLuminance(sourceRed, sourceGreen, sourceBlue));
				}
				baseData.data[targetIndex + 3] = opacity;
			} else if (operator === 'CopyCyan') {
				// GraphicsMagick exposes CMY copies as complemented RGB channels.
				baseData.data[targetIndex] = MAX_CHANNEL_VALUE - sourceRed;
				baseData.data[targetIndex + 1] = MAX_CHANNEL_VALUE - targetGreen;
				baseData.data[targetIndex + 2] = MAX_CHANNEL_VALUE - targetBlue;
			} else if (operator === 'CopyMagenta') {
				baseData.data[targetIndex] = MAX_CHANNEL_VALUE - targetRed;
				baseData.data[targetIndex + 1] = MAX_CHANNEL_VALUE - sourceGreen;
				baseData.data[targetIndex + 2] = MAX_CHANNEL_VALUE - targetBlue;
			} else if (operator === 'CopyYellow') {
				baseData.data[targetIndex] = MAX_CHANNEL_VALUE - targetRed;
				baseData.data[targetIndex + 1] = MAX_CHANNEL_VALUE - targetGreen;
				baseData.data[targetIndex + 2] = MAX_CHANNEL_VALUE - sourceBlue;
			} else if (operator === 'CopyBlack') {
				// Copy Black applies source darkness to the target's complemented RGB channels.
				const black = 1 - legacyLuminance(sourceRed, sourceGreen, sourceBlue) / MAX_CHANNEL_VALUE;
				baseData.data[targetIndex] = Math.floor((MAX_CHANNEL_VALUE - targetRed) * black);
				baseData.data[targetIndex + 1] = Math.floor((MAX_CHANNEL_VALUE - targetGreen) * black);
				baseData.data[targetIndex + 2] = Math.floor((MAX_CHANNEL_VALUE - targetBlue) * black);
			} else {
				const luminance = legacyLuminance(sourceRed, sourceGreen, sourceBlue) / MAX_CHANNEL_VALUE;
				for (let channel = 0; channel < 3; channel++) {
					const source = overlayData.data[sourceIndex + channel];
					const target = targetData.data[targetIndex + channel];
					const result = applyArithmeticComposite(operator, source, target, luminance);
					if (result !== undefined) baseData.data[targetIndex + channel] = result;
				}
				if (OPAQUE_ARITHMETIC_OPERATORS.has(operator)) {
					baseData.data[targetIndex + 3] = MAX_CHANNEL_VALUE;
				}
			}
		}
	}

	context.putImageData(baseData, 0, 0);
}

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	canvas: Canvas,
	operation: OperationData,
): Promise<Canvas> {
	const binaryPropertyName = getString(operation, 'dataPropertyNameComposite');
	executeFunctions.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const overlayBuffer = await executeFunctions.helpers.getBinaryDataBuffer(
		itemIndex,
		binaryPropertyName,
	);
	const overlay = await loadCanvas(overlayBuffer);
	let sourceHasAlpha = false;
	try {
		const { Transformer } = await import('@napi-rs/image');
		const metadata = await new Transformer(overlayBuffer).metadata();
		sourceHasAlpha = colorTypeHasAlpha(metadata.colorType);
	} catch {
		// Formats without metadata use GraphicsMagick's no-alpha behavior.
	}
	const positionX = getNumber(operation, 'positionX');
	const positionY = getNumber(operation, 'positionY');
	const operator = getString(operation, 'operator');
	const mode = getCompositeMode(operator);

	if (mode) {
		const context = canvas.getContext('2d');
		context.globalCompositeOperation = mode;
		context.drawImage(overlay, positionX, positionY);
		context.globalCompositeOperation = 'source-over';
	} else {
		applyCustomComposite(canvas, overlay, positionX, positionY, operator, sourceHasAlpha);
	}

	return canvas;
}
