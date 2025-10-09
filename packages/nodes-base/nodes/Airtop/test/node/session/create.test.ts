import * as create from '../../../actions/session/create.operation';
import { ERROR_MESSAGES, SESSION_STATUS } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const mockCreatedSession = {
	data: { id: 'test-session-123', status: SESSION_STATUS.RUNNING },
};

const baseNodeParameters = {
	resource: 'session',
	operation: 'create',
	profileName: 'test-profile',
	timeoutMinutes: 10,
	saveProfileOnTermination: false,
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				...mockCreatedSession,
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
	/**
	 * Minimal parameters
	 */
	it('should create a session with minimal parameters', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			proxy: 'none',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: false,
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});
	/**
	 * Profiles
	 */
	it('should create a session with save profile enabled', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			saveProfileOnTermination: true,
			proxy: 'none',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(1, 'POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: false,
			},
		});
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'PUT',
			'/sessions/test-session-123/save-profile-on-termination/test-profile',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});
	/**
	 * Proxy
	 */
	it('should create a session with integrated proxy and empty config', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			proxy: 'integrated',
			proxyConfig: {}, // simulate integrated proxy with empty config
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: true,
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});

	it('should create a session with integrated proxy and proxy configuration', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			proxy: 'integrated',
			proxyConfig: { country: 'US', sticky: true },
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: { country: 'US', sticky: true },
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});

	it('should create a session with proxy URL', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			proxy: 'proxyUrl',
			proxyUrl: 'http://proxy.example.com:8080',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: 'http://proxy.example.com:8080',
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});

	it('should throw error when custom proxy URL is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			proxy: 'proxyUrl',
			proxyUrl: '',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.PROXY_URL_REQUIRED,
		);
	});
	/**
	 * Auto solve captcha
	 */
	it('should create a session with auto solve captcha enabled', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				solveCaptcha: true,
			},
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: true,
				timeoutMinutes: 10,
				proxy: false,
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});
	/**
	 * Chrome extensions
	 */
	it('should create a session with chrome extensions enabled', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				extensionIds: 'extId1, extId2',
			},
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/sessions', {
			configuration: {
				profileName: 'test-profile',
				solveCaptcha: false,
				timeoutMinutes: 10,
				proxy: false,
				extensionIds: ['extId1', 'extId2'],
			},
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: { ...mockCreatedSession.data },
				},
			},
		]);
	});
});
