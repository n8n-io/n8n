import { isRecord } from '@n8n/utils/is-record';
import type { Canvas } from '@napi-rs/canvas';
import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import { isSafeObjectProperty, NodeOperationError, UserError } from 'n8n-workflow';

export type EditImageNodeOptions = {
	destinationKey?: string;
	font?: string;
	fileName?: string;
	format?: OutputFormat;
	quality?: number;
};

export type OperationData = Record<string, unknown>;

export type OutputFormat = 'bmp' | 'gif' | 'jpeg' | 'png' | 'tiff' | 'tif' | 'webp';

const VALID_IMAGE_FORMATS = new Set<string>(['bmp', 'gif', 'jpeg', 'png', 'tiff', 'tif', 'webp']);
const MAX_CHANNEL_VALUE = 255;

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

export function toCanvasColor(color: string): string {
	const match = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(color);
	if (!match) return color;

	// GraphicsMagick stores opacity, while Canvas stores alpha. The values are inverse.
	const alpha = (MAX_CHANNEL_VALUE - Number.parseInt(match[2], 16)).toString(16).padStart(2, '0');
	return `#${match[1]}${alpha}`;
}

export function toCanvasMatteColor(color: string): string {
	const match = /^#([0-9a-f]{6})[0-9a-f]{2}$/i.exec(color);
	return match ? `#${match[1]}` : color;
}

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

export function getNumber(data: OperationData, name: string): number {
	const value = data[name];
	if (typeof value !== 'number') {
		throw new UserError(`The value of "${name}" must be a number`);
	}
	return value;
}

export function getString(data: OperationData, name: string): string {
	const value = data[name];
	if (typeof value !== 'string') {
		throw new UserError(`The value of "${name}" must be a string`);
	}
	return value;
}

export function parseOptions(value: unknown, node: INode): EditImageNodeOptions {
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

export function getDataPropertyName(value: unknown, node: INode): string | IBinaryData {
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

export function collectOperations(
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

export async function loadCanvas(buffer: Buffer): Promise<Canvas> {
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

export async function createCanvas(width: number, height: number, color: string): Promise<Canvas> {
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const canvas = createNapiCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
	const context = canvas.getContext('2d');
	context.fillStyle = toCanvasColor(color);
	context.fillRect(0, 0, canvas.width, canvas.height);
	return canvas;
}

export async function copyCanvas(
	source: Canvas,
	width = source.width,
	height = source.height,
): Promise<Canvas> {
	const { createCanvas: createNapiCanvas } = await import('@napi-rs/canvas');
	const canvas = createNapiCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
	canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export function getMimeType(format: OutputFormat): string {
	return format === 'tif' ? 'image/tiff' : `image/${format}`;
}

export function detectImageFormat(buffer: Buffer): OutputFormat | undefined {
	if (buffer.subarray(0, 2).toString('ascii') === 'BM') return 'bmp';
	if (buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpeg';
	if (buffer.subarray(0, 4).toString('hex') === '89504e47') return 'png';

	const firstFourBytes = buffer.subarray(0, 4).toString('ascii');
	if (firstFourBytes === 'GIF8') return 'gif';
	if (firstFourBytes === 'II*\u0000' || firstFourBytes === 'MM\u0000*') return 'tiff';
	if (firstFourBytes === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
		return 'webp';
	}

	return undefined;
}

export async function encodeCanvas(
	canvas: Canvas,
	format: OutputFormat,
	quality: number | undefined,
	jpegBackground: string | undefined,
): Promise<Buffer> {
	if (format === 'bmp' || format === 'png' || format === 'tiff' || format === 'tif') {
		const { Transformer } = await import('@napi-rs/image');
		const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
		const transformer = Transformer.fromRgbaPixels(pixels, canvas.width, canvas.height);
		if (format === 'bmp') return await transformer.bmp();
		if (format === 'png') return await transformer.png();
		return await transformer.tiff();
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

export function replaceFileExtension(
	fileName: string | undefined,
	format: OutputFormat,
): string | undefined {
	if (!fileName?.includes('.')) return fileName;
	return `${fileName.split('.').slice(0, -1).join('.')}.${format}`;
}

export function getOutputPropertyName(
	options: EditImageNodeOptions,
	dataPropertyName: string | IBinaryData,
): string {
	if (options.destinationKey !== undefined) return options.destinationKey;
	if (typeof dataPropertyName === 'string') return dataPropertyName;
	return 'data';
}

export function assertSafeOutputPropertyName(name: string, node: INode): void {
	if (!isSafeObjectProperty(name)) {
		throw new NodeOperationError(node, 'Destination Output Field contains an unsafe name');
	}
}
