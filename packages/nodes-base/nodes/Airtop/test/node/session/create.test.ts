import * as create from '../../../actions/session/create.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				sessionId: 'test-session-123',
				status: 'success',
			};
		}),
	};
});

describe('Test Airtop, session create operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a session with minimal parameters', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
			proxy: 'none',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 10,
					proxy: false,
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});

	it('should create a session with save profile enabled', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 15,
			saveProfileOnTermination: true,
			proxy: 'none',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 15,
					proxy: false,
				},
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'PUT',
			'/sessions/test-session-123/save-profile-on-termination/test-profile',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});

	it('should create a session with integrated proxy', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
			proxy: 'integrated',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 10,
					proxy: true,
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});

	it('should create a session with custom proxy', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
			proxy: 'custom',
			proxyUrl: 'http://proxy.example.com:8080',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 10,
					proxy: 'http://proxy.example.com:8080',
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});

	it('should throw error when custom proxy URL is invalid', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
			proxy: 'custom',
			proxyUrl: 'invalid-url',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.PROXY_URL_INVALID,
		);
	});

	it('should throw error when custom proxy URL is empty', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
			proxy: 'custom',
			proxyUrl: '',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.PROXY_URL_REQUIRED,
		);
	});
});
