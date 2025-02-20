import nock from 'nock';

import * as create from '../../../actions/window/create.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

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
		const nodeParameters = {
			resource: 'window',
			operation: 'create',
			sessionId: 'test-session-123',
			url: 'https://example.com',
			getLiveView: false,
			additionalFields: {},
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

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
					sessionId: 'test-session-123',
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
			resource: 'window',
			operation: 'create',
			sessionId: 'test-session-123',
			url: 'https://example.com',
			getLiveView: true,
			additionalFields: {},
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
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: {
						liveViewUrl: 'https://live.airtop.ai/123-abcd',
					},
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			resource: 'window',
			operation: 'create',
			sessionId: '',
			url: 'https://example.com',
		};

		await expect(create.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});
});
