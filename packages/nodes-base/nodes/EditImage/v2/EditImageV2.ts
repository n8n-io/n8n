import { isRecord } from '@n8n/utils/is-record';
import getSystemFonts from 'get-system-fonts';
import type { Canvas } from '@napi-rs/canvas';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import {
	deepCopy,
	isSafeObjectProperty,
	NodeOperationError,
	setSafeObjectProperty,
} from 'n8n-workflow';
import { parse as pathParse } from 'path';

type EditImageNodeOptions = {
	destinationKey?: string;
	font?: string;
	fileName?: string;
	format?: OutputFormat;
	quality?: number;
};

type OperationData = Record<string, unknown>;

type OutputFormat = 'bmp' | 'gif' | 'jpeg' | 'png' | 'tiff' | 'tif' | 'webp';

type CompositeMode =
	| 'copy'
	| 'difference'
	| 'lighter'
	| 'multiply'
	| 'source-atop'
	| 'source-in'
	| 'source-out'
	| 'source-over'
	| 'xor';

const VALID_IMAGE_FORMATS = new Set<string>(['bmp', 'gif', 'jpeg', 'png', 'tiff', 'tif', 'webp']);

export function toCanvasColor(color: string): string {
	const match = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(color);
	if (!match) return color;

	const alpha = (255 - Number.parseInt(match[2], 16)).toString(16).padStart(2, '0');
	return `#${match[1]}${alpha}`;
}

function toCanvasMatteColor(color: string): string {
	const match = /^#([0-9a-f]{6})[0-9a-f]{2}$/i.exec(color);
	return match ? `#${match[1]}` : color;
}

const requiredOperationParameters: Record<string, string[]> = {
	blur: ['blurRadius'],
	border: ['borderColor', 'borderWidth', 'borderHeight'],
	composite: ['dataPropertyNameComposite', 'operator', 'positionX', 'positionY'],
	create: ['backgroundColor', 'height', 'width'],
	crop: ['height', 'positionX', 'positionY', 'width'],
	draw: [
		'color',
		'cornerRadius',
		'endPositionX',
		'endPositionY',
		'primitive',
		'startPositionX',
		'startPositionY',
	],
	information: [],
	resize: ['height', 'resizeOption', 'width'],
	rotate: ['backgroundColor', 'rotate'],
	shear: ['degreesX', 'degreesY'],
	text: [
		'horizontalAlignment',
		'verticalAlignment',
		'font',
		'fontColor',
		'fontSize',
		'lineLength',
		'positionX',
		'positionY',
		'text',
	],
	transparent: ['color'],
};

const numericOperationParameters: Record<string, string[]> = {
	blur: ['blurRadius'],
	border: ['borderWidth', 'borderHeight'],
	composite: ['positionX', 'positionY'],
	create: ['width', 'height'],
	crop: ['width', 'height', 'positionX', 'positionY'],
	draw: ['startPositionX', 'startPositionY', 'endPositionX', 'endPositionY', 'cornerRadius'],
	resize: ['width', 'height'],
	rotate: ['rotate'],
	shear: ['degreesX', 'degreesY'],
	text: ['fontSize', 'positionX', 'positionY', 'lineLength'],
};

let fontRegistrationSequence = 0;

function parseNumericParameter(value: unknown, parameterName: string, node: INode): number {
	if (
		(typeof value !== 'number' && typeof value !== 'string') ||
		(typeof value === 'string' && value.trim() === '')
	) {
		throw new NodeOperationError(node, `The value of "${parameterName}" must be a number`);
	}

	const parsedValue = Number(value);
	if (!Number.isFinite(parsedValue)) {
		throw new NodeOperationError(node, `The value of "${parameterName}" must be a number`);
	}

	return parsedValue;
}

function getNumber(data: OperationData, name: string): number {
	const value = data[name];
	if (typeof value !== 'number') {
		throw new Error(`The value of "${name}" must be a number`);
	}
	return value;
}

function getString(data: OperationData, name: string): string {
	const value = data[name];
	if (typeof value !== 'string') {
		throw new Error(`The value of "${name}" must be a string`);
	}
	return value;
}

function parseOptions(value: unknown, node: INode): EditImageNodeOptions {
	if (!isRecord(value)) return {};

	const options: EditImageNodeOptions = {};
	if (typeof value.destinationKey === 'string') options.destinationKey = value.destinationKey;
	if (typeof value.font === 'string') options.font = value.font;
	if (typeof value.fileName === 'string') options.fileName = value.fileName;
	if (value.format !== undefined) options.format = validateImageFormat(value.format, node);
	if (value.quality !== undefined) {
		options.quality = parseNumericParameter(value.quality, 'quality', node);
	}
	return options;
}

