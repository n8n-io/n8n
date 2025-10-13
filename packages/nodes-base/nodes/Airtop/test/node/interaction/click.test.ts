import nock from 'nock';

import * as click from '../../../actions/interaction/click.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'interaction',
	operation: 'click',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	elementDescription: 'the login button',
	clickType: 'click',
	additionalFields: {},
};

const mockResponse = {
	success: true,
	message: 'Click executed successfully',
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

describe('Test Airtop, click operation', () => {
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

	it('should execute click with minimal parameters', async () => {
		const result = await click.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/click',
			{
				elementDescription: 'the login button',
				configuration: {
					clickType: 'click',
				},
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

	it("should throw error when 'elementDescription' parameter is empty", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			elementDescription: '',
		};
		const errorMessage = ERROR_MESSAGES.REQUIRED_PARAMETER.replace(
			'{{field}}',
			'Element Description',
		);

		await expect(click.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			errorMessage,
		);
	});

	it("should include 'visualScope' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				visualScope: 'viewport',
			},
		};

		await click.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/click',
			{
				configuration: {
					visualAnalysis: {
						scope: 'viewport',
					},
					clickType: 'click',
				},
				elementDescription: 'the login button',
			},
		);
	});

	it("should include 'waitForNavigation' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				waitForNavigation: 'load',
			},
		};

		await click.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/click',
			{
				configuration: {
					clickType: 'click',
					waitForNavigationConfig: {
						waitUntil: 'load',
					},
				},
				waitForNavigation: true,
				elementDescription: 'the login button',
			},
		);
	});

	it("should execute double click when 'clickType' is 'doubleClick'", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			clickType: 'doubleClick',
		};

		await click.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/click',
			{
				elementDescription: 'the login button',
				configuration: {
					clickType: 'doubleClick',
				},
			},
		);
	});

	it("should execute right click when 'clickType' is 'rightClick'", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			clickType: 'rightClick',
		};

		await click.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/click',
			{
				elementDescription: 'the login button',
				configuration: {
					clickType: 'rightClick',
				},
			},
		);
	});
});
