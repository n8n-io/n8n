import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import get from 'lodash/get';
import * as assistant from '../actions/assistant';
import * as audio from '../actions/audio';
import * as file from '../actions/file';
import * as image from '../actions/image';
import * as text from '../actions/text';

import * as transport from '../transport';

const createExecuteFunctionsMock = (parameters: IDataObject) => {
	const nodeParameters = parameters;
	return {
		getNodeParameter(parameter: string) {
			return get(nodeParameters, parameter);
		},
		getNode() {
			return {};
		},
		getInputConnectionData() {
			return undefined;
		},
		helpers: {
			prepareBinaryData() {
				return {};
			},
			assertBinaryData() {
				return {
					filename: 'filenale.flac',
					contentType: 'audio/flac',
				};
			},
			getBinaryDataBuffer() {
				return 'data buffer data';
			},
		},
	} as unknown as IExecuteFunctions;
};

describe('OpenAi, Assistant resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('create => should throw an error if an assistant with the same name already exists', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			data: [{ name: 'name' }],
			has_more: false,
		});

		try {
			await assistant.create.execute.call(
				createExecuteFunctionsMock({
					name: 'name',
					options: {
						failIfExists: true,
					},
				}),
				0,
			);
			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe("An assistant with the same name 'name' already exists");
		}
	});

	it('create => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.create.execute.call(
			createExecuteFunctionsMock({
				modelId: 'gpt-model',
				name: 'name',
				description: 'description',
				instructions: 'some instructions',
				codeInterpreter: true,
				knowledgeRetrieval: true,
				file_ids: [],
				options: {},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/assistants', {
			body: {
				description: 'description',
				instructions: 'some instructions',
				model: 'gpt-model',
				name: 'name',
				tool_resources: {
					code_interpreter: {
						file_ids: [],
					},
					file_search: {
						vector_stores: [
							{
								file_ids: [],
							},
						],
					},
				},
				tools: [{ type: 'code_interpreter' }, { type: 'file_search' }],
			},
			headers: { 'OpenAI-Beta': 'assistants=v2' },
		});
	});

	it('create => should throw error if more then 20 files selected', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		try {
			await assistant.create.execute.call(
				createExecuteFunctionsMock({
					file_ids: Array.from({ length: 25 }),
					options: {},
				}),
				0,
			);
			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe(
				'The maximum number of files that can be attached to the assistant is 20',
			);
		}
	});

	it('delete => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.deleteAssistant.execute.call(
			createExecuteFunctionsMock({
				assistantId: 'assistant-id',
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', '/assistants/assistant-id', {
			headers: { 'OpenAI-Beta': 'assistants=v2' },
		});
	});

	it('list => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			data: [
				{ name: 'name1', id: 'id-1', model: 'gpt-model', other: 'other' },
				{ name: 'name2', id: 'id-2', model: 'gpt-model', other: 'other' },
				{ name: 'name3', id: 'id-3', model: 'gpt-model', other: 'other' },
			],
			has_more: false,
		});

		const response = await assistant.list.execute.call(
			createExecuteFunctionsMock({
				simplify: true,
			}),
			0,
		);

		expect(response).toEqual([
			{
				json: { name: 'name1', id: 'id-1', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
			{
				json: { name: 'name2', id: 'id-2', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
			{
				json: { name: 'name3', id: 'id-3', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('update => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			tools: [{ type: 'existing_tool' }],
		});
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.update.execute.call(
			createExecuteFunctionsMock({
				assistantId: 'assistant-id',
				options: {
					modelId: 'gpt-model',
					name: 'name',
					instructions: 'some instructions',
					codeInterpreter: true,
					knowledgeRetrieval: true,
					file_ids: [],
					removeCustomTools: false,
				},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', '/assistants/assistant-id', {
			headers: { 'OpenAI-Beta': 'assistants=v2' },
		});
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/assistants/assistant-id', {
			body: {
				instructions: 'some instructions',
				model: 'gpt-model',
				name: 'name',
				tool_resources: {
					code_interpreter: {
						file_ids: [],
					},
					file_search: {
						vector_stores: [
							{
								file_ids: [],
							},
						],
					},
				},
				tools: [{ type: 'existing_tool' }, { type: 'code_interpreter' }, { type: 'file_search' }],
			},
			headers: { 'OpenAI-Beta': 'assistants=v2' },
		});
	});
});

describe('OpenAi, Audio resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('generate => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		const returnData = await audio.generate.execute.call(
			createExecuteFunctionsMock({
				model: 'tts-model',
				input: 'input',
				voice: 'fable',
				options: {
					response_format: 'flac',
					speed: 1.25,
					binaryPropertyOutput: 'myData',
				},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].binary?.myData).toBeDefined();
		expect(returnData[0].pairedItem).toBeDefined();

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/audio/speech', {
			body: {
				input: 'input',
				model: 'tts-model',
				response_format: 'flac',
				speed: 1.25,
				voice: 'fable',
			},
			option: { encoding: 'arraybuffer', json: false, returnFullResponse: true, useStream: true },
		});
	});

	it('transcribe => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ text: 'transcribtion' });

		const returnData = await audio.transcribe.execute.call(
			createExecuteFunctionsMock({
				binaryPropertyName: 'myData',
				options: {
					language: 'en',
					temperature: 1.1,
				},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData[0].json).toEqual({ text: 'transcribtion' });

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/audio/transcriptions',
			expect.objectContaining({
				headers: { 'Content-Type': 'multipart/form-data' },
			}),
		);
	});

	it('translate => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ text: 'translations' });

		const returnData = await audio.translate.execute.call(
			createExecuteFunctionsMock({
				binaryPropertyName: 'myData',
				options: {},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData[0].json).toEqual({ text: 'translations' });

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/audio/translations',
			expect.objectContaining({
				headers: { 'Content-Type': 'multipart/form-data' },
			}),
		);
	});
});

