import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import getSystemFonts from 'get-system-fonts';
import { mockDeep } from 'vitest-mock-extended';

import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

import { EditImage } from '../EditImage.node';
import { calculateResizeDimensions } from '../v2/actions/resize.operation';
import { toCanvasColor } from '../v2/helpers';

function isQualityOption(
	option: INodeProperties | INodePropertyCollection | INodePropertyOptions,
): option is INodeProperties | INodePropertyOptions {
	return option.name === 'quality' && 'displayOptions' in option;
}

const node: INode = {
	id: 'edit-image-v2',
	name: 'Edit Image',
	type: 'n8n-nodes-base.editImage',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

async function imageBuffer(color = '#ff0000', width = 20, height = 10): Promise<Buffer> {
	const canvas = createCanvas(width, height);
	const context = canvas.getContext('2d');
	context.fillStyle = color;
	context.fillRect(0, 0, width, height);
	return await canvas.encode('png');
}

async function jpegImageBuffer(color: string): Promise<Buffer> {
	const canvas = createCanvas(1, 1);
	const context = canvas.getContext('2d');
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return await canvas.encode('jpeg', 100);
}

async function imageBufferWithTransparentCorners(): Promise<Buffer> {
	const canvas = createCanvas(10, 10);
	const context = canvas.getContext('2d');
	context.fillStyle = '#ff0000';
	context.fillRect(2, 2, 6, 6);
	return await canvas.encode('png');
}

async function rgbaImageBuffer(
	red: number,
	green: number,
	blue: number,
	alpha: number,
): Promise<Buffer> {
	const canvas = createCanvas(1, 1);
	const context = canvas.getContext('2d');
	const imageData = context.createImageData(1, 1);
	imageData.data.set([red, green, blue, alpha]);
	context.putImageData(imageData, 0, 0);
	return await canvas.encode('png');
}

async function twoColorImageBuffer(): Promise<Buffer> {
	const canvas = createCanvas(2, 1);
	const context = canvas.getContext('2d');
	context.fillStyle = '#ff0000';
	context.fillRect(0, 0, 1, 1);
	context.fillStyle = '#000000';
	context.fillRect(1, 0, 1, 1);
	return await canvas.encode('png');
}

async function firstPixel(buffer: Buffer): Promise<[number, number, number, number]> {
	const image = await loadImage(buffer);
	const canvas = createCanvas(image.width, image.height);
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	const data = context.getImageData(0, 0, 1, 1).data;
	return [data[0], data[1], data[2], data[3]];
}

function outputBuffer(result: INodeExecutionData[][], propertyName = 'data'): Buffer {
	const data = result[0][0].binary?.[propertyName]?.data;
	if (!data) throw new Error('Expected output binary data');
	return Buffer.from(data, 'base64');
}

async function colorAt(buffer: Buffer, x: number, y: number): Promise<number[]> {
	const image = await loadImage(buffer);
	const canvas = createCanvas(image.width, image.height);
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	return Array.from(context.getImageData(x, y, 1, 1).data);
}

async function alphaAt(buffer: Buffer, x: number, y: number): Promise<number> {
	return (await colorAt(buffer, x, y))[3];
}

async function nonWhiteBounds(
	buffer: Buffer,
): Promise<{ left: number; top: number; right: number; bottom: number }> {
	const image = await loadImage(buffer);
	const canvas = createCanvas(image.width, image.height);
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
	let left = canvas.width;
	let top = canvas.height;
	let right = 0;
	let bottom = 0;

	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			const index = (y * canvas.width + x) * 4;
			if (pixels[index] > 240 && pixels[index + 1] > 240 && pixels[index + 2] > 240) continue;
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x + 1);
			bottom = Math.max(bottom, y + 1);
		}
	}

	return { left, top, right, bottom };
}

