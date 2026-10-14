import { createCanvas, loadImage } from '@napi-rs/canvas';
import getSystemFonts from 'get-system-fonts';
import { mockDeep } from 'vitest-mock-extended';

import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	NodeParameterValueType,
} from 'n8n-workflow';

import { EditImage } from '../EditImage.node';
import { calculateResizeDimensions } from '../v2/EditImageV2';

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

describe('Edit Image v2', () => {
	it('is the default node version', () => {
		const editImage = new EditImage();
		expect(editImage.description.version).toEqual([1, 1.1, 2]);
		expect(editImage.description.defaultVersion).toBe(2);
	});

	it.each([
		['ignoreAspectRatio', 200, 100, { width: 200, height: 100 }],
		['maximumArea', 100, 100, { width: 100, height: 50 }],
		['minimumArea', 100, 100, { width: 200, height: 100 }],
		['onlyIfLarger', 1000, 1000, { width: 200, height: 100 }],
		['onlyIfSmaller', 100, 100, { width: 200, height: 100 }],
		['percent', 50, 25, { width: 100, height: 25 }],
	])('calculates %s resize dimensions', (option, width, height, expected) => {
		expect(calculateResizeDimensions(200, 100, width, height, option)).toEqual(expected);
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
		['Minus', [100, 40, 0, 255]],
		['Subtract', [100, 40, 186, 255]],
	])('matches GraphicsMagick channel arithmetic for %s', async (operator, expected) => {
		const input = await imageBuffer('#646e78', 1, 1);
		const overlay = await imageBuffer('#c89632', 1, 1);
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
					overlay: { data: overlay.toString('base64'), mimeType: 'image/png' },
				},
			},
			binaryBuffers: { data: input, overlay },
		});

		const result = await new EditImage().execute.call(executeFunctions);

		expect(await firstPixel(outputBuffer(result))).toEqual(expected);
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

		expect(result[0][0].json).toMatchObject({ width: 20, height: 10, format: 'png' });
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
