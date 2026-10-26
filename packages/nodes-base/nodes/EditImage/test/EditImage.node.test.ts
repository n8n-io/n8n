import { mockDeep } from 'vitest-mock-extended';

import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { EditImage, resolveGravity } from '../EditImage.node';

const { mockGetSystemFonts } = vi.hoisted(() => ({
	mockGetSystemFonts: vi.fn(),
}));

vi.mock('get-system-fonts', () => ({ default: mockGetSystemFonts }));

const arialFont = '/fonts/Arial.ttf';

const createTestBuffer = () =>
	Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82,
	]);

const mockGmInstance: any = {
	background: vi.fn(function (this: any) {
		return this;
	}),
	blur: vi.fn(function (this: any) {
		return this;
	}),
	borderColor: vi.fn(function (this: any) {
		return this;
	}),
	border: vi.fn(function (this: any) {
		return this;
	}),
	compose: vi.fn(function (this: any) {
		return this;
	}),
	geometry: vi.fn(function (this: any) {
		return this;
	}),
	composite: vi.fn(function (this: any) {
		return this;
	}),
	crop: vi.fn(function (this: any) {
		return this;
	}),
	drawCircle: vi.fn(function (this: any) {
		return this;
	}),
	drawLine: vi.fn(function (this: any) {
		return this;
	}),
	drawRectangle: vi.fn(function (this: any) {
		return this;
	}),
	fill: vi.fn(function (this: any) {
		return this;
	}),
	font: vi.fn(function (this: any) {
		return this;
	}),
	fontSize: vi.fn(function (this: any) {
		return this;
	}),
	drawText: vi.fn(function (this: any) {
		return this;
	}),
	identify: vi.fn(function (this: any, callback: any) {
		callback(null, { width: 100, height: 100, format: 'PNG' });
		return this;
	}),
	quality: vi.fn(function (this: any) {
		return this;
	}),
	resize: vi.fn(function (this: any) {
		return this;
	}),
	rotate: vi.fn(function (this: any) {
		return this;
	}),
	setFormat: vi.fn(function (this: any) {
		return this;
	}),
	shear: vi.fn(function (this: any) {
		return this;
	}),
	stream: vi.fn(function (this: any) {
		return this;
	}),
	transparent: vi.fn(function (this: any) {
		return this;
	}),
	toBuffer: vi.fn(function (this: any, callback: any) {
		callback(null, createTestBuffer());
		return this;
	}),
	autoOrient: vi.fn(function (this: any) {
		return this;
	}),
	out: vi.fn(function (this: any) {
		return this;
	}),
};

vi.mock('gm', () => ({ default: vi.fn(() => mockGmInstance) }));

describe('resolveGravity', () => {
	it.each([
		['west', 'north', 'northwest'],
		['west', 'middle', 'west'],
		['west', 'south', 'southwest'],
		['center', 'north', 'north'],
		['center', 'middle', 'center'],
		['center', 'south', 'south'],
		['east', 'north', 'northeast'],
		['east', 'middle', 'east'],
		['east', 'south', 'southeast'],
	])('resolves %s + %s to %s', (horizontal, vertical, expected) => {
		expect(resolveGravity(horizontal, vertical)).toBe(expected);
	});

	it('falls back to northwest for invalid input', () => {
		expect(resolveGravity('invalid', 'invalid')).toBe('northwest');
	});
});

