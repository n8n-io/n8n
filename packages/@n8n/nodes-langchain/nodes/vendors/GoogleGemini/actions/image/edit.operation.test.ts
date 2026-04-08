import { mock, mockDeep } from 'jest-mock-extended';
import type { IBinaryData, ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow';

import { execute } from './edit.operation';

const getMockedExecuteFunctions = ({
	prompt = 'add bananas',
	outputProperty = 'edited',
	images = { values: [{ binaryPropertyName: 'data' }] },
	outputBuffer = Buffer.from('edited image'),
	mimeType = 'image/png',
	invalidApiResponse = false,
}: {
	prompt?: string;
	outputProperty?: string;
	images?: { values: Array<{ binaryPropertyName: string }> };
	outputBuffer?: Buffer<ArrayBuffer>;
	mimeType?: string;
	invalidApiResponse?: boolean;
} = {}): IExecuteFunctions => {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	executeFunctions.getCredentials
		.calledWith('googlePalmApi')
		.mockResolvedValue(mock<ICredentialDataDecryptedObject>());
	executeFunctions.getNodeParameter.calledWith('prompt', 0).mockReturnValue(prompt);
	executeFunctions.getNodeParameter
		.calledWith('options.binaryPropertyOutput', 0)
		.mockReturnValue(outputProperty);
	executeFunctions.getNodeParameter.calledWith('images', 0).mockReturnValue(images);
	executeFunctions.helpers.assertBinaryData.mockReturnValue(mock<IBinaryData>({ mimeType }));
	executeFunctions.helpers.getBinaryDataBuffer.mockImplementation(async (_index, propertyName) =>
		Buffer.from(`${propertyName} data`),
	);
	executeFunctions.helpers.prepareBinaryData.mockImplementation(async (buffer, filename, mime) => ({
		data: (buffer as Buffer).toString('base64'),
		fileName: filename ?? 'image.png',
		fileSize: (buffer as Buffer).length.toString(),
		mimeType: mime ?? mimeType,
	}));

	executeFunctions.helpers.httpRequest
		.calledWith(
			expect.objectContaining({
				url: expect.stringContaining('/upload/v1beta/files'),
			}),
		)
		.mockResolvedValue({
			headers: { 'x-goog-upload-url': 'https://mock-upload-url.com' },
		});

	executeFunctions.helpers.httpRequestWithAuthentication
		.calledWith(
			'googlePalmApi',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-Goog-Upload-Protocol': expect.any(String) }),
			}),
		)
		.mockResolvedValue({
			headers: { 'x-goog-upload-url': 'https://mock-upload-url.com' },
		});

	executeFunctions.helpers.httpRequestWithAuthentication
		.calledWith(
			'googlePalmApi',
			expect.objectContaining({
				url: expect.stringContaining('generateContent'),
			}),
		)
		.mockResolvedValue(
			invalidApiResponse
				? { invalid: 'response' }
				: {
						candidates: [
							{
								content: {
									parts: [{ inlineData: { data: outputBuffer.toString('base64'), mimeType } }],
								},
							},
						],
					},
		);

	executeFunctions.helpers.httpRequest
		.calledWith(
			expect.objectContaining({
				method: 'POST',
				url: expect.stringContaining('mock-upload-url'),
			}),
		)
		.mockResolvedValue({
			file: { name: 'files/test', uri: 'mockFileUri', mimeType, state: 'ACTIVE' },
		});

	return executeFunctions;
};

