import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import * as helpers from '@utils/helpers';

import * as file from './actions/file';
import * as image from './actions/image';
import * as prompt from './actions/prompt';
import * as text from './actions/text';
import * as utils from './helpers/utils';
import * as transport from './transport';
import type { File } from './helpers/interfaces';

describe('Anthropic Node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');
	const getConnectedToolsMock = jest.spyOn(helpers, 'getConnectedTools');
	const downloadFileMock = jest.spyOn(utils, 'downloadFile');
	const uploadFileMock = jest.spyOn(utils, 'uploadFile');
	const getBaseUrlMock = jest.spyOn(utils, 'getBaseUrl');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('Text -> Message', () => {
		it('should call the api with the correct parameters', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'messages.values':
						return [{ role: 'user', content: 'Hello, world!' }];
					case 'simplify':
						return true;
					case 'addAttachments':
						return false;
					case 'options':
						return {
							system: 'You are a helpful assistant.',
							codeExecution: true,
							webSearch: true,
							allowedDomains: 'https://example.com',
							maxTokens: 1024,
							temperature: 0.7,
							topP: 0.9,
							topK: 40,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
				stop_reason: 'end_turn',
			});

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'Hello! How can I help you today?',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					temperature: 0.7,
					top_p: 0.9,
					top_k: 40,
					system: 'You are a helpful assistant.',
					messages: [
						{
							role: 'user',
							content: 'Hello, world!',
						},
					],
					tools: [
						{
							type: 'code_execution_20250522',
							name: 'code_execution',
						},
						{
							type: 'web_search_20250305',
							name: 'web_search',
							allowed_domains: ['https://example.com'],
						},
					],
				},
				enableAnthropicBetas: {
					codeExecution: true,
				},
			});
		});

		it('should add code execution attachments', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'messages.values':
						return [{ role: 'user', content: 'Hello, world!' }];
					case 'simplify':
						return true;
					case 'addAttachments':
						return true;
					case 'attachmentsInputType':
						return 'url';
					case 'attachmentsUrls':
						return 'https://example.com/file.pdf';
					case 'options':
						return {
							codeExecution: true,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			getBaseUrlMock.mockResolvedValue('https://api.anthropic.com');
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('abcdefgh'),
				mimeType: 'application/pdf',
			});
			uploadFileMock.mockResolvedValue({
				id: 'file_123',
			} as File);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
				stop_reason: 'end_turn',
			});

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'Hello! How can I help you today?',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/file.pdf');
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('abcdefgh'), 'application/pdf');
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: 'Hello, world!',
						},
						{
							role: 'user',
							content: [
								{
									type: 'container_upload',
									file_id: 'file_123',
								},
							],
						},
					],
					tools: [
						{
							type: 'code_execution_20250522',
							name: 'code_execution',
						},
					],
				},
				enableAnthropicBetas: {
					codeExecution: true,
				},
			});
		});

		it('should add regular attachments', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'messages.values':
						return [{ role: 'user', content: 'Hello, world!' }];
					case 'simplify':
						return true;
					case 'addAttachments':
						return true;
					case 'attachmentsInputType':
						return 'url';
					case 'attachmentsUrls':
						return 'https://example.com/file.pdf';
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			getBaseUrlMock.mockResolvedValue('https://api.anthropic.com');
			executeFunctionsMock.helpers.httpRequest.mockResolvedValue({
				headers: {
					'content-type': 'application/pdf',
				},
			});
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
				stop_reason: 'end_turn',
			});

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'Hello! How can I help you today?',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(executeFunctionsMock.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'HEAD',
				url: 'https://example.com/file.pdf',
				returnFullResponse: true,
			});
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: 'Hello, world!',
						},
						{
							role: 'user',
							content: [
								{
									type: 'document',
									source: {
										type: 'url',
										url: 'https://example.com/file.pdf',
									},
								},
							],
						},
					],
					tools: [],
				},
				enableAnthropicBetas: {},
			});
		});
	});

	describe('File -> Upload', () => {
		it('should upload file from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'inputType':
						return 'url';
					case 'fileUrl':
						return 'https://example.com/file.pdf';
					case 'options.fileName':
						return 'test.pdf';
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({
				url: 'https://api.anthropic.com',
			});
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('test file content'),
				mimeType: 'application/pdf',
			});
			uploadFileMock.mockResolvedValue({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: 'test.pdf',
				id: 'file_123',
				mime_type: 'application/pdf',
				size_bytes: 17,
				type: 'file',
			});

			const result = await file.upload.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						created_at: '2025-01-01T10:00:00Z',
						downloadable: true,
						filename: 'test.pdf',
						id: 'file_123',
						mime_type: 'application/pdf',
						size_bytes: 17,
						type: 'file',
						url: 'https://api.anthropic.com/v1/files/file_123',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/file.pdf');
			expect(uploadFileMock).toHaveBeenCalledWith(
				Buffer.from('test file content'),
				'application/pdf',
				'test.pdf',
			);
		});

		it('should upload file from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'options.fileName':
						return 'file';
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({});
			const mockBinaryData: IBinaryData = {
				mimeType: 'application/pdf',
				fileName: 'test.pdf',
				fileSize: '1024',
				fileExtension: 'pdf',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(
				Buffer.from('test file content'),
			);
			uploadFileMock.mockResolvedValue({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: 'file',
				id: 'file_456',
				mime_type: 'application/pdf',
				size_bytes: 17,
				type: 'file',
			});

			const result = await file.upload.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						created_at: '2025-01-01T10:00:00Z',
						downloadable: true,
						filename: 'file',
						id: 'file_456',
						mime_type: 'application/pdf',
						size_bytes: 17,
						type: 'file',
						url: 'https://api.anthropic.com/v1/files/file_456',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(uploadFileMock).toHaveBeenCalledWith(
				Buffer.from('test file content'),
				'application/pdf',
				'file',
			);
		});
	});

	describe('File -> List', () => {
		it('should list files with a limit', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'returnAll':
						return false;
					case 'limit':
						return 10;
					default:
						return undefined;
				}
			});
			getBaseUrlMock.mockResolvedValue('https://api.anthropic.com');
			apiRequestMock.mockResolvedValue({
				data: [
					{
						id: 'file_123',
						filename: 'test.pdf',
						mime_type: 'application/pdf',
					},
					{
						id: 'file_456',
						filename: 'test.png',
						mime_type: 'image/png',
					},
				],
				first_id: '',
				last_id: '',
				has_more: false,
			});

			const result = await file.list.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						id: 'file_123',
						filename: 'test.pdf',
						mime_type: 'application/pdf',
						url: 'https://api.anthropic.com/v1/files/file_123',
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						id: 'file_456',
						filename: 'test.png',
						mime_type: 'image/png',
						url: 'https://api.anthropic.com/v1/files/file_456',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/v1/files', {
				qs: {
					limit: 10,
				},
			});
		});

		it('should list all files', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'returnAll':
						return true;
					default:
						return undefined;
				}
			});
			getBaseUrlMock.mockResolvedValue('https://api.anthropic.com');
			apiRequestMock.mockResolvedValueOnce({
				data: [
					{
						id: 'file_001',
						filename: 'test-1.pdf',
						mime_type: 'application/pdf',
					},
					{
						id: 'file_002',
						filename: 'test-2.pdf',
						mime_type: 'application/pdf',
					},
				],
				first_id: 'file_001',
				last_id: 'file_002',
				has_more: true,
			});
			apiRequestMock.mockResolvedValueOnce({
				data: [
					{
						id: 'file_003',
						filename: 'test-3.pdf',
						mime_type: 'application/pdf',
					},
				],
				first_id: 'file_003',
				last_id: 'file_003',
				has_more: false,
			});

			const result = await file.list.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						id: 'file_001',
						filename: 'test-1.pdf',
						mime_type: 'application/pdf',
						url: 'https://api.anthropic.com/v1/files/file_001',
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						id: 'file_002',
						filename: 'test-2.pdf',
						mime_type: 'application/pdf',
						url: 'https://api.anthropic.com/v1/files/file_002',
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						id: 'file_003',
						filename: 'test-3.pdf',
						mime_type: 'application/pdf',
						url: 'https://api.anthropic.com/v1/files/file_003',
					},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('File -> Delete', () => {
		it('should delete file', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'fileId':
						return 'file_123';
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				id: 'file_123',
			});

			const result = await file.deleteFile.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([{ json: { id: 'file_123' }, pairedItem: { item: 0 } }]);
			expect(apiRequestMock).toHaveBeenCalledWith('DELETE', '/v1/files/file_123');
		});
	});

	describe('File -> Get', () => {
		it('should get file', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'fileId':
						return 'file_123';
					default:
						return undefined;
				}
			});
			getBaseUrlMock.mockResolvedValue('https://api.anthropic.com');
			apiRequestMock.mockResolvedValue({
				id: 'file_123',
				filename: 'test.pdf',
				mime_type: 'application/pdf',
			});

			const result = await file.get.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						id: 'file_123',
						filename: 'test.pdf',
						mime_type: 'application/pdf',
						url: 'https://api.anthropic.com/v1/files/file_123',
					},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('Image -> Analyze', () => {
		it('should analyze image from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'inputType':
						return 'url';
					case 'imageUrls':
						return 'https://example.com/image.png';
					case 'text':
						return "What's in this image?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxTokens: 1024,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({});
			apiRequestMock.mockResolvedValue({
				content: [
					{
						type: 'text',
						text: 'This image shows a beautiful sunset over a mountain landscape.',
					},
				],
				stop_reason: 'end_turn',
			});

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'This image shows a beautiful sunset over a mountain landscape.',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'image',
									source: {
										type: 'url',
										url: 'https://example.com/image.png',
									},
								},
								{
									type: 'text',
									text: "What's in this image?",
								},
							],
						},
					],
				},
			});
		});

		it('should analyze image from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'text':
						return "What's in this image?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxTokens: 1024,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({});
			const mockBinaryData: IBinaryData = {
				mimeType: 'image/png',
				fileName: 'test.png',
				fileSize: '2048',
				fileExtension: 'png',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(
				Buffer.from('test image data'),
			);
			apiRequestMock.mockResolvedValue({
				content: [
					{
						type: 'text',
						text: 'This image shows a beautiful sunset over a mountain landscape.',
					},
				],
				stop_reason: 'end_turn',
			});

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'This image shows a beautiful sunset over a mountain landscape.',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'image',
									source: {
										type: 'base64',
										media_type: 'image/png',
										data: 'dGVzdCBpbWFnZSBkYXRh',
									},
								},
								{
									type: 'text',
									text: "What's in this image?",
								},
							],
						},
					],
				},
			});
		});

		it('should analyze image from Anthropic file URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'claude-sonnet-4-20250514';
					case 'inputType':
						return 'url';
					case 'imageUrls':
						return 'https://api.anthropic.com/v1/files/file_123';
					case 'text':
						return "What's in this image?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxTokens: 1024,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({});
			apiRequestMock.mockResolvedValue({
				content: [
					{
						type: 'text',
						text: 'This image shows a beautiful sunset over a mountain landscape.',
					},
				],
				stop_reason: 'end_turn',
			});

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: [
							{
								type: 'text',
								text: 'This image shows a beautiful sunset over a mountain landscape.',
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/messages', {
				body: {
					model: 'claude-sonnet-4-20250514',
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'image',
									source: {
										type: 'file',
										file_id: 'file_123',
									},
								},
								{
									type: 'text',
									text: "What's in this image?",
								},
							],
						},
					],
				},
			});
		});
	});

	describe('Prompt -> Generate', () => {
		it('should generate prompt from task description', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'task':
						return 'A chef for a meal prep planning service';
					case 'simplify':
						return true;
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: 'Plan a healthy weekly meal prep menu for busy professionals',
					},
				],
				system:
					'You are a professional chef specializing in meal prep services for busy professionals. Create balanced, nutritious, and convenient meal plans.',
			});

			const result = await prompt.generate.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						messages: [
							{
								role: 'user',
								content: 'Plan a healthy weekly meal prep menu for busy professionals',
							},
						],
						system:
							'You are a professional chef specializing in meal prep services for busy professionals. Create balanced, nutritious, and convenient meal plans.',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/experimental/generate_prompt', {
				body: {
					task: 'A chef for a meal prep planning service',
				},
				enableAnthropicBetas: {
					promptTools: true,
				},
			});
		});
	});

	describe('Prompt -> Improve', () => {
		it('should improve existing prompt with feedback', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'messages.values':
						return [
							{
								role: 'user',
								content: 'Plan meals for the week',
							},
						];
					case 'simplify':
						return true;
					case 'options':
						return {
							system: 'You are a chef',
							feedback: 'Make it more detailed and include cooking times',
						};
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content:
							'Plan a detailed weekly meal prep menu with cooking times and nutritional information for busy professionals',
					},
				],
				system:
					'You are a professional chef and nutritionist specializing in meal prep services. Provide detailed cooking instructions, prep times, and nutritional breakdowns.',
			});

			const result = await prompt.improve.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						messages: [
							{
								role: 'user',
								content:
									'Plan a detailed weekly meal prep menu with cooking times and nutritional information for busy professionals',
							},
						],
						system:
							'You are a professional chef and nutritionist specializing in meal prep services. Provide detailed cooking instructions, prep times, and nutritional breakdowns.',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/experimental/improve_prompt', {
				body: {
					messages: [
						{
							role: 'user',
							content: 'Plan meals for the week',
						},
					],
					system: 'You are a chef',
					feedback: 'Make it more detailed and include cooking times',
				},
				enableAnthropicBetas: {
					promptTools: true,
				},
			});
		});
	});

	describe('Prompt -> Templatize', () => {
		it('should templatize prompt with variables', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'messages.values':
						return [
							{
								role: 'user',
								content: 'Translate hello to German',
							},
						];
					case 'simplify':
						return true;
					case 'options':
						return {
							system: 'You are a professional English to German translator',
						};
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: 'Translate {{WORD}} to {{TARGET_LANGUAGE}}',
					},
				],
				system: 'You are a professional {{SOURCE_LANGUAGE}} to {{TARGET_LANGUAGE}} translator',
				variable_values: {
					WORD: 'hello',
					TARGET_LANGUAGE: 'German',
					SOURCE_LANGUAGE: 'English',
				},
			});

			const result = await prompt.templatize.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						messages: [
							{
								role: 'user',
								content: 'Translate {{WORD}} to {{TARGET_LANGUAGE}}',
							},
						],
						system: 'You are a professional {{SOURCE_LANGUAGE}} to {{TARGET_LANGUAGE}} translator',
						variable_values: {
							WORD: 'hello',
							TARGET_LANGUAGE: 'German',
							SOURCE_LANGUAGE: 'English',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/experimental/templatize_prompt', {
				body: {
					messages: [
						{
							role: 'user',
							content: 'Translate hello to German',
						},
					],
					system: 'You are a professional English to German translator',
				},
				enableAnthropicBetas: {
					promptTools: true,
				},
			});
		});
	});
});