function measureTextBounds({
	font,
	text,
	fontSize,
	horizontalAlignment,
	verticalAlignment,
	positionX,
	positionY,
	width,
	height,
}: {
	font: string;
	text: string;
	fontSize: number;
	horizontalAlignment: 'east' | 'west';
	verticalAlignment: 'north' | 'south';
	positionX: number;
	positionY: number;
	width: number;
	height: number;
}): { left: number; top: number; right: number; bottom: number } {
	const family = 'n8n-edit-image-test-font';
	const fontKey = GlobalFonts.registerFromPath(font, family);
	if (!fontKey) throw new Error('Expected the test font to load');

	try {
		const context = createCanvas(width, height).getContext('2d');
		context.font = `${fontSize}px "${family}"`;
		context.textAlign = horizontalAlignment === 'east' ? 'right' : 'left';
		context.textBaseline = 'alphabetic';
		const metrics = context.measureText(text);
		const x = horizontalAlignment === 'east' ? width - positionX : positionX;
		const y = verticalAlignment === 'south' ? height - positionY : positionY;

		return {
			left: Math.max(0, Math.floor(x - metrics.actualBoundingBoxLeft)),
			top: Math.max(0, Math.floor(y - metrics.actualBoundingBoxAscent)),
			right: Math.min(width, Math.ceil(x + metrics.actualBoundingBoxRight)),
			bottom: Math.min(height, Math.ceil(y + metrics.actualBoundingBoxDescent)),
		};
	} finally {
		GlobalFonts.remove(fontKey);
	}
}

function createExecuteFunctions({
	parameters,
	input,
	binaryBuffers = {},
}: {
	parameters: Record<string, object | NodeParameterValueType>;
	input?: INodeExecutionData;
	binaryBuffers?: Record<string, Buffer>;
}): IExecuteFunctions {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	executeFunctions.getNode.mockReturnValue(node);
	executeFunctions.getInputData.mockReturnValue([input ?? { json: {} }]);
	executeFunctions.continueOnFail.mockReturnValue(false);
	executeFunctions.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'options') return parameters.options ?? {};
		if (name in parameters) return parameters[name];
		throw new Error(`Unexpected parameter: ${name}`);
	});
	executeFunctions.helpers.assertBinaryData.mockImplementation((_itemIndex, property) =>
		typeof property === 'string' ? { data: '', mimeType: 'application/octet-stream' } : property,
	);
	executeFunctions.helpers.getBinaryDataBuffer.mockImplementation(async (_itemIndex, property) => {
		if (typeof property === 'string' && binaryBuffers[property]) return binaryBuffers[property];
		if (typeof property !== 'string') return Buffer.from(property.data, 'base64');
		throw new Error(`Missing binary data: ${property}`);
	});
	executeFunctions.helpers.prepareBinaryData.mockImplementation(async (buffer) => ({
		data: (Buffer.isBuffer(buffer) ? buffer : Buffer.alloc(0)).toString('base64'),
		mimeType: 'application/octet-stream',
	}));
	return executeFunctions;
}

async function compositeFirstPixel(
	operator: string,
	input: Buffer,
	overlay: Buffer,
): Promise<[number, number, number, number]> {
	const executeFunctions = createExecuteFunctions({
		parameters: {
			operation: 'composite',
			dataPropertyName: 'data',
			dataPropertyNameComposite: 'overlay',
			operator,
			positionX: 0,
			positionY: 0,
		},
		input: {
			json: {},
			binary: {
				data: { data: input.toString('base64'), mimeType: 'image/png' },
				overlay: { data: overlay.toString('base64'), mimeType: 'application/octet-stream' },
			},
		},
		binaryBuffers: { data: input, overlay },
	});

	const result = await new EditImage().execute.call(executeFunctions);
	return await firstPixel(outputBuffer(result));
}

