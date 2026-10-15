import type { Canvas } from '@napi-rs/canvas';
import getSystemFonts from 'get-system-fonts';
import { UserError } from 'n8n-workflow';
import { parse as pathParse } from 'path';

import {
	type EditImageNodeOptions,
	getNumber,
	getString,
	type OperationData,
	toCanvasColor,
} from '../helpers';

const TEXT_LINE_HEIGHT_RATIO = 1.2;

let fontRegistrationSequence = 0;

function wrapText(text: string, lineLength: number): string[] {
	const lines: string[] = [];
	for (const textLine of text.split('\n')) {
		let currentLine = '';
		for (const textPart of textLine.split(' ')) {
			if (currentLine.length + textPart.length + 1 > lineLength) {
				lines.push(currentLine.trim());
				currentLine = `${textPart} `;
			} else {
				currentLine += `${textPart} `;
			}
		}
		lines.push(currentLine.trim());
	}
	return lines;
}

function getCanvasTextAlign(alignment: string): 'left' | 'center' | 'right' {
	if (alignment === 'center') return 'center';
	if (alignment === 'east') return 'right';
	return 'left';
}

function getTextX(alignment: string, canvasWidth: number, positionX: number): number {
	if (alignment === 'center') return canvasWidth / 2 + positionX;
	if (alignment === 'east') return canvasWidth - positionX;
	return positionX;
}

function getTextBaselineY({
	alignment,
	canvasHeight,
	positionY,
	textHeight,
	ascent,
	lineCount,
	lineHeight,
}: {
	alignment: string;
	canvasHeight: number;
	positionY: number;
	textHeight: number;
	ascent: number;
	lineCount: number;
	lineHeight: number;
}): number {
	if (alignment === 'middle') {
		return canvasHeight / 2 + positionY - textHeight / 2 + ascent;
	}
	if (alignment === 'south') {
		return canvasHeight - positionY - Math.max(0, lineCount - 1) * lineHeight;
	}
	return positionY;
}

export async function execute(
	canvas: Canvas,
	operation: OperationData,
	options: EditImageNodeOptions,
): Promise<Canvas> {
	const fonts = await getSystemFonts();
	let font = options.font;
	if (!font && typeof operation.font === 'string') font = operation.font;
	if (!font) font = fonts.find((systemFont) => systemFont.includes('Arial.'));
	if (!font) throw new UserError('Default font not found. Select a font from the options.');
	if (!fonts.includes(font)) {
		throw new UserError('The selected font is not available. Select a font from the options.');
	}

	const { GlobalFonts } = await import('@napi-rs/canvas');
	const family = `n8n-edit-image-${fontRegistrationSequence++}-${pathParse(font).name}`;
	const fontKey = GlobalFonts.registerFromPath(font, family);
	if (!fontKey) throw new UserError('The selected font could not be loaded.');

	try {
		const context = canvas.getContext('2d');
		const fontSize = getNumber(operation, 'fontSize');
		const positionX = getNumber(operation, 'positionX');
		const positionY = getNumber(operation, 'positionY');
		const horizontalAlignment =
			typeof operation.horizontalAlignment === 'string' ? operation.horizontalAlignment : 'west';
		const verticalAlignment =
			typeof operation.verticalAlignment === 'string' ? operation.verticalAlignment : 'north';
		const lines = wrapText(getString(operation, 'text'), getNumber(operation, 'lineLength'));
		// GraphicsMagick uses approximately 1.2 em between text baselines.
		const lineHeight = fontSize * TEXT_LINE_HEIGHT_RATIO;

		context.font = `${fontSize}px "${family}"`;
		context.fillStyle = toCanvasColor(getString(operation, 'fontColor'));
		context.textAlign = getCanvasTextAlign(horizontalAlignment);
		context.textBaseline = 'alphabetic';

		const x = getTextX(horizontalAlignment, canvas.width, positionX);
		const metrics = lines.map((line) => context.measureText(line));
		const measuredAscent = Math.max(
			...metrics.map((lineMetrics) => lineMetrics.actualBoundingBoxAscent),
		);
		const ascent = measuredAscent || fontSize;
		const descent = Math.max(
			0,
			...metrics.map((lineMetrics) => lineMetrics.actualBoundingBoxDescent),
		);
		const textHeight = ascent + descent + Math.max(0, lines.length - 1) * lineHeight;
		const y = getTextBaselineY({
			alignment: verticalAlignment,
			canvasHeight: canvas.height,
			positionY,
			textHeight,
			ascent,
			lineCount: lines.length,
			lineHeight,
		});

		lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
	} finally {
		GlobalFonts.remove(fontKey);
	}

	return canvas;
}
