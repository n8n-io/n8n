import nock from 'nock';

import * as query from '../../../actions/window/query.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'query',
	sessionId: 'test-session-123',
	windowId: 'win-123',
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
		apiRequest: jest.fn(async function () {
			return mockResponse;
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
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should query page with minimal parameters', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'How many products are on the page and what is their price range?',
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {},
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

	it('should query page with output schema', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'How many products are on the page and what is their price range?',
			additionalFields: {
				outputSchema: mockJsonSchema,
			},
		};

		const result = await query.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/page-query',
			{
				prompt: 'How many products are on the page and what is their price range?',
				configuration: {
					outputSchema: mockJsonSchema,
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

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
			prompt: 'Query data',
		};

		await expect(query.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
			prompt: 'Query data',
		};

		await expect(query.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.WINDOW_ID_REQUIRED,
		);
	});
});