function validateImageFormat(format: unknown, node: INode): OutputFormat {
	if (
		format === 'bmp' ||
		format === 'gif' ||
		format === 'jpeg' ||
		format === 'png' ||
		format === 'tiff' ||
		format === 'tif' ||
		format === 'webp'
	) {
		return format;
	}

	throw new NodeOperationError(
		node,
		`Invalid image format: ${String(format)}. Valid formats are: ${Array.from(VALID_IMAGE_FORMATS).join(', ')}`,
	);
}

function isBinaryData(value: unknown): value is IBinaryData {
	return isRecord(value) && typeof value.data === 'string' && typeof value.mimeType === 'string';
}

function getDataPropertyName(value: unknown, node: INode): string | IBinaryData {
	if (typeof value === 'string' || isBinaryData(value)) return value;
	throw new NodeOperationError(node, 'Property Name must identify binary data');
}

function normalizeOperations(operations: OperationData[], node: INode): OperationData[] {
	return operations.map((operationData) => {
		const operationName = operationData.operation;
		if (typeof operationName !== 'string') return operationData;

		const normalized = { ...operationData };
		for (const parameterName of numericOperationParameters[operationName] ?? []) {
			if (parameterName === 'cornerRadius' && operationData.primitive !== 'rectangle') continue;
			normalized[parameterName] = parseNumericParameter(
				operationData[parameterName],
				parameterName,
				node,
			);
		}
		return normalized;
	});
}

function collectOperations(
	executeFunctions: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	node: INode,
): OperationData[] {
	if (operation === 'multiStep') {
		const value = executeFunctions.getNodeParameter('operations', itemIndex, {
			operations: [],
		});
		if (!isRecord(value) || !('operations' in value) || !Array.isArray(value.operations)) return [];
		return normalizeOperations(value.operations.filter(isRecord), node);
	}

	const operationData: OperationData = { operation };
	for (const parameterName of requiredOperationParameters[operation] ?? []) {
		try {
			operationData[parameterName] = executeFunctions.getNodeParameter(parameterName, itemIndex);
		} catch {
			// Some parameters are hidden for older node versions.
		}
	}
	return normalizeOperations([operationData], node);
}

async function loadCanvas(buffer: Buffer): Promise<Canvas> {
	const [{ createCanvas, loadImage }, { Transformer }] = await Promise.all([
		import('@napi-rs/canvas'),
		import('@napi-rs/image'),
	]);

	let input: Buffer = buffer;
	try {
		input = await new Transformer(buffer).rotate().png();
	} catch {
		// Canvas supports formats such as GIF that @napi-rs/image does not decode.
	}

	const image = await loadImage(input);
	const canvas = createCanvas(image.width, image.height);
	canvas.getContext('2d').drawImage(image, 0, 0);
	return canvas;
}

async function createCanvas(width: number, height: number, color: string): Promise<Canvas> {
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const canvas = createNapiCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
	const context = canvas.getContext('2d');
	context.fillStyle = toCanvasColor(color);
	context.fillRect(0, 0, canvas.width, canvas.height);
	return canvas;
}

async function copyCanvas(
	source: Canvas,
	width = source.width,
	height = source.height,
): Promise<Canvas> {
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const canvas = createNapiCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
	canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas;
}

async function applyBlur(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const output = createNapiCanvas(canvas.width, canvas.height);
	const context = output.getContext('2d');
	context.filter = `blur(${getNumber(operation, 'blurRadius')}px)`;
	context.drawImage(canvas, 0, 0);
	return output;
}