describe('EditImage Node', () => {
	let editImageNode: EditImage;
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	let mockNode: INode;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSystemFonts.mockResolvedValue([arialFont, '/fonts/Roboto.ttf']);
		editImageNode = new EditImage();
		mockNode = {
			id: 'test-node-id',
			name: 'EditImage',
			type: 'n8n-nodes-base.editImage',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(undefined as any);
	});

	describe('dataPropertyName parameter', () => {
		it('should handle IBinaryData type', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle string type for custom property', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						customImageProperty: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'information';
				if (paramName === 'dataPropertyName') return 'customImageProperty';
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(
				0,
				'customImageProperty',
			);
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(
				0,
				'customImageProperty',
			);
		});

		it('should handle string type for default "data" property', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'information';
				if (paramName === 'dataPropertyName') return 'data';
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		});

		it('should throw error when binary data is missing', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'missingProperty';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				return {};
			});

			const error = new Error('Binary data missing');
			mockExecuteFunctions.helpers.assertBinaryData.mockImplementation(() => {
				throw error;
			});

			await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow();
		});
	});

	describe('destinationKey option', () => {
		it('should use destinationKey for output property', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: { id: 1 },
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string, _: number) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') {
					return {
						destinationKey: 'processedImage',
					};
				}
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('processedImage');
			expect(result[0][0].json).toEqual({ id: 1 });
		});

		it('should default output to input property name when destinationKey not specified', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: { id: 1 },
					binary: {
						imageData: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'imageData';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('imageData');
		});
	});

	describe('data preservation', () => {
		it('should preserve existing binary data when processing', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: { id: 1 },
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
						otherFile: {
							data: 'other-data',
							mimeType: 'text/plain',
							fileName: 'other.txt',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(result[0][0].binary).toHaveProperty('otherFile');
			expect(result[0][0].binary?.otherFile).toEqual({
				data: 'other-data',
				mimeType: 'text/plain',
				fileName: 'other.txt',
			});
		});

		it('should preserve JSON data when processing binary', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: { id: 1, name: 'test', metadata: { processed: false } },
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ id: 1, name: 'test', metadata: { processed: false } });
		});
	});

	describe('create operation', () => {
		it('should create image without input binary', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'create';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'backgroundColor') return '#ffffff';
				if (paramName === 'width') return 100;
				if (paramName === 'height') return 100;
				if (paramName === 'options') {
					return {
						format: 'png',
					};
				}
				return {};
			});

			const testBuffer = createTestBuffer();
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'image.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).not.toHaveBeenCalled();
		});
	});

	describe('information operation', () => {
		it('should return image information', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'information';
				if (paramName === 'dataPropertyName') return 'data';
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toBeDefined();
			expect(result[0][0].json).toHaveProperty('width');
			expect(result[0][0].json).toHaveProperty('height');
			expect(result[0][0].json).toHaveProperty('format');
		});
	});

	describe('multiple items', () => {
		it('should process multiple items with different binary property names', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: { id: 1 },
					binary: {
						image1: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test1.png',
						},
					},
				},
				{
					json: { id: 2 },
					binary: {
						image2: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test2.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number) => {
					if (paramName === 'operation') return 'blur';
					if (paramName === 'dataPropertyName') {
						return itemIndex === 0 ? 'image1' : 'image2';
					}
					if (paramName === 'blur') return 5;
					if (paramName === 'sigma') return 2;
					if (paramName === 'options') return {};
					return {};
				},
			);

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].binary).toHaveProperty('image1');
			expect(result[0][1].binary).toHaveProperty('image2');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'image1');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(1, 'image2');
		});
	});

	describe('format and quality options', () => {
		it('should apply format option to output binary data', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') {
					return {
						format: 'jpeg',
						quality: 80,
					};
				}
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/jpeg',
				fileExtension: 'jpeg',
				fileName: 'test.jpeg',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary?.data?.mimeType).toBe('image/jpeg');
			expect(result[0][0].binary?.data?.fileExtension).toBe('jpeg');
		});

		it.each([
			['unsupported string', 'pdf'],
			['non-string value', 123],
		])('should reject an %s format', async (_, format) => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];
			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') return { format };
				return {};
			});
			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

			await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				`Invalid image format: ${format}`,
			);
			expect(mockGmInstance.setFormat).not.toHaveBeenCalled();
		});

		it('should apply custom fileName option', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') {
					return {
						fileName: 'custom-output.png',
					};
				}
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'custom-output.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary?.data?.fileName).toBe('custom-output.png');
		});
	});

	describe('error handling', () => {
		it('should return error in json when continueOnFail is true', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'missingProperty';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				return {};
			});

			const error = new Error('Binary data missing');
			mockExecuteFunctions.helpers.assertBinaryData.mockImplementation(() => {
				throw error;
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
			expect(result[0][0].json.error).toBe('Binary data missing');
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should throw error when continueOnFail is false', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'missingProperty';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				return {};
			});

			const error = new Error('Binary data missing');
			mockExecuteFunctions.helpers.assertBinaryData.mockImplementation(() => {
				throw error;
			});

			await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Binary data missing',
			);
		});
	});

	describe('operations with IBinaryData', () => {
		it('should handle information operation with IBinaryData', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'information';
				if (paramName === 'dataPropertyName') return binaryData;
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('width');
			expect(result[0][0].json).toHaveProperty('height');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle crop operation with IBinaryData', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'crop';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'width') return 100;
				if (paramName === 'height') return 100;
				if (paramName === 'positionX') return 0;
				if (paramName === 'positionY') return 0;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it.each([
			{
				name: 'ordinary backslashes',
				text: 'path\\to\\font',
				expectedText: 'path\\\\to\\\\font',
			},
			{
				name: 'escaped quotes',
				text: 'text \\"quoted\\" value',
				expectedText: 'text \\\\"quoted\\\\" value',
			},
		])('should handle $name in text operation with IBinaryData', async ({ text, expectedText }) => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'text';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'text') return text;
				if (paramName === 'fontSize') return 18;
				if (paramName === 'fontColor') return '#000000';
				if (paramName === 'positionX') return 10;
				if (paramName === 'positionY') return 10;
				if (paramName === 'lineLength') return 80;
				if (paramName === 'options') return { font: arialFont };
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
			expect(mockGmInstance.font).toHaveBeenCalledWith(arialFont);
			expect(mockGmInstance.drawText).toHaveBeenCalledWith(10, 10, expectedText, 'northwest');
		});

		describe('font parameter', () => {
			it('should use the installed Arial font when no font is selected', async () => {
				const testBuffer = createTestBuffer();
				const items: INodeExecutionData[] = [
					{
						json: {},
						binary: {
							data: {
								data: testBuffer.toString('base64'),
								mimeType: 'image/png',
							},
						},
					},
				];

				mockExecuteFunctions.getInputData.mockReturnValue(items);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'operation') return 'text';
					if (paramName === 'dataPropertyName') return 'data';
					if (paramName === 'text') return 'Hello';
					if (paramName === 'fontSize') return 18;
					if (paramName === 'fontColor') return '#000000';
					if (paramName === 'positionX') return 10;
					if (paramName === 'positionY') return 10;
					if (paramName === 'lineLength') return 80;
					if (paramName === 'options') return {};
					throw new Error(`Unexpected parameter: ${paramName}`);
				});
				mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
				mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
					data: testBuffer.toString('base64'),
					mimeType: 'image/png',
				});

				await editImageNode.execute.call(mockExecuteFunctions);

				expect(mockGmInstance.font).toHaveBeenCalledWith(arialFont);
			});

			it.each(['text', 'multiStep'])(
				'should reject an unavailable font for %s',
				async (operation) => {
					const testBuffer = createTestBuffer();
					mockExecuteFunctions.getInputData.mockReturnValue([
						{
							json: {},
							binary: {
								data: {
									data: testBuffer.toString('base64'),
									mimeType: 'image/png',
								},
							},
						},
					]);
					mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
						if (paramName === 'operation') return operation;
						if (paramName === 'dataPropertyName') return 'data';
						if (paramName === 'options') {
							return operation === 'text' ? { font: '/fonts/Unavailable.ttf' } : {};
						}
						if (paramName === 'operations') {
							return {
								operations: [
									{
										operation: 'text',
										font: '/fonts/Unavailable.ttf',
										fontColor: '#000000',
										fontSize: 18,
										lineLength: 80,
										positionX: 10,
										positionY: 10,
										text: 'Hello',
									},
								],
							};
						}
						if (paramName === 'text') return 'Hello';
						if (paramName === 'fontSize') return 18;
						if (paramName === 'fontColor') return '#000000';
						if (paramName === 'positionX') return 10;
						if (paramName === 'positionY') return 10;
						if (paramName === 'lineLength') return 80;
						throw new Error(`Unexpected parameter: ${paramName}`);
					});
					mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);

					await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
						'The selected font is not available. Select a font from the options.',
					);
				},
			);
		});

		it('should pass resolved gravity to drawText for text operation', async () => {
			mockNode.typeVersion = 1.1;

			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'text';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'text') return 'Hello';
				if (paramName === 'fontSize') return 18;
				if (paramName === 'fontColor') return '#000000';
				if (paramName === 'positionX') return 10;
				if (paramName === 'positionY') return 10;
				if (paramName === 'lineLength') return 80;
				if (paramName === 'horizontalAlignment') return 'center';
				if (paramName === 'verticalAlignment') return 'north';
				if (paramName === 'options') return { font: arialFont };
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.drawText).toHaveBeenCalledWith(10, 10, 'Hello', 'north');
		});

		it('should use northwest gravity for v1 nodes regardless of alignment parameters', async () => {
			mockNode.typeVersion = 1;

			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'text';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'text') return 'Hello';
				if (paramName === 'fontSize') return 18;
				if (paramName === 'fontColor') return '#000000';
				if (paramName === 'positionX') return 10;
				if (paramName === 'positionY') return 10;
				if (paramName === 'lineLength') return 80;
				if (paramName === 'horizontalAlignment') return 'center';
				if (paramName === 'verticalAlignment') return 'north';
				if (paramName === 'options') return { font: arialFont };
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.drawText).toHaveBeenCalledWith(10, 10, 'Hello', 'northwest');
		});

		it('should use destinationKey with IBinaryData', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: binaryData,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				if (paramName === 'options') return { destinationKey: 'output' };
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('output');
		});

		it('should read from both main and composite binary properties', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						mainImage: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'main.png',
						},
						overlayImage: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'overlay.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'composite';
				if (paramName === 'dataPropertyName') return 'mainImage';
				if (paramName === 'dataPropertyNameComposite') return 'overlayImage';
				if (paramName === 'operator') return 'Over';
				if (paramName === 'positionX') return 0;
				if (paramName === 'positionY') return 0;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'mainImage');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'overlayImage');
		});
	});

	describe('all operations with string and IBinaryData', () => {
		it('should handle border operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'border';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'borderColor') return '#000000';
				if (paramName === 'borderWidth') return 10;
				if (paramName === 'borderHeight') return 10;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		});

		it('should handle border operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'border';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'borderColor') return '#000000';
				if (paramName === 'borderWidth') return 10;
				if (paramName === 'borderHeight') return 10;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle draw operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						imageFile: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'draw';
				if (paramName === 'dataPropertyName') return 'imageFile';
				if (paramName === 'primitive') return 'rectangle';
				if (paramName === 'color') return '#ff0000';
				if (paramName === 'startPositionX') return 10;
				if (paramName === 'startPositionY') return 10;
				if (paramName === 'endPositionX') return 100;
				if (paramName === 'endPositionY') return 100;
				if (paramName === 'cornerRadius') return 5;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('imageFile');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'imageFile');
		});

		it('should handle draw operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'draw';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'primitive') return 'circle';
				if (paramName === 'color') return '#0000ff';
				if (paramName === 'startPositionX') return 50;
				if (paramName === 'startPositionY') return 50;
				if (paramName === 'endPositionX') return 75;
				if (paramName === 'endPositionY') return 75;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle rotate operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						photo: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'rotate';
				if (paramName === 'dataPropertyName') return 'photo';
				if (paramName === 'rotate') return 45;
				if (paramName === 'backgroundColor') return '#ffffff';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('photo');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'photo');
		});

		it('should handle rotate operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'rotate';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'rotate') return 90;
				if (paramName === 'backgroundColor') return '#000000';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle resize operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						image: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'resize';
				if (paramName === 'dataPropertyName') return 'image';
				if (paramName === 'width') return 200;
				if (paramName === 'height') return 200;
				if (paramName === 'resizeOption') return 'maximumArea';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('image');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'image');
		});

		it('should handle resize operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'resize';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'width') return 150;
				if (paramName === 'height') return 150;
				if (paramName === 'resizeOption') return 'ignoreAspectRatio';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle shear operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						myImage: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'shear';
				if (paramName === 'dataPropertyName') return 'myImage';
				if (paramName === 'degreesX') return 20;
				if (paramName === 'degreesY') return 10;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('myImage');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'myImage');
		});

		it('should handle shear operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'shear';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'degreesX') return 15;
				if (paramName === 'degreesY') return 5;
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});

		it('should handle transparent operation with string dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						picture: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'transparent';
				if (paramName === 'dataPropertyName') return 'picture';
				if (paramName === 'color') return '#ffffff';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('picture');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'picture');
		});

		it('should handle transparent operation with IBinaryData dataPropertyName', async () => {
			const testBuffer = createTestBuffer();
			const binaryData = {
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
			};
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'transparent';
				if (paramName === 'dataPropertyName') return binaryData;
				if (paramName === 'color') return '#00ff00';
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});
	});

	describe('numeric parameters', () => {
		const operationTestCases: Array<{
			operation: string;
			parameters: IDataObject;
			numericParameterNames: string[];
		}> = [
			{
				operation: 'blur',
				parameters: { blur: 5, sigma: 2 },
				numericParameterNames: ['blur', 'sigma'],
			},
			{
				operation: 'border',
				parameters: { borderColor: '#000000', borderWidth: 10, borderHeight: 10 },
				numericParameterNames: ['borderWidth', 'borderHeight'],
			},
			{
				operation: 'composite',
				parameters: {
					dataPropertyNameComposite: 'overlay',
					operator: 'Over',
					positionX: 0,
					positionY: 0,
				},
				numericParameterNames: ['positionX', 'positionY'],
			},
			{
				operation: 'create',
				parameters: { backgroundColor: '#ffffff', width: 100, height: 100 },
				numericParameterNames: ['width', 'height'],
			},
			{
				operation: 'crop',
				parameters: { width: 100, height: 100, positionX: 0, positionY: 0 },
				numericParameterNames: ['width', 'height', 'positionX', 'positionY'],
			},
			{
				operation: 'draw',
				parameters: {
					color: '#000000',
					primitive: 'rectangle',
					startPositionX: 0,
					startPositionY: 0,
					endPositionX: 100,
					endPositionY: 100,
					cornerRadius: 0,
				},
				numericParameterNames: [
					'startPositionX',
					'startPositionY',
					'endPositionX',
					'endPositionY',
					'cornerRadius',
				],
			},
			{
				operation: 'resize',
				parameters: { width: 100, height: 100, resizeOption: 'maximumArea' },
				numericParameterNames: ['width', 'height'],
			},
			{
				operation: 'rotate',
				parameters: { backgroundColor: '#ffffff', rotate: 90 },
				numericParameterNames: ['rotate'],
			},
			{
				operation: 'shear',
				parameters: { degreesX: 10, degreesY: 10 },
				numericParameterNames: ['degreesX', 'degreesY'],
			},
			{
				operation: 'text',
				parameters: {
					font: 'Arial',
					fontColor: '#000000',
					fontSize: 18,
					lineLength: 80,
					positionX: 0,
					positionY: 0,
					text: 'Text',
				},
				numericParameterNames: ['fontSize', 'lineLength', 'positionX', 'positionY'],
			},
		];

		it.each(
			operationTestCases.flatMap(({ operation, parameters, numericParameterNames }) =>
				numericParameterNames.map((parameterName) => ({
					operation,
					parameterName,
					parameters: { ...parameters, [parameterName]: 'not-a-number' },
				})),
			),
		)(
			'should reject an invalid $parameterName for the $operation operation',
			async ({ operation, parameterName, parameters }) => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'operation') return operation;
					if (paramName === 'dataPropertyName') return 'data';
					if (paramName === 'options') return {};
					if (paramName in parameters) return parameters[paramName];
					throw new Error(`Unexpected parameter: ${paramName}`);
				});

				await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The value of "${parameterName}" must be a number`,
				);
			},
		);

		it.each([NaN, Infinity, -Infinity, '', '   ', null])(
			'should reject the invalid numeric value %s',
			async (invalidValue) => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'operation') return 'blur';
					if (paramName === 'dataPropertyName') return 'data';
					if (paramName === 'options') return {};
					if (paramName === 'blur') return invalidValue;
					if (paramName === 'sigma') return 2;
					throw new Error(`Unexpected parameter: ${paramName}`);
				});

				await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'The value of "blur" must be a number',
				);
			},
		);

		it('should convert numeric strings before processing the image', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'draw';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'options') return { quality: '85' };
				if (paramName === 'color') return '#000000';
				if (paramName === 'primitive') return 'line';
				if (paramName === 'startPositionX') return '10';
				if (paramName === 'startPositionY') return '20.5';
				if (paramName === 'endPositionX') return '-30';
				if (paramName === 'endPositionY') return '40';
				throw new Error(`Unexpected parameter: ${paramName}`);
			});
			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.drawLine).toHaveBeenCalledWith(10, 20.5, -30, 40);
			expect(mockGmInstance.quality).toHaveBeenCalledWith(85);
		});

		it('should reject an invalid quality value', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'options') return { quality: 'not-a-number' };
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				throw new Error(`Unexpected parameter: ${paramName}`);
			});

			await expect(editImageNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'The value of "quality" must be a number',
			);
		});
	});

	describe('multiStep operation', () => {
		it('should process multiple operations in sequence', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'multiStep';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'operations') {
					return {
						operations: [
							{
								operation: 'blur',
								blur: 5,
								sigma: 2,
							},
							{
								operation: 'rotate',
								rotate: 90,
								backgroundColor: '#ffffff',
							},
						],
					};
				}
				if (paramName === 'options') return {};
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			const result = await editImageNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary).toHaveProperty('data');
		});

		it('should convert numeric strings before processing multiple operations', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'multiStep';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'operations') {
					return {
						operations: [
							{ operation: 'blur', blur: '5', sigma: '2' },
							{ operation: 'rotate', rotate: '90', backgroundColor: '#ffffff' },
						],
					};
				}
				if (paramName === 'options') return {};
				return {};
			});
			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.blur).toHaveBeenCalledWith(5, 2);
			expect(mockGmInstance.rotate).toHaveBeenCalledWith('#ffffff', 90);
		});
	});

	describe('autoOrient', () => {
		it('should call autoOrient when loading an existing image', async () => {
			const testBuffer = createTestBuffer();
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: {
							data: testBuffer.toString('base64'),
							mimeType: 'image/png',
							fileExtension: 'png',
							fileName: 'test.png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'blur';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'blur') return 5;
				if (paramName === 'sigma') return 2;
				return {};
			});

			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(testBuffer);
			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: testBuffer.toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.autoOrient).toHaveBeenCalled();
			expect(mockGmInstance.out).toHaveBeenCalledWith('-orient', 'TopLeft');
		});

		it('should not call autoOrient for create operation', async () => {
			const items: INodeExecutionData[] = [{ json: {} }];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'create';
				if (paramName === 'dataPropertyName') return 'data';
				if (paramName === 'width') return 100;
				if (paramName === 'height') return 100;
				if (paramName === 'backgroundColor') return 'white';
				return {};
			});

			mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: createTestBuffer().toString('base64'),
				mimeType: 'image/png',
				fileExtension: 'png',
			});

			await editImageNode.execute.call(mockExecuteFunctions);

			expect(mockGmInstance.autoOrient).not.toHaveBeenCalled();
			expect(mockGmInstance.out).not.toHaveBeenCalledWith('-orient', 'TopLeft');
		});
	});
});
