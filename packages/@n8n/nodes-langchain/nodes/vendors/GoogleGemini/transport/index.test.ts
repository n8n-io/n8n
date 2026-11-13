import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { apiRequest, fileSearchStorePath, modelPath, resourcePath } from '.';

describe('GoogleGemini transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call httpRequestWithAuthentication with correct parameters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			host: 'https://custom-url.com',
		});

		await apiRequest.call(executeFunctionsMock, 'GET', requestPath`/v1beta/models`, {
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				foo: 'bar',
			},
			qs: {
				test: 123,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: requestUrl`https://custom-url.com/v1beta/models`,
				json: true,
				body: {
					foo: 'bar',
				},
				qs: {
					test: 123,
				},
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	});

	it('should use the default url if no custom url is provided', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', requestPath`/v1beta/models`);

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: requestUrl`https://generativelanguage.googleapis.com/v1beta/models`,
				json: true,
			},
		);
	});

	it('should send a full URL and return the full response', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(
			executeFunctionsMock,
			'GET',
			{ url: 'https://custom-url.com' },
			{ returnFullResponse: true },
		);

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: 'https://custom-url.com',
				json: true,
				returnFullResponse: true,
			},
		);
	});

	it('should encode path values that contain a slash', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(
			executeFunctionsMock,
			'GET',
			requestPath`/v1beta/fileSearchStores/${'store-1/models'}`,
		);

		expect(
			String(executeFunctionsMock.helpers.httpRequestWithAuthentication.mock.calls[0][1].url),
		).toBe('https://generativelanguage.googleapis.com/v1beta/fileSearchStores/store-1%2Fmodels');
	});

	describe('resourcePath', () => {
		it.each([
			['models/gemini-2.5-flash', '/models/gemini-2.5-flash'],
			['files/abc-123', '/files/abc-123'],
			[
				'models/veo-3.0-generate-002/operations/op-1',
				'/models/veo-3.0-generate-002/operations/op-1',
			],
			[
				'fileSearchStores/store-1/upload/operations/op-1',
				'/fileSearchStores/store-1/upload/operations/op-1',
			],
			['files/a?b#c', '/files/a%3Fb%23c'],
		])('should build the path of %s', (name, path) => {
			expect(resourcePath(name).toString()).toBe(path);
		});

		it.each(['files/..', 'models//x', ''])('should reject the resource name "%s"', (name) => {
			expect(() => resourcePath(name)).toThrow();
		});
	});

	describe('modelPath', () => {
		it.each([
			['models/gemini-2.5-flash', '/models/gemini-2.5-flash'],
			['tunedModels/my-model-1', '/tunedModels/my-model-1'],
		])('should build the path of %s', (model, path) => {
			expect(modelPath.call(executeFunctionsMock, model).toString()).toBe(path);
		});

		it.each([
			'files/abc',
			'fileSearchStores/abc',
			'gemini-2.5-flash',
			'models/x/operations/y',
			'models/',
		])('should reject the model "%s"', (model) => {
			expect(() => modelPath.call(executeFunctionsMock, model)).toThrow(NodeOperationError);
		});
	});

	describe('fileSearchStorePath', () => {
		it('should build the path of a File Search store', () => {
			expect(
				fileSearchStorePath.call(executeFunctionsMock, 'fileSearchStores/store-1').toString(),
			).toBe('/fileSearchStores/store-1');
		});

		it.each(['files/abc', 'models/gemini-2.5-flash', 'store-1', 'fileSearchStores/a/b'])(
			'should reject the File Search store name "%s"',
			(name) => {
				expect(() => fileSearchStorePath.call(executeFunctionsMock, name)).toThrow(
					NodeOperationError,
				);
			},
		);
	});
});
