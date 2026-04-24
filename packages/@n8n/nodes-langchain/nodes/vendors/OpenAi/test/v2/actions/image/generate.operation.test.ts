import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/image/generate.operation';

jest.mock('../../../../transport');

describe('Image Generate Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');

	const makeNode = (typeVersion: number): INode =>
		mock<INode>({
			id: 'test-node',
			name: 'OpenAI Image Generate',
			type: 'n8n-nodes-base.openAi',
			typeVersion,
			position: [0, 0],
			parameters: {},
		});

	const mockBinaryData = {
		data: 'base64-encoded-image',
		mimeType: 'image/png',
		fileName: 'data',
	};

	const b64Response = {
		data: [{ b64_json: Buffer.from('fake-image').toString('base64') }],
	};

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.helpers.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('v2.1 (static model field)', () => {
		beforeEach(() => {
			mockNode = makeNode(2.1);
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		});

		it('should read model as plain string and include response_format for dall-e-3', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = { model: 'dall-e-3', prompt: 'a cute cat', options: {} };
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ model: 'dall-e-3', response_format: 'b64_json' }),
			});
		});

		it('should not send response_format for gpt-image-1', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = { model: 'gpt-image-1', prompt: 'a cute cat', options: {} };
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ model: 'gpt-image-1', response_format: undefined }),
			});
		});
	});

	describe('v2.2 (RLC model field)', () => {
		beforeEach(() => {
			mockNode = makeNode(2.2);
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		});

		const makeRlcMock =
			(modelValue: string, extraOptions = {}) =>
			(paramName: string, _i: unknown, _default: unknown, opts?: { extractValue?: boolean }) => {
				if (paramName === 'modelId' && opts?.extractValue) return modelValue;
				const params = { prompt: 'a cute cat', options: extraOptions };
				return params[paramName as keyof typeof params];
			};

		it('should extract model value from RLC and include response_format for dall-e-3', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(makeRlcMock('dall-e-3'));

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ model: 'dall-e-3', response_format: 'b64_json' }),
			});
		});

		it('should not send response_format for gpt-image-1', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(makeRlcMock('gpt-image-1'));

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ model: 'gpt-image-1', response_format: undefined }),
			});
		});

		it('should not send response_format for gpt-image-1-mini', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(makeRlcMock('gpt-image-1-mini'));

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ model: 'gpt-image-1-mini', response_format: undefined }),
			});
		});
	});

	describe('response handling', () => {
		beforeEach(() => {
			mockNode = makeNode(2.2);
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		});

		const makeRlcMock =
			(modelValue: string, options = {}) =>
			(paramName: string, _i: unknown, _default: unknown, opts?: { extractValue?: boolean }) => {
				if (paramName === 'modelId' && opts?.extractValue) return modelValue;
				const params = { prompt: 'a cute cat', options };
				return params[paramName as keyof typeof params];
			};

		it('should return binary data by default', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(makeRlcMock('dall-e-3'));

			apiRequestSpy.mockResolvedValue(b64Response);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: expect.objectContaining({ data: undefined }),
					binary: { data: mockBinaryData },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should return URLs when returnImageUrls is true and model supports it', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				makeRlcMock('dall-e-3', { returnImageUrls: true }),
			);

			apiRequestSpy.mockResolvedValue({ data: [{ url: 'https://example.com/image.png' }] });

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ response_format: 'url' }),
			});
			expect(result).toEqual([
				{ json: { url: 'https://example.com/image.png' }, pairedItem: { item: 0 } },
			]);
		});

		it('should return binary even when returnImageUrls is true for gpt-image models', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				makeRlcMock('gpt-image-1-mini', { returnImageUrls: true }),
			);

			apiRequestSpy.mockResolvedValue(b64Response);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ response_format: undefined }),
			});
			expect(result[0].binary).toBeDefined();
		});

		it('should use custom binaryPropertyOutput field name', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				makeRlcMock('dall-e-3', { binaryPropertyOutput: 'myImage' }),
			);

			apiRequestSpy.mockResolvedValue(b64Response);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result[0].binary).toHaveProperty('myImage');
		});
	});

	describe('options processing', () => {
		beforeEach(() => {
			mockNode = makeNode(2.2);
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		});

		it('should rename dalleQuality to quality before sending', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _i: unknown, _default: unknown, opts?: { extractValue?: boolean }) => {
					if (paramName === 'modelId' && opts?.extractValue) return 'dall-e-3';
					const params = { prompt: 'a cute cat', options: { dalleQuality: 'hd' } };
					return params[paramName as keyof typeof params];
				},
			);

			apiRequestSpy.mockResolvedValue(b64Response);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({ quality: 'hd' }),
			});
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/images/generations',
				expect.objectContaining({
					body: expect.not.objectContaining({ dalleQuality: expect.anything() }),
				}),
			);
		});
	});
});
