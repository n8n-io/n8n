import nock from 'nock';

import * as create from '../../../actions/window/create.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'create',
	sessionId: 'test-session-123',
	url: 'https://example.com',
	getLiveView: false,
	disableResize: false,
	additionalFields: {},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string) {
			if (method === 'GET') {
				return {
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				};
			}
			return {
				status: 'success',
				data: {
					windowId: 'win-123',
				},
			};
		}),
	};
});

describe('Test Airtop, window create operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a window with minimal parameters', async () => {
		const result = await create.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						windowId: 'win-123',
					},
				},
			},
		]);
	});

	it('should create a window with live view', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it('should create a window with live view and disabled resize', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
			disableResize: true,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{ disableResize: true },
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it('should create a window with live view and navigation bar', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
			includeNavigationBar: true,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{ includeNavigationBar: true },
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it('should create a window with live view and screen resolution', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
			screenResolution: '1280x720',
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{ screenResolution: '1280x720' },
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it('should create a window with all live view options', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
			includeNavigationBar: true,
			screenResolution: '1920x1080',
			disableResize: true,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/test-session-123/windows',
			{
				url: 'https://example.com',
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{
				includeNavigationBar: true,
				screenResolution: '1920x1080',
				disableResize: true,
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it("should throw error when 'sessionId' parameter is empty", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it('should throw error when screen resolution format is invalid', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			getLiveView: true,
			screenResolution: 'invalid-format',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SCREEN_RESOLUTION_INVALID,
		);
	});
});