describe('OpenAi, File resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('deleteFile => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await file.deleteFile.execute.call(
			createExecuteFunctionsMock({
				fileId: 'file-id',
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', '/files/file-id');
	});

	it('list => should return list of files', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			data: [{ file: 'file1' }, { file: 'file2' }, { file: 'file3' }],
		});

		const returnData = await file.list.execute.call(createExecuteFunctionsMock({ options: {} }), 2);

		expect(returnData.length).toEqual(3);
		expect(returnData).toEqual([
			{
				json: { file: 'file1' },
				pairedItem: { item: 2 },
			},
			{
				json: { file: 'file2' },
				pairedItem: { item: 2 },
			},
			{
				json: { file: 'file3' },
				pairedItem: { item: 2 },
			},
		]);
	});

	it('upload => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });

		const returnData = await file.upload.execute.call(
			createExecuteFunctionsMock({
				binaryPropertyName: 'myData',
				options: {},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData[0].json).toEqual({ success: true });

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/files',
			expect.objectContaining({
				headers: { 'Content-Type': 'multipart/form-data' },
			}),
		);
	});
});

describe('OpenAi, Image resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('generate => should call apiRequest with correct parameters, return binary', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ data: [{ b64_json: 'image1' }] });

		const returnData = await image.generate.execute.call(
			createExecuteFunctionsMock({
				model: 'dall-e-3',
				prompt: 'cat with a hat',
				options: {
					size: '1024x1024',
					style: 'vivid',
					quality: 'hd',
					binaryPropertyOutput: 'myData',
				},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].binary?.myData).toBeDefined();
		expect(returnData[0].pairedItem).toBeDefined();

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/images/generations', {
			body: {
				model: 'dall-e-3',
				prompt: 'cat with a hat',
				quality: 'hd',
				response_format: 'b64_json',
				size: '1024x1024',
				style: 'vivid',
			},
		});
	});

	it('generate => should call apiRequest with correct parameters, return urls', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ data: [{ url: 'image-url' }] });

		const returnData = await image.generate.execute.call(
			createExecuteFunctionsMock({
				model: 'dall-e-3',
				prompt: 'cat with a hat',
				options: {
					size: '1024x1024',
					style: 'vivid',
					quality: 'hd',
					binaryPropertyOutput: 'myData',
					returnImageUrls: true,
				},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData).toEqual([{ json: { url: 'image-url' }, pairedItem: { item: 0 } }]);

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/images/generations', {
			body: {
				model: 'dall-e-3',
				prompt: 'cat with a hat',
				quality: 'hd',
				response_format: 'url',
				size: '1024x1024',
				style: 'vivid',
			},
		});
	});

	it('analyze => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });

		const returnData = await image.analyze.execute.call(
			createExecuteFunctionsMock({
				text: 'image text',
				inputType: 'url',
				imageUrls: 'image-url1, image-url2',
				options: {
					detail: 'low',
				},
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData[0].json).toEqual({ success: true });

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/chat/completions', {
			body: {
				max_tokens: 300,
				messages: [
					{
						content: [
							{ text: 'image text', type: 'text' },
							{ image_url: { detail: 'low', url: 'image-url1' }, type: 'image_url' },
							{ image_url: { detail: 'low', url: 'image-url2' }, type: 'image_url' },
						],
						role: 'user',
					},
				],
				model: 'gpt-4-vision-preview',
			},
		});
	});
});

describe('OpenAi, Text resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('classify => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({ results: [{ flagged: true }] });

		const returnData = await text.classify.execute.call(
			createExecuteFunctionsMock({
				input: 'input',
				options: { useStableModel: true },
			}),
			0,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].pairedItem).toBeDefined();
		expect(returnData[0].json).toEqual({ flagged: true });

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/moderations', {
			body: { input: 'input', model: 'text-moderation-stable' },
		});
	});

	it('message => should call apiRequest with correct parameters, no tool call', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			choices: [{ message: { tool_calls: undefined } }],
		});

		await text.message.execute.call(
			createExecuteFunctionsMock({
				modelId: 'gpt-model',
				messages: {
					values: [{ role: 'user', content: 'message' }],
				},

				options: {},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/chat/completions', {
			body: {
				messages: [{ content: 'message', role: 'user' }],
				model: 'gpt-model',
				response_format: undefined,
				tools: undefined,
			},
		});
	});
});
