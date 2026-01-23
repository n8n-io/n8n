import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { EditImage } from '../EditImage.node';

const createTestBuffer = () =>
	Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82,
	]);

const mockGmInstance: any = {
	background: jest.fn(function (this: any) {
		return this;
	}),
	blur: jest.fn(function (this: any) {
		return this;
	}),
	borderColor: jest.fn(function (this: any) {
		return this;
	}),
	border: jest.fn(function (this: any) {
		return this;
	}),
	compose: jest.fn(function (this: any) {
		return this;
	}),
	geometry: jest.fn(function (this: any) {
		return this;
	}),
	composite: jest.fn(function (this: any) {
		return this;
	}),
	crop: jest.fn(function (this: any) {
		return this;
	}),
	drawCircle: jest.fn(function (this: any) {
		return this;
	}),
	drawLine: jest.fn(function (this: any) {
		return this;
	}),
	drawRectangle: jest.fn(function (this: any) {
		return this;
	}),
	fill: jest.fn(function (this: any) {
		return this;
	}),
	font: jest.fn(function (this: any) {
		return this;
	}),
	fontSize: jest.fn(function (this: any) {
		return this;
	}),
	drawText: jest.fn(function (this: any) {
		return this;
	}),
	identify: jest.fn(function (this: any, callback: any) {
		callback(null, { width: 100, height: 100, format: 'PNG' });
		return this;
	}),
	quality: jest.fn(function (this: any) {
		return this;
	}),
	resize: jest.fn(function (this: any) {
		return this;
	}),
	rotate: jest.fn(function (this: any) {
		return this;
	}),
	setFormat: jest.fn(function (this: any) {
		return this;
	}),
	shear: jest.fn(function (this: any) {
		return this;
	}),
	stream: jest.fn(function (this: any) {
		return this;
	}),
	transparent: jest.fn(function (this: any) {
		return this;
	}),
	toBuffer: jest.fn(function (this: any, callback: any) {
		callback(null, createTestBuffer());
		return this;
	}),
};

jest.mock('gm', () => jest.fn(() => mockGmInstance));

describe('EditImage Node', () => {
	let editImageNode: EditImage;
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	let mockNode: INode;

	beforeEach(() => {
		jest.clearAllMocks();
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

		it('should handle text operation with IBinaryData', async () => {
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
				if (paramName === 'options') return { font: 'Arial' };
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
	});
});