async function applyBorder(canvas: Canvas, operation: OperationData): Promise<Canvas> {
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

function getCompositeMode(operator: string): CompositeMode | undefined {
	switch (operator) {
		case 'Atop':
			return 'source-atop';
		case 'Copy':
			return 'copy';
		case 'Difference':
			return 'difference';
		case 'In':
			return 'source-in';
		case 'Multiply':
			return 'multiply';
		case 'Out':
			return 'source-out';
		case 'Over':
			return 'source-over';
		case 'Xor':
			return 'xor';
		default:
			return undefined;
	}
}

function clampChannel(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function wrapChannel(value: number): number {
	return ((Math.round(value) % 256) + 256) % 256;
}

function applyCustomComposite(
	canvas: Canvas,
	overlay: Canvas,
	positionX: number,
	positionY: number,
	operator: string,
): void {
	const context = canvas.getContext('2d');
	const overlayContext = overlay.getContext('2d');
	const baseData = context.getImageData(0, 0, canvas.width, canvas.height);
	const overlayData = overlayContext.getImageData(0, 0, overlay.width, overlay.height);

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

			if (operator === 'CopyRed') {
				baseData.data[targetIndex] = sourceRed;
			} else if (operator === 'CopyGreen') {
				baseData.data[targetIndex + 1] = sourceGreen;
			} else if (operator === 'CopyBlue') {
				baseData.data[targetIndex + 2] = sourceBlue;
			} else if (operator === 'CopyOpacity') {
				baseData.data[targetIndex + 3] = sourceAlpha;
			} else if (operator === 'CopyCyan') {
				baseData.data[targetIndex] = 255 - sourceRed;
			} else if (operator === 'CopyMagenta') {
				baseData.data[targetIndex + 1] = 255 - sourceGreen;
			} else if (operator === 'CopyYellow') {
				baseData.data[targetIndex + 2] = 255 - sourceBlue;
			} else if (operator === 'CopyBlack') {
				const black = 255 - Math.max(sourceRed, sourceGreen, sourceBlue);
				baseData.data[targetIndex] = black;
				baseData.data[targetIndex + 1] = black;
				baseData.data[targetIndex + 2] = black;
			} else {
				const luminance = (sourceRed * 0.2126 + sourceGreen * 0.7152 + sourceBlue * 0.0722) / 255;
				for (let channel = 0; channel < 3; channel++) {
					const source = overlayData.data[sourceIndex + channel];
					const target = baseData.data[targetIndex + channel];
					if (operator === 'Plus') {
						baseData.data[targetIndex + channel] = clampChannel(source + target);
					} else if (operator === 'Add') {
						baseData.data[targetIndex + channel] = wrapChannel(source + target);
					} else if (operator === 'Minus') {
						baseData.data[targetIndex + channel] = clampChannel(source - target);
					} else if (operator === 'Subtract') {
						baseData.data[targetIndex + channel] = wrapChannel(source - target);
					} else if (operator === 'Bumpmap') {
						baseData.data[targetIndex + channel] = clampChannel(target * luminance);
					} else if (operator === 'Divide') {
						baseData.data[targetIndex + channel] =
							target === 0 ? 255 : clampChannel((source * 255) / target);
					}
				}
				if (
					operator === 'Plus' ||
					operator === 'Add' ||
					operator === 'Minus' ||
					operator === 'Subtract'
				) {
					baseData.data[targetIndex + 3] = 255;
				}
			}
		}
	}

	context.putImageData(baseData, 0, 0);
}

async function applyComposite(
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
		applyCustomComposite(canvas, overlay, positionX, positionY, operator);
	}

	return canvas;
}

async function applyCrop(canvas: Canvas, operation: OperationData): Promise<Canvas> {
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

	if (width <= 0 || height <= 0) throw new Error('The crop area is outside the image');

	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const output = createNapiCanvas(width, height);
	output.getContext('2d').drawImage(canvas, sourceX, sourceY, width, height, 0, 0, width, height);
	return output;
}

