import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { EditImage } from '../EditImage.node';

jest.mock('get-system-fonts', () => ({
	__esModule: true,
	default: jest.fn(),
}));

import getSystemFonts from 'get-system-fonts';

const mockGetSystemFonts = jest.mocked(getSystemFonts);

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
	autoOrient: jest.fn(function (this: any) {
		return this;
	}),
	out: jest.fn(function (this: any) {
		return this;
	}),
};

jest.mock('gm', () => ({
	__esModule: true,
	default: jest.fn(() => mockGmInstance),
}));

describe('EditImage Node', () => {
	let editImageNode: EditImage;
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	let mockNode: INode;

	beforeEach(() => {
		jest.clearAllMocks();
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

	describe('operations with IBinaryData', () => {
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
			expect(mockGmInstance.drawText).toHaveBeenCalledWith(10, 10, expectedText);
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
							fileExtension: 'png',
							fileName: 'test.png',
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
});