describe('Edit Image v2', () => {
	it('is the default node version', () => {
		const editImage = new EditImage();
		expect(editImage.description.version).toEqual([1, 1.1, 2]);
		expect(editImage.description.defaultVersion).toBe(2);
	});

	it('shows a deprecation notice only on versions below 2', () => {
		const editImage = new EditImage();
		const notice = editImage.description.properties.find(
			(property) => property.name === 'legacyVersionNotice',
		);

		expect(notice).toMatchObject({
			type: 'notice',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lt: 2 } }],
				},
			},
		});
		expect(notice?.displayName).toContain('deprecated');
		expect(notice?.displayName).toContain('version 2');
	});

	it('shows quality only for supported formats', () => {
		const editImage = new EditImage();
		const options = editImage.description.properties.find(
			(property) => property.name === 'options',
		);
		const qualityOptions = options?.options?.filter(isQualityOption);

		expect(qualityOptions).toHaveLength(2);
		expect(qualityOptions?.[0].displayOptions?.show).toEqual({
			format: ['jpeg', 'png', 'tiff'],
			'@version': [{ _cnd: { lt: 2 } }],
		});
		expect(qualityOptions?.[1].displayOptions?.show).toEqual({
			format: ['jpeg', 'webp'],
			'@version': [{ _cnd: { gte: 2 } }],
		});
	});

	it.each([
		['#ffeeccff', '#ffeecc00'],
		['#ffeecc00', '#ffeeccff'],
		['#ffeecc', '#ffeecc'],
	])('converts the legacy opacity in %s to %s', (color, expected) => {
		expect(toCanvasColor(color)).toBe(expected);
	});

	it.each([
		['ignoreAspectRatio', 200, 100, { width: 200, height: 100 }],
		['maximumArea', 100, 100, { width: 141, height: 70 }],
		['minimumArea', 100, 100, { width: 200, height: 100 }],
		['onlyIfLarger', 1000, 1000, { width: 200, height: 100 }],
		['onlyIfSmaller', 100, 100, { width: 200, height: 100 }],
		['percent', 50, 25, { width: 100, height: 25 }],
	])('calculates %s resize dimensions', (option, width, height, expected) => {
		expect(calculateResizeDimensions(200, 100, width, height, option)).toEqual(expected);
	});

	it.each([
		[0, 100],
		[100, 0],
		[-1, 100],
		[100, -1],
	])('rejects non-positive resize dimensions %s x %s', (width, height) => {
		expect(() => calculateResizeDimensions(200, 100, width, height, 'ignoreAspectRatio')).toThrow(
			'Resize width and height must be greater than zero',
		);
	});

	it.each([
		['blur', { blurRadius: 2 }],
		['border', { borderColor: '#0000ff', borderWidth: 2, borderHeight: 3 }],
		['crop', { width: 8, height: 6, positionX: 1, positionY: 1 }],
		[
			'draw',
			{
				primitive: 'rectangle',
				color: '#00ff00',
				startPositionX: 1,
				startPositionY: 1,
				endPositionX: 8,
				endPositionY: 6,
				cornerRadius: 1,
			},
		],
		['resize', { width: 8, height: 8, resizeOption: 'maximumArea' }],
		['rotate', { rotate: 30, backgroundColor: '#ffffff' }],
		['shear', { degreesX: 10, degreesY: 5 }],
		['transparent', { color: '#ff0000' }],
	])('processes the %s operation', async (operation, operationParameters) => {
		const input = await imageBuffer();
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation,
				dataPropertyName: 'data',
				...operationParameters,
			},
			input: {
				json: { id: 1 },
				binary: {
					data: {
						data: input.toString('base64'),
						mimeType: 'image/png',
						fileName: 'input.png',
					},
				},
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(outputBuffer(result).length).toBeGreaterThan(0);
		expect(result[0][0].json).toEqual({ id: 1 });
	});

	it('makes the selected RGB color transparent regardless of its opacity byte', async () => {
		const input = await twoColorImageBuffer();
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'transparent',
				dataPropertyName: 'data',
				color: '#ff0000ff',
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = outputBuffer(result);

		expect(await alphaAt(output, 0, 0)).toBe(0);
		expect(await alphaAt(output, 1, 0)).toBe(255);
	});

	it('returns the requested crop dimensions', async () => {
		const input = await imageBuffer('#ff0000', 20, 10);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'crop',
				dataPropertyName: 'data',
				width: 8,
				height: 6,
				positionX: 1,
				positionY: 1,
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = await loadImage(outputBuffer(result));

		expect({ width: output.width, height: output.height }).toEqual({ width: 8, height: 6 });
	});

	it.each([
		[
			'line',
			{
				primitive: 'line',
				startPositionX: 0,
				startPositionY: 0,
				endPositionX: 19,
				endPositionY: 19,
				cornerRadius: 0,
			},
		],
		[
			'circle',
			{
				primitive: 'circle',
				startPositionX: 10,
				startPositionY: 10,
				endPositionX: 15,
				endPositionY: 10,
				cornerRadius: 0,
			},
		],
	])('renders the %s draw primitive', async (_, drawParameters) => {
		const input = await imageBuffer('#ffffff', 20, 20);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'draw',
				dataPropertyName: 'data',
				color: '#0066ff00',
				...drawParameters,
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const [red, green, blue] = await colorAt(outputBuffer(result), 10, 10);

		expect(blue).toBeGreaterThan(red);
		expect(blue).toBeGreaterThan(green);
	});

	it('adds a border without filling transparent source pixels', async () => {
		const input = await imageBufferWithTransparentCorners();
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'border',
				dataPropertyName: 'data',
				borderColor: '#66339900',
				borderWidth: 2,
				borderHeight: 2,
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = outputBuffer(result);

		expect(await alphaAt(output, 0, 0)).toBe(255);
		expect(await alphaAt(output, 2, 2)).toBe(0);
		expect(await alphaAt(output, 6, 6)).toBe(255);
	});

	it('preserves the legacy background RGB when creating a JPEG', async () => {
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'create',
				dataPropertyName: 'data',
				width: 10,
				height: 10,
				backgroundColor: '#3366ccff',
				options: { format: 'jpeg', quality: 80 },
			},
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const [red, green, blue, alpha] = await colorAt(outputBuffer(result), 0, 0);

		expect(red).toBeGreaterThan(40);
		expect(green).toBeGreaterThan(90);
		expect(blue).toBeGreaterThan(180);
		expect(alpha).toBe(255);
	});

	it.each([
		[
			'rotate',
			{
				operation: 'rotate',
				dataPropertyName: 'data',
				rotate: 30,
				backgroundColor: '#ffeeccff',
			},
		],
		[
			'multi-step rotate',
			{
				operation: 'multiStep',
				dataPropertyName: 'data',
				operations: {
					operations: [
						{
							operation: 'rotate',
							rotate: 30,
							backgroundColor: '#ffeeccff',
						},
					],
				},
			},
		],
	])('preserves transparent backgrounds for %s', async (_, parameters) => {
		const input = await imageBuffer();
		const executeFunctions = createExecuteFunctions({
			parameters,
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(await alphaAt(outputBuffer(result), 0, 0)).toBe(0);
	});

	it.each([
		[90, { width: 50, height: 100 }],
		[180, { width: 100, height: 50 }],
		[270, { width: 50, height: 100 }],
	])('keeps exact dimensions for a %s degree rotation', async (rotate, expected) => {
		const input = await imageBuffer('#ff0000', 100, 50);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'rotate',
				dataPropertyName: 'data',
				rotate,
				backgroundColor: '#ffffffff',
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = await loadImage(outputBuffer(result));

		expect({ width: output.width, height: output.height }).toEqual(expected);
	});

	it('matches the legacy shear dimensions and direction', async () => {
		const input = await imageBuffer('#ff0000', 100, 100);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'shear',
				dataPropertyName: 'data',
				degreesX: 14,
				degreesY: 7,
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = outputBuffer(result);
		const image = await loadImage(output);

		expect({ width: image.width, height: image.height }).toEqual({ width: 112, height: 111 });
		expect(await alphaAt(output, 5, 5)).toBe(0);
		expect(await alphaAt(output, 15, 5)).toBeGreaterThan(0);
		expect(await alphaAt(output, 5, 95)).toBeGreaterThan(0);
	});

	it('composites a second binary image', async () => {
		const input = await imageBuffer();
		const overlay = await imageBuffer('#0000ff', 5, 5);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'composite',
				dataPropertyName: 'data',
				dataPropertyNameComposite: 'overlay',
				operator: 'Over',
				positionX: 2,
				positionY: 2,
			},
			input: {
				json: {},
				binary: {
					data: { data: input.toString('base64'), mimeType: 'image/png' },
					overlay: { data: overlay.toString('base64'), mimeType: 'image/png' },
				},
			},
			binaryBuffers: { data: input, overlay },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(outputBuffer(result).length).toBeGreaterThan(0);
	});

	it.each([
		'Add',
		'Atop',
		'Bumpmap',
		'Copy',
		'CopyBlack',
		'CopyBlue',
		'CopyCyan',
		'CopyGreen',
		'CopyMagenta',
		'CopyOpacity',
		'CopyRed',
		'CopyYellow',
		'Difference',
		'Divide',
		'In',
		'Minus',
		'Multiply',
		'Out',
		'Over',
		'Plus',
		'Subtract',
		'Xor',
	])('supports the %s composite option', async (operator) => {
		const input = await imageBuffer();
		const overlay = await imageBuffer('#0000ff', 5, 5);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'composite',
				dataPropertyName: 'data',
				dataPropertyNameComposite: 'overlay',
				operator,
				positionX: 2,
				positionY: 2,
			},
			input: {
				json: {},
				binary: {
					data: { data: input.toString('base64'), mimeType: 'image/png' },
					overlay: { data: overlay.toString('base64'), mimeType: 'image/png' },
				},
			},
			binaryBuffers: { data: input, overlay },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(outputBuffer(result).length).toBeGreaterThan(0);
	});

	it.each([
		['Plus', [255, 255, 170, 255]],
		['Add', [44, 4, 170, 255]],
		['Minus', [0, 0, 70, 255]],
		['Subtract', [100, 40, 185, 255]],
		['Divide', [255, 255, 106, 255]],
		['Multiply', [78, 64, 23, 255]],
		['Bumpmap', [60, 66, 72, 255]],
	])('matches GraphicsMagick channel arithmetic for %s', async (operator, expected) => {
		const input = await imageBuffer('#646e78', 1, 1);
		const overlay = await imageBuffer('#c89632', 1, 1);

		expect(await compositeFirstPixel(operator, input, overlay)).toEqual(expected);
	});

	it.each([
		['CopyRed', [200, 110, 120, 255]],
		['CopyGreen', [100, 150, 120, 255]],
		['CopyBlue', [100, 110, 50, 255]],
		['CopyCyan', [55, 145, 135, 255]],
		['CopyMagenta', [155, 105, 135, 255]],
		['CopyYellow', [155, 145, 205, 255]],
		['CopyBlack', [61, 57, 53, 255]],
	])('matches GraphicsMagick channel copying for %s', async (operator, expected) => {
		const input = await imageBuffer('#646e78', 1, 1);
		const overlay = await imageBuffer('#c89632', 1, 1);

		expect(await compositeFirstPixel(operator, input, overlay)).toEqual(expected);
	});

	it('converts pixels outside CMYK copy overlays to complemented RGB channels', async () => {
		const input = await imageBuffer('#646e78', 2, 1);
		const overlay = await imageBuffer('#c89632', 1, 1);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'composite',
				dataPropertyName: 'data',
				dataPropertyNameComposite: 'overlay',
				operator: 'CopyCyan',
				positionX: 1,
				positionY: 0,
			},
			input: {
				json: {},
				binary: {
					data: { data: input.toString('base64'), mimeType: 'image/png' },
					overlay: { data: overlay.toString('base64'), mimeType: 'image/png' },
				},
			},
			binaryBuffers: { data: input, overlay },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const output = outputBuffer(result);

		expect(await colorAt(output, 0, 0)).toEqual([155, 145, 135, 255]);
		expect(await colorAt(output, 1, 0)).toEqual([55, 145, 135, 255]);
	});

	it.each([
		['Copy', [200, 150, 50, 255]],
		['In', [200, 150, 50, 255]],
		['Out', [100, 110, 120, 255]],
		['Xor', [0, 0, 0, 255]],
	])('matches GraphicsMagick overlap handling for %s', async (operator, expected) => {
		const input = await imageBuffer('#646e78', 1, 1);
		const overlay = await imageBuffer('#c89632', 1, 1);

		expect(await compositeFirstPixel(operator, input, overlay)).toEqual(expected);
	});

	it.each(['Out', 'Xor'])(
		'applies alpha-aware %s compositing to partially transparent pixels',
		async (operator) => {
			const input = await rgbaImageBuffer(100, 110, 120, 128);
			const overlay = await rgbaImageBuffer(200, 150, 50, 255);

			expect(await compositeFirstPixel(operator, input, overlay)).toEqual([201, 151, 50, 127]);
		},
	);

	it('does not erase the target when XOR receives a transparent source pixel', async () => {
		const input = await rgbaImageBuffer(100, 110, 120, 255);
		const overlay = await rgbaImageBuffer(200, 150, 50, 0);

		expect(await compositeFirstPixel('Xor', input, overlay)).toEqual([100, 110, 120, 255]);
	});

	it('copies intensity into opacity when the source has no alpha channel', async () => {
		const input = await imageBuffer('#646e78', 1, 1);
		const overlay = await jpegImageBuffer('#c89632');

		expect(await compositeFirstPixel('CopyOpacity', input, overlay)).toEqual([100, 110, 120, 153]);
	});

	it('returns normalized image information', async () => {
		const input = await imageBuffer('#ff0000', 20, 10);
		const executeFunctions = createExecuteFunctions({
			parameters: { operation: 'information', dataPropertyName: 'data' },
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(result[0][0].json).toEqual({
			size: { width: 20, height: 10 },
			format: 'png',
			colorType: 'rgba',
			bitDepth: 8,
			channels: 4,
			hasAlpha: true,
			fileSize: input.length,
		});
	});

	it('returns a readable color type for images without alpha', async () => {
		const input = await jpegImageBuffer('#ff0000');
		const executeFunctions = createExecuteFunctions({
			parameters: { operation: 'information', dataPropertyName: 'data' },
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/jpeg' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(result[0][0].json).toMatchObject({
			size: { width: 1, height: 1 },
			format: 'jpeg',
			colorType: 'rgb',
			bitDepth: 8,
			channels: 3,
			hasAlpha: false,
		});
	});

	it('returns dimensions and format for GIF metadata fallback', async () => {
		const canvas = createCanvas(3, 2);
		const input = await canvas.encode('gif');
		const executeFunctions = createExecuteFunctions({
			parameters: { operation: 'information', dataPropertyName: 'data' },
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/gif' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(result[0][0].json).toMatchObject({
			size: { width: 3, height: 2 },
			format: 'gif',
		});
	});

	it('renders text with a selected system font', async () => {
		const fonts = await getSystemFonts();
		const font = fonts[0];
		expect(font).toBeDefined();
		const input = await imageBuffer('#ffffff', 80, 40);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'text',
				dataPropertyName: 'data',
				text: 'Hello',
				fontSize: 12,
				fontColor: '#000000',
				positionX: 2,
				positionY: 2,
				horizontalAlignment: 'west',
				verticalAlignment: 'north',
				lineLength: 80,
				options: { font },
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(outputBuffer(result).length).toBeGreaterThan(0);
	});

	it.each([['west', 'north'] as const, ['east', 'south'] as const])(
		'positions %s and %s text from the font baseline',
		async (horizontalAlignment, verticalAlignment) => {
			const fonts = await getSystemFonts();
			const font = fonts.find((systemFont) => systemFont.includes('Arial.')) ?? fonts[0];
			expect(font).toBeDefined();
			const text = 'Alignment';
			const fontSize = 14;
			const positionX = 20;
			const positionY = 20;
			const width = 100;
			const height = 100;
			const input = await imageBuffer('#ffffff', width, height);
			const executeFunctions = createExecuteFunctions({
				parameters: {
					operation: 'text',
					dataPropertyName: 'data',
					text,
					fontSize,
					fontColor: '#111111',
					positionX,
					positionY,
					horizontalAlignment,
					verticalAlignment,
					lineLength: 20,
					options: { font },
				},
				input: {
					json: {},
					binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
				},
				binaryBuffers: { data: input },
			});

			const result = await new EditImage().execute.call(executeFunctions);
			const bounds = await nonWhiteBounds(outputBuffer(result));
			const expected = measureTextBounds({
				font,
				text,
				fontSize,
				horizontalAlignment,
				verticalAlignment,
				positionX,
				positionY,
				width,
				height,
			});

			for (const edge of ['left', 'top', 'right', 'bottom'] as const) {
				expect(Math.abs(bounds[edge] - expected[edge])).toBeLessThanOrEqual(2);
			}
		},
	);

	it('runs multiple operations in order', async () => {
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'multiStep',
				dataPropertyName: 'data',
				operations: {
					operations: [
						{
							operation: 'create',
							width: 10,
							height: 10,
							backgroundColor: '#ff0000',
						},
						{
							operation: 'border',
							borderColor: '#0000ff',
							borderWidth: 2,
							borderHeight: 2,
						},
						{
							operation: 'resize',
							width: 7,
							height: 7,
							resizeOption: 'ignoreAspectRatio',
						},
					],
				},
			},
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const { Transformer } = await import('@napi-rs/image');
		const metadata = await new Transformer(outputBuffer(result)).metadata();

		expect(metadata).toMatchObject({ width: 7, height: 7 });
	});

	it('can replace the current image with Create during Multi Step', async () => {
		const input = await imageBuffer('#ff0000', 20, 10);
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'multiStep',
				dataPropertyName: 'data',
				operations: {
					operations: [
						{
							operation: 'resize',
							width: 5,
							height: 5,
							resizeOption: 'ignoreAspectRatio',
						},
						{
							operation: 'create',
							width: 9,
							height: 6,
							backgroundColor: '#0000ff',
						},
					],
				},
			},
			input: {
				json: {},
				binary: { data: { data: input.toString('base64'), mimeType: 'image/png' } },
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const { Transformer } = await import('@napi-rs/image');
		const metadata = await new Transformer(outputBuffer(result)).metadata();

		expect(metadata).toMatchObject({ width: 9, height: 6 });
	});

	it('preserves the input format when no output format is selected', async () => {
		const input = await jpegImageBuffer('#ff0000');
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'resize',
				dataPropertyName: 'data',
				width: 1,
				height: 1,
				resizeOption: 'ignoreAspectRatio',
			},
			input: {
				json: {},
				binary: {
					data: {
						data: input.toString('base64'),
						mimeType: 'image/jpeg',
						fileName: 'input.jpeg',
					},
				},
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(outputBuffer(result).subarray(0, 2).toString('hex')).toBe('ffd8');
		expect(result[0][0].binary?.data?.fileName).toBe('input.jpeg');
	});

	it('updates the extension when the optional file name is empty', async () => {
		const input = await imageBuffer();
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'resize',
				dataPropertyName: 'data',
				width: 20,
				height: 10,
				resizeOption: 'ignoreAspectRatio',
				options: { format: 'jpeg', fileName: '' },
			},
			input: {
				json: {},
				binary: {
					data: {
						data: input.toString('base64'),
						mimeType: 'image/png',
						fileName: 'input.png',
					},
				},
			},
			binaryBuffers: { data: input },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(result[0][0].binary?.data?.fileName).toBe('input.jpeg');
	});

	it('applies quality to WebP output', async () => {
		const runWithQuality = async (quality: number) => {
			const executeFunctions = createExecuteFunctions({
				parameters: {
					operation: 'create',
					dataPropertyName: 'data',
					width: 4,
					height: 4,
					backgroundColor: '#ff0000',
					options: { format: 'webp', quality },
				},
			});
			return outputBuffer(await new EditImage().execute.call(executeFunctions));
		};

		expect(await runWithQuality(0)).not.toEqual(await runWithQuality(100));
	});

	it.each([
		['bmp', '424d'],
		['gif', '474946'],
		['jpeg', 'ffd8'],
		['png', '89504e47'],
		['tiff', '49492a00'],
		['webp', '52494646'],
	])('writes %s output', async (format, expectedHeader) => {
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'create',
				dataPropertyName: 'data',
				width: 4,
				height: 4,
				backgroundColor: '#ff0000',
				options: {
					destinationKey: 'output',
					fileName: `result.${format}`,
					format,
					quality: 80,
				},
			},
		});

		const result = await new EditImage().execute.call(executeFunctions);
		const buffer = outputBuffer(result, 'output');

		expect(buffer.subarray(0, expectedHeader.length / 2).toString('hex')).toBe(expectedHeader);
		expect(result[0][0].binary?.output?.fileName).toBe(`result.${format}`);
	});

	it('rejects an unsafe destination field', async () => {
		const executeFunctions = createExecuteFunctions({
			parameters: {
				operation: 'create',
				dataPropertyName: 'data',
				width: 4,
				height: 4,
				backgroundColor: '#ff0000',
				options: { destinationKey: '__proto__' },
			},
		});

		await expect(new EditImage().execute.call(executeFunctions)).rejects.toThrow(
			'Destination Output Field contains an unsafe name',
		);
	});
});
