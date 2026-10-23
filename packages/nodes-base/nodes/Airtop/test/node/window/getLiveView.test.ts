import nock from 'nock';

import * as getLiveView from '../../../actions/window/getLiveView.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'getLiveView',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	additionalFields: {},
};

const mockResponse = {
	status: 'success',
	data: {
		liveViewUrl: 'https://live.airtop.ai/session/abc',
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
					liveViewUrl: 'https://live.airtop.ai/session/abc',
				},
			};
		}),
	};
});

describe('Test Airtop, window getLiveView operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should get the live view successfully with no additional fields', async () => {
		const result = await getLiveView.execute.call(
			createMockExecuteFunction({ ...baseNodeParameters }),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					...mockResponse,
				},
			},
		]);
	});

	it('should pass additional fields as query parameters', async () => {
		const result = await getLiveView.execute.call(
			createMockExecuteFunction({
				...baseNodeParameters,
				additionalFields: {
					includeNavigationBar: true,
					screenResolution: '1280x720',
					disableResize: true,
				},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/sessions/test-session-123/windows/win-123',
			undefined,
			{
				includeNavigationBar: true,
				screenResolution: '1280x720',
				disableResize: true,
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					...mockResponse,
				},
			},
		]);
	});

	it('should throw error when screen resolution is invalid', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				screenResolution: 'not-a-resolution',
			},
		};

		await expect(
			getLiveView.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SCREEN_RESOLUTION_INVALID);

		expect(transport.apiRequest).not.toHaveBeenCalled();
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(
			getLiveView.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(
			getLiveView.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.WINDOW_ID_REQUIRED);
	});
});
