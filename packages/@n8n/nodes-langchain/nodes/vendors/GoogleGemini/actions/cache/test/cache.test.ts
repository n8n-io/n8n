import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as cache from '../index';
import * as transport from '../../../transport';

describe('GoogleGemini Node - Cache', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Cache -> Create', () => {
		it('should create cached content', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-1.5-flash-001';
					case 'ttl':
						return 600;
					case 'messages.values':
						return [{ type: 'text', role: 'user', content: 'Huge context...' }];
					case 'options':
						return { systemInstruction: 'Be concise', displayName: 'My Cache' };
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({
				name: 'cachedContents/12345',
				model: 'models/gemini-1.5-flash-001',
				ttl: '600s',
			});

			const result = await cache.create.execute.call(executeFunctionsMock, 0);

			expect(result[0].json).toEqual({
				name: 'cachedContents/12345',
				model: 'models/gemini-1.5-flash-001',
				ttl: '600s',
			});

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/cachedContents',
				expect.objectContaining({
					body: {
						model: 'models/gemini-1.5-flash-001',
						ttl: '600s',
						contents: [
							{
								role: 'user',
								parts: [{ text: 'Huge context...' }],
							},
						],
						systemInstruction: {
							parts: [{ text: 'Be concise' }],
						},
						displayName: 'My Cache',
					},
				}),
			);
		});

		it('should create cached content with file', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-1.5-flash-001';
					case 'ttl':
						return 600;
					case 'messages.values':
						return [
							{
								type: 'file',
								fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc',
								mimeType: 'image/png',
								role: 'user',
							},
						];
					case 'options':
						return {};
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({
				name: 'cachedContents/123456',
			});

			await cache.create.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/cachedContents',
				expect.objectContaining({
					body: expect.objectContaining({
						contents: [
							{
								role: 'user',
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc',
											mimeType: 'image/png',
										},
									},
								],
							},
						],
					}),
				}),
			);
		});
	});

	describe('Cache -> Update', () => {
		it('should update cached content TTL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'cachedContentName':
						return 'cachedContents/12345';
					case 'ttl':
						return 1200;
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({
				name: 'cachedContents/12345',
				ttl: '1200s',
			});

			const result = await cache.update.execute.call(executeFunctionsMock, 0);

			expect(result[0].json).toEqual({
				name: 'cachedContents/12345',
				ttl: '1200s',
			});

			expect(apiRequestMock).toHaveBeenCalledWith(
				'PATCH',
				'/v1beta/cachedContents/12345',
				expect.objectContaining({
					body: {
						ttl: '1200s',
					},
					qs: {
						updateMask: 'ttl',
					},
				}),
			);
		});
	});

	describe('Cache -> Get', () => {
		it('should get cached content', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'cachedContentName':
						return 'cachedContents/12345';
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({
				name: 'cachedContents/12345',
			});

			const result = await cache.get.execute.call(executeFunctionsMock, 0);

			expect(result[0].json).toEqual({
				name: 'cachedContents/12345',
			});

			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/v1beta/cachedContents/12345');
		});
	});

	describe('Cache -> List', () => {
		it('should list cached contents', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'pageSize':
						return 10;
					case 'pageToken':
						return '';
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({
				cachedContents: [],
			});

			const result = await cache.list.execute.call(executeFunctionsMock, 0);

			expect(result[0].json).toEqual({
				cachedContents: [],
			});

			expect(apiRequestMock).toHaveBeenCalledWith(
				'GET',
				'/v1beta/cachedContents',
				expect.objectContaining({
					qs: { pageSize: 10 },
				}),
			);
		});
	});

	describe('Cache -> Delete', () => {
		it('should delete cached content', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'cachedContentName':
						return 'cachedContents/12345';
					default:
						return undefined;
				}
			});

			apiRequestMock.mockResolvedValue({});

			const result = await cache.delete.execute.call(executeFunctionsMock, 0);

			expect(result[0].json).toEqual({
				success: true,
			});

			expect(apiRequestMock).toHaveBeenCalledWith('DELETE', '/v1beta/cachedContents/12345');
		});
	});
});
