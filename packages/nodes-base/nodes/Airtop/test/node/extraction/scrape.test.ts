import nock from 'nock';

import * as scrape from '../../../actions/extraction/scrape.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'extraction',
	operation: 'scrape',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	sessionMode: 'existing',
};

const mockResponse = {
	data: {
		content: '<html><body>Scraped content</body></html>',
	},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string, endpoint: string) {
			if (method === 'DELETE' && endpoint.includes('/sessions/')) {
				return { status: 'success' };
			}
			return mockResponse;
		}),
	};
});

jest.mock('../../../GenericFunctions', () => {
	const originalModule = jest.requireActual<typeof GenericFunctions>('../../../GenericFunctions');
	return {
		...originalModule,
		createSessionAndWindow: jest.fn().mockImplementation(async () => {
			return {
				sessionId: 'new-session-456',
				windowId: 'new-win-456',
			};
		}),
		shouldCreateNewSession: jest.fn().mockImplementation(function (this: any) {
			const sessionMode = this.getNodeParameter('sessionMode', 0);
			return sessionMode === 'new';
		}),
	};
});

describe('Test Airtop, scrape operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../transport');
		jest.unmock('../../../GenericFunctions');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should scrape content with minimal parameters using existing session', async () => {
		const result = await scrape.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/scrape-content',
			{},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should scrape content with additional parameters using existing session', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				waitForSelector: '.product-list',
				waitForTimeout: 5000,
			},
		};

		const result = await scrape.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/scrape-content',
			{},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should scrape content using a new session', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionMode: 'new',
			url: 'https://example.com',
			autoTerminateSession: true,
		};

		const result = await scrape.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledTimes(2); // One for scrape, one for session deletion
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/new-session-456/windows/new-win-456/scrape-content',
			{},
		);

		expect(result).toEqual([
			{
				json: {
					data: mockResponse.data,
				},
			},
		]);
	});

	it("should throw error when sessionId is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(scrape.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it("should throw error when windowId is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(scrape.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.WINDOW_ID_REQUIRED,
		);
	});
});