describe('Gemini Node image edit', () => {
	it('should edit an image successfully', async () => {
		const executeFunctions = getMockedExecuteFunctions();

		const result = await execute.call(executeFunctions, 0);

		expect(result).toEqual([
			{
				binary: {
					edited: {
						data: 'ZWRpdGVkIGltYWdl',
						fileName: 'image.png',
						fileSize: '12',
						mimeType: 'image/png',
					},
				},
				json: { fileName: 'image.png', fileSize: '12', mimeType: 'image/png', data: undefined },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should handle custom output property name', async () => {
		const executeFunctions = getMockedExecuteFunctions({
			prompt: 'edit this image',
			outputProperty: 'custom_output',
		});

		const result = await execute.call(executeFunctions, 0);

		expect(result[0].binary).toHaveProperty('custom_output');
		expect(result[0].binary).not.toHaveProperty('edited');
	});

	it('should handle multiple images', async () => {
		const multiImageConfig = {
			values: [{ binaryPropertyName: 'image1' }, { binaryPropertyName: 'image2' }],
		};

		const executeFunctions = getMockedExecuteFunctions({
			prompt: 'combine images',
			outputProperty: 'combined',
			images: multiImageConfig,
			outputBuffer: Buffer.from('combined image'),
		});

		const result = await execute.call(executeFunctions, 0);

		expect(result[0].binary).toHaveProperty('combined');
	});

	it('should throw error for invalid images parameter', async () => {
		const executeFunctions = getMockedExecuteFunctions(
			{ prompt: 'test prompt', outputProperty: 'edited', images: { values: 'invalid' as never } }, // Invalid format
		);

		await expect(execute.call(executeFunctions, 0)).rejects.toThrow(
			'Invalid images parameter format',
		);
	});

	it('should throw error when no image data returned from API', async () => {
		const executeFunctions = getMockedExecuteFunctions(
			{
				prompt: 'test prompt',
				outputProperty: 'edited',
				images: { values: [{ binaryPropertyName: 'data' }] },
				outputBuffer: Buffer.from(''),
			}, // Empty buffer to trigger error
		);

		await expect(execute.call(executeFunctions, 0)).rejects.toThrow(
			'No image data returned from Gemini API',
		);
	});

	it('should throw error for invalid API response format', async () => {
		const executeFunctions = getMockedExecuteFunctions({
			prompt: 'test prompt',
			outputProperty: 'edited',
			images: { values: [{ binaryPropertyName: 'data' }] },
			invalidApiResponse: true,
		});

		await expect(execute.call(executeFunctions, 0)).rejects.toThrow(
			'Invalid response format from Gemini API',
		);
	});

	it('should handle empty prompt', async () => {
		const executeFunctions = getMockedExecuteFunctions({ prompt: '' });

		const result = await execute.call(executeFunctions, 0);

		expect(result).toEqual([
			{
				binary: {
					edited: {
						data: 'ZWRpdGVkIGltYWdl',
						fileName: 'image.png',
						fileSize: '12',
						mimeType: 'image/png',
					},
				},
				json: { fileName: 'image.png', fileSize: '12', mimeType: 'image/png', data: undefined },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should handle different MIME types', async () => {
		const executeFunctions = getMockedExecuteFunctions({
			prompt: 'enhance image',
			outputProperty: 'enhanced',
			images: { values: [{ binaryPropertyName: 'data' }] },
			outputBuffer: Buffer.from('enhanced jpeg'),
			mimeType: 'image/jpeg',
		});

		const result = await execute.call(executeFunctions, 0);

		expect(result[0]?.binary?.enhanced?.mimeType).toBe('image/jpeg');
		expect(result[0]?.json?.mimeType).toBe('image/jpeg');
	});

	it('should handle empty images array when no valid binary property names', async () => {
		const executeFunctions = getMockedExecuteFunctions({
			prompt: 'test prompt',
			outputProperty: 'edited',
			images: { values: [{ binaryPropertyName: '' }] },
			outputBuffer: Buffer.from('no image response'),
		});

		const result = await execute.call(executeFunctions, 0);

		expect(result).toEqual([
			{
				binary: {
					edited: {
						data: 'bm8gaW1hZ2UgcmVzcG9uc2U=',
						fileName: 'image.png',
						fileSize: '17',
						mimeType: 'image/png',
					},
				},
				json: { fileName: 'image.png', fileSize: '17', mimeType: 'image/png', data: undefined },
				pairedItem: { item: 0 },
			},
		]);
	});
});
