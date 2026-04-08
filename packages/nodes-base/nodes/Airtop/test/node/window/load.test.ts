import nock from 'nock';

import * as load from '../../../actions/window/load.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'load',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	url: 'https://example.com',
	additionalFields: {},
};

const mockResponse = {
	success: true,
	message: 'Page loaded successfully',
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: mockResponse,
			};
		}),
	};
});

describe('Test Airtop, window load operation', () => {
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

	it('should load URL with minimal parameters', async () => {
		const result = await load.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123',
			{
				url: 'https://example.com',
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: baseNodeParameters.windowId,
					status: 'success',
					data: mockResponse,
				},
			},
		]);
	});

	it('should throw error when URL is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			url: '',
		};
		const errorMessage = ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'URL');

		await expect(load.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			errorMessage,
		);
	});

	it('should throw error when URL is invalid', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			url: 'not-a-valid-url',
		};

		await expect(load.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.URL_INVALID,
		);
	});

	it("should include 'waitUntil' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				waitUntil: 'domContentLoaded',
			},
		};

		await load.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123',
			{
				url: 'https://example.com',
				waitUntil: 'domContentLoaded',
			},
		);
	});
});
