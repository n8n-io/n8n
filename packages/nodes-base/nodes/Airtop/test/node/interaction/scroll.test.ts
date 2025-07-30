import * as scroll from '../../../actions/interaction/scroll.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'interaction',
	operation: 'scroll',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	additionalFields: {},
};

const baseAutomaticNodeParameters = {
	...baseNodeParameters,
	scrollingMode: 'automatic',
	scrollToElement: 'the bottom of the page',
	scrollWithin: '',
};

const baseManualNodeParameters = {
	...baseNodeParameters,
	scrollingMode: 'manual',
	scrollToEdge: {
		edgeValues: {
			yAxis: 'bottom',
			xAxis: '',
		},
	},
	scrollBy: {
		scrollValues: {
			yAxis: '200px',
			xAxis: '',
		},
	},
};

const mockResponse = {
	success: true,
	message: 'Scrolled successfully',
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Airtop, scroll operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should execute automatic scroll operation successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockResponse);

		const result = await scroll.execute.call(
			createMockExecuteFunction(baseAutomaticNodeParameters),
			0,
		);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/scroll',
			{
				scrollToElement: 'the bottom of the page',
				configuration: {},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseAutomaticNodeParameters.sessionId,
					windowId: baseAutomaticNodeParameters.windowId,
					success: true,
					message: 'Scrolled successfully',
				},
			},
		]);
	});

	it('should execute manual scroll operation successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockResponse);

		const result = await scroll.execute.call(
			createMockExecuteFunction(baseManualNodeParameters),
			0,
		);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/scroll',
			{
				configuration: {},
				scrollToEdge: {
					yAxis: 'bottom',
					xAxis: '',
				},
				scrollBy: {
					yAxis: '200px',
					xAxis: '',
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseManualNodeParameters.sessionId,
					windowId: baseManualNodeParameters.windowId,
					success: true,
					message: 'Scrolled successfully',
				},
			},
		]);
	});

	it("should throw error when scrollingMode is 'automatic' and 'scrollToElement' parameter is empty", async () => {
		const nodeParameters = {
			...baseAutomaticNodeParameters,
			scrollToElement: '',
		};

		await expect(scroll.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Element Description'),
		);
	});

	it("should validate scroll amount formats when scrollingMode is 'manual'", async () => {
		const invalidNodeParameters = {
			...baseManualNodeParameters,
			scrollBy: {
				scrollValues: {
					yAxis: 'one hundred pixels',
					xAxis: '',
				},
			},
		};

		await expect(
			scroll.execute.call(createMockExecuteFunction(invalidNodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SCROLL_BY_AMOUNT_INVALID);
	});

	it('should throw an error when the API returns an error response', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		const errorResponse = {
			errors: [
				{
					message: 'Failed to scroll',
				},
			],
		};

		apiRequestMock.mockResolvedValueOnce(errorResponse);

		await expect(
			scroll.execute.call(createMockExecuteFunction(baseAutomaticNodeParameters), 0),
		).rejects.toThrow('Failed to scroll');
	});
});
