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
	autoOrient: jest.fn(function (this: any) {
		return this;
	}),
	out: jest.fn(function (this: any) {
		return this;
	}),
};

jest.mock('gm', () => ({
	default: jest.fn(() => mockGmInstance),
	__esModule: true,
}));

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

	describe('format and quality options', () => {
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
	});
});
