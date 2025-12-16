import nock from 'nock';

import * as query from '../../../actions/extraction/query.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'extraction',
	operation: 'query',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	sessionMode: 'existing',
};

const mockResponse = {
	data: {
		modelResponse: {
			answer: 'The page contains 5 products with prices ranging from $10.99 to $50.99',
		},
	},
};

const mockJsonSchema =
	'{"type":"object","properties":{"productCount":{"type":"number"},"priceRange":{"type":"object"}}}';

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

describe('Test Airtop, query page operation', () => {
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

	it('should query the page with minimal parameters using existing session', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'How many products are on the page and what is their price range?',
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {
					experimental: {
						includeVisualAnalysis: 'disabled',
					},
				},
			},
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

	it('should query the page with output schema using existing session', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'How many products are on the page and what is their price range?',
			additionalFields: {
				outputSchema: mockJsonSchema,
			},
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {
					outputSchema: mockJsonSchema,
					experimental: {
						includeVisualAnalysis: 'disabled',
					},
				},
			},
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

	it('should query the page using a new session', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionMode: 'new',
			url: 'https://example.com',
			prompt: 'How many products are on the page and what is their price range?',
			autoTerminateSession: true,
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledTimes(2); // One for query, one for session deletion
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/sessions/new-session-456/windows/new-win-456/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {
					experimental: {
						includeVisualAnalysis: 'disabled',
					},
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					data: mockResponse.data,
				},
			},
		]);
	});

	it("should throw error when 'sessionId' is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
			prompt: 'Query data',
		};

		await expect(query.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it("should throw error when 'windowId' is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
			prompt: 'Query data',
		};

		await expect(query.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.WINDOW_ID_REQUIRED,
		);
	});

	it("should query the page with 'includeVisualAnalysis' enabled", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'List the colors of the products on the page',
			additionalFields: {
				includeVisualAnalysis: true,
			},
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'List the colors of the products on the page',
				configuration: {
					experimental: {
						includeVisualAnalysis: 'enabled',
					},
				},
			},
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

	it("should query the page with 'includeVisualAnalysis' disabled", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'How many products are on the page and what is their price range?',
			additionalFields: {
				includeVisualAnalysis: false,
			},
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {
					experimental: {
						includeVisualAnalysis: 'disabled',
					},
				},
			},
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
});