function applyDraw(canvas: Canvas, operation: OperationData): Canvas {
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

export function calculateResizeDimensions(
	currentWidth: number,
	currentHeight: number,
	width: number,
	height: number,
	resizeOption: string,
): { width: number; height: number } {
	if (resizeOption === 'ignoreAspectRatio') {
		return { width: Math.round(width), height: Math.round(height) };
	}
	if (resizeOption === 'percent') {
		return {
			width: Math.round((currentWidth * width) / 100),
			height: Math.round((currentHeight * height) / 100),
		};
	}
	if (resizeOption === 'maximumArea') {
		const scale = Math.sqrt((width * height) / (currentWidth * currentHeight));
		return {
			width: Math.floor(currentWidth * scale),
			height: Math.floor(currentHeight * scale),
		};
	}

	const scale =
		resizeOption === 'minimumArea'
			? Math.max(width / currentWidth, height / currentHeight)
			: Math.min(width / currentWidth, height / currentHeight);

	if (resizeOption === 'onlyIfLarger' && scale >= 1) {
		return { width: currentWidth, height: currentHeight };
	}
	if (resizeOption === 'onlyIfSmaller' && scale <= 1) {
		return { width: currentWidth, height: currentHeight };
	}

	return {
		width: Math.round(currentWidth * scale),
		height: Math.round(currentHeight * scale),
	};
}

async function applyResize(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const dimensions = calculateResizeDimensions(
		canvas.width,
		canvas.height,
		getNumber(operation, 'width'),
		getNumber(operation, 'height'),
		getString(operation, 'resizeOption'),
	);
	if (dimensions.width === canvas.width && dimensions.height === canvas.height) return canvas;
	return await copyCanvas(canvas, dimensions.width, dimensions.height);
}

async function applyRotate(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const angle = getNumber(operation, 'rotate');
	const radians = (angle * Math.PI) / 180;
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

async function applyShear(canvas: Canvas, operation: OperationData): Promise<Canvas> {
	const shearX = Math.tan((getNumber(operation, 'degreesX') * Math.PI) / 360);
	const shearY = Math.sin((getNumber(operation, 'degreesY') * Math.PI) / 180);
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
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const output = createNapiCanvas(
		Math.max(1, Math.round(maxX - minX)),
		Math.max(1, Math.round(maxY - minY)),
	);
	const context = output.getContext('2d');
	context.transform(1, shearY, -shearX, scaleY, -minX, -minY);
	context.drawImage(canvas, 0, 0);
	return output;
}

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

async function applyText(
	canvas: Canvas,
	operation: OperationData,
	options: EditImageNodeOptions,
): Promise<Canvas> {
	const fonts = await getSystemFonts();
	let font = options.font;
	if (!font && typeof operation.font === 'string') font = operation.font;
	if (!font) font = fonts.find((systemFont) => systemFont.includes('Arial.'));
	if (!font) throw new Error('Default font not found. Select a font from the options.');
	if (!fonts.includes(font)) {
		throw new Error('The selected font is not available. Select a font from the options.');
	}

	const { GlobalFonts } = await import('@napi-rs/canvas');
	const family = `n8n-edit-image-${fontRegistrationSequence++}-${pathParse(font).name}`;
	const fontKey = GlobalFonts.registerFromPath(font, family);
	if (!fontKey) throw new Error('The selected font could not be loaded.');

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
		const lineHeight = fontSize * 1.2;

		context.font = `${fontSize}px "${family}"`;
		context.fillStyle = toCanvasColor(getString(operation, 'fontColor'));
		context.textAlign =
			horizontalAlignment === 'center'
				? 'center'
				: horizontalAlignment === 'east'
					? 'right'
					: 'left';
		context.textBaseline = 'alphabetic';

		const x =
			horizontalAlignment === 'center'
				? canvas.width / 2 + positionX
				: horizontalAlignment === 'east'
					? canvas.width - positionX
					: positionX;
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
		const y =
			verticalAlignment === 'middle'
				? canvas.height / 2 + positionY - textHeight / 2 + ascent
				: verticalAlignment === 'south'
					? canvas.height - positionY - Math.max(0, lines.length - 1) * lineHeight
					: positionY;

		lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
	} finally {
		GlobalFonts.remove(fontKey);
	}

	return canvas;
}

async function parseColor(color: string): Promise<[number, number, number]> {
	const canvas = await createCanvas(1, 1, color);
	const data = canvas.getContext('2d').getImageData(0, 0, 1, 1).data;
	return [data[0], data[1], data[2]];
}

async function applyTransparent(canvas: Canvas, operation: OperationData): Promise<Canvas> {
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

async function applyOperation(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	canvas: Canvas,
	operation: OperationData,
	options: EditImageNodeOptions,
): Promise<Canvas> {
	switch (operation.operation) {
		case 'blur':
			return await applyBlur(canvas, operation);
		case 'border':
			return await applyBorder(canvas, operation);
		case 'composite':
			return await applyComposite(executeFunctions, itemIndex, canvas, operation);
		case 'create':
			return await createCanvas(
				getNumber(operation, 'width'),
				getNumber(operation, 'height'),
				getString(operation, 'backgroundColor'),
			);
		case 'crop':
			return await applyCrop(canvas, operation);
		case 'draw':
			return applyDraw(canvas, operation);
		case 'resize':
			return await applyResize(canvas, operation);
		case 'rotate':
			return await applyRotate(canvas, operation);
		case 'shear':
			return await applyShear(canvas, operation);
		case 'text':
			return await applyText(canvas, operation, options);
		case 'transparent':
			return await applyTransparent(canvas, operation);
		default:
			return canvas;
	}
}

async function getInformation(buffer: Buffer, canvas: Canvas): Promise<IDataObject> {
	const { Transformer } = await import('@napi-rs/image');
	try {
		const metadata = await new Transformer(buffer).metadata();
		return {
			width: metadata.width,
			height: metadata.height,
			format: metadata.format,
			colorType: metadata.colorType,
			...(metadata.orientation === undefined ? {} : { orientation: metadata.orientation }),
		};
	} catch {
		return {
			width: canvas.width,
			height: canvas.height,
			format: 'unknown',
		};
	}
}

function getMimeType(format: OutputFormat): string {
	return format === 'tif' ? 'image/tiff' : `image/${format}`;
}

async function encodeCanvas(
	canvas: Canvas,
	format: OutputFormat,
	quality: number | undefined,
	jpegBackground: string | undefined,
): Promise<Buffer> {
	if (format === 'bmp' || format === 'tiff' || format === 'tif') {
		const { Transformer } = await import('@napi-rs/image');
		const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
		const transformer = Transformer.fromRgbaPixels(pixels, canvas.width, canvas.height);
		return format === 'bmp' ? await transformer.bmp() : await transformer.tiff();
	}
	if (format === 'jpeg') {
		if (!jpegBackground) return await canvas.encode(format, quality);

		// GraphicsMagick keeps RGB values under transparent pixels. Canvas replaces
		// them with black, so flatten onto the legacy RGB color before JPEG encoding.
		const output = await createCanvas(canvas.width, canvas.height, jpegBackground);
		output.getContext('2d').drawImage(canvas, 0, 0);
		return await output.encode(format, quality);
	}
	if (format === 'webp') return await canvas.encode(format, quality);
	if (format === 'gif') return await canvas.encode('gif');
	return await canvas.encode('png');
}

function replaceFileExtension(
	fileName: string | undefined,
	format: OutputFormat,
): string | undefined {
	if (!fileName?.includes('.')) return fileName;
	return `${fileName.split('.').slice(0, -1).join('.')}.${format}`;
}

export async function executeV2(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			const node = this.getNode();
			const operationValue = this.getNodeParameter('operation', itemIndex);
			if (typeof operationValue !== 'string') {
				throw new NodeOperationError(node, 'Operation must be a string');
			}
			const dataPropertyName = getDataPropertyName(
				this.getNodeParameter('dataPropertyName', itemIndex),
				node,
			);
			const options = parseOptions(this.getNodeParameter('options', itemIndex, {}), node);
			const operations = collectOperations(this, operationValue, itemIndex, node);
			if (operations.length === 0) {
				throw new NodeOperationError(node, 'Add at least one image operation');
			}

			let inputBuffer: Buffer | undefined;
			let canvas: Canvas;
			let jpegBackground: string | undefined;
			if (operations[0].operation === 'create') {
				const backgroundColor = getString(operations[0], 'backgroundColor');
				canvas = await createCanvas(
					getNumber(operations[0], 'width'),
					getNumber(operations[0], 'height'),
					backgroundColor,
				);
				jpegBackground = toCanvasMatteColor(backgroundColor);
			} else {
				this.helpers.assertBinaryData(itemIndex, dataPropertyName);
				inputBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, dataPropertyName);
				canvas = await loadCanvas(inputBuffer);
			}

			const newItem: INodeExecutionData = {
				json: item.json,
				binary: item.binary ? deepCopy(item.binary) : {},
				pairedItem: { item: itemIndex },
			};

			if (operationValue === 'information' && inputBuffer) {
				newItem.json = await getInformation(inputBuffer, canvas);
			}

			for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
				const currentOperation = operations[operationIndex];
				if (
					currentOperation.operation === 'information' ||
					(operationIndex === 0 && currentOperation.operation === 'create')
				) {
					continue;
				}
				canvas = await applyOperation(this, itemIndex, canvas, currentOperation, options);
				if (currentOperation.operation === 'create' || currentOperation.operation === 'rotate') {
					jpegBackground = toCanvasMatteColor(getString(currentOperation, 'backgroundColor'));
				}
			}

			const format = options.format ?? 'png';
			const outputBuffer = await encodeCanvas(canvas, format, options.quality, jpegBackground);
			const binaryPropertyName =
				options.destinationKey ??
				(typeof dataPropertyName === 'string' ? dataPropertyName : 'data');
			if (!isSafeObjectProperty(binaryPropertyName)) {
				throw new NodeOperationError(node, 'Destination Output Field contains an unsafe name');
			}
			const existingBinaryData = newItem.binary?.[binaryPropertyName];
			const preparedBinaryData = await this.helpers.prepareBinaryData(outputBuffer);
			const fileName =
				options.fileName ?? replaceFileExtension(existingBinaryData?.fileName, format);

			if (!newItem.binary) newItem.binary = {};
			setSafeObjectProperty(newItem.binary, binaryPropertyName, {
				...existingBinaryData,
				...preparedBinaryData,
				fileExtension: format,
				mimeType: getMimeType(format),
				...(fileName ? { fileName } : {}),
			});
			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error instanceof Error ? error.message : String(error) },
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
