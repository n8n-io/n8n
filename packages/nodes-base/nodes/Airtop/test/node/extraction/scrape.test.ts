import nock from 'nock';

import * as scrape from '../../../actions/extraction/scrape.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'extraction',
	operation: 'scrape',
	sessionId: 'test-session-123',
	windowId: 'win-123',
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
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: mockResponse.data,
			};
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
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should scrape content successfully', async () => {
		const result = await scrape.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

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
		};

		await expect(scrape.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(scrape.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.WINDOW_ID_REQUIRED,
		);
	});
});
