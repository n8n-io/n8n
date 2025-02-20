import nock from 'nock';

import * as getPaginated from '../../../actions/extraction/getPaginated.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'extraction',
	operation: 'getPaginated',
	sessionId: 'test-session-123',
	windowId: 'win-123',
};

const mockResponse = {
	data: {
		modelResponse:
			'{"items": [{"title": "Item 1", "price": "$10.99"}, {"title": "Item 2", "price": "$20.99"}]}',
	},
};

const mockJsonSchema =
	'{"type":"object","properties":{"title":{"type":"string"},"price":{"type":"string"}}}';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: mockResponse.data,
			};
		}),
	};
});

describe('Test Airtop, paginated extraction operation', () => {
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

	it('should extract data with minimal parameters', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'Extract all product titles and prices',
		};

		const result = await getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/paginated-extraction',
			{
				configuration: {},
				prompt: 'Extract all product titles and prices',
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should extract data with all parameters', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'Extract all product titles and prices',
			additionalFields: {
				outputSchema: mockJsonSchema,
				interactionMode: 'accurate',
				paginationMode: 'infinite-scroll',
			},
		};

		const result = await getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/paginated-extraction',
			{
				prompt: 'Extract all product titles and prices',
				configuration: {
					outputSchema: mockJsonSchema,
					interactionMode: 'accurate',
					paginationMode: 'infinite-scroll',
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
			prompt: 'Extract data',
		};

		await expect(
			getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
			prompt: 'Extract data',
		};

		await expect(
			getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.WINDOW_ID_REQUIRED);
	});
});
