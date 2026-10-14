import nock from 'nock';

import * as list from '../../../actions/window/list.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'list',
	sessionId: 'test-session-123',
};

const mockResponse = {
	status: 'success',
	data: {
		windows: [{ windowId: 'win-123' }, { windowId: 'win-456' }],
	},
};

vi.mock('../../../transport', async () => {
	const originalModule = await vi.importActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: vi.fn(async function () {
			return {
				status: 'success',
				data: {
					windows: [{ windowId: 'win-123' }, { windowId: 'win-456' }],
				},
			};
		}),
	};
});

describe('Test Airtop, window list operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should list windows successfully', async () => {
		const result = await list.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/sessions/test-session-123/windows',
			undefined,
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					...mockResponse,
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(list.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});
});
