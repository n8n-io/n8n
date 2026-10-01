import * as takeScreenshot from '../../../actions/window/takeScreenshot.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'takeScreenshot',
	sessionId: 'test-session-123',
	windowId: 'win-123',
};

const mockResponse = {
	meta: {
		screenshots: [{ dataUrl: 'base64-encoded-image-data' }],
	},
};

const mockBinaryBuffer = Buffer.from('mock-binary-data');

const expectedJsonResult = {
	json: {
		sessionId: 'test-session-123',
		windowId: 'win-123',
		image: 'base64-encoded-image-data',
	},
};

const expectedBinaryResult = {
	binary: {
		data: {
			mimeType: 'image/jpeg',
			fileType: 'jpg',
			fileName: 'screenshot.jpg',
			data: mockBinaryBuffer.toString('base64'),
		},
	},
};

vi.mock('../../../transport', async () => {
	const originalModule = await vi.importActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: vi.fn(async function () {
			return {
				status: 'success',
				...mockResponse,
			};
		}),
	};
});

vi.mock('../../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof GenericFunctions>(
		'../../../GenericFunctions',
	);
	return {
		...originalModule,
		convertScreenshotToBinary: vi.fn(() => mockBinaryBuffer),
	};
});

describe('Test Airtop, take screenshot operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should take screenshot in base64 format', async () => {
		const result = await takeScreenshot.execute.call(
			createMockExecuteFunction({ ...baseNodeParameters }),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/screenshot',
		);

		expect(result).toEqual([{ ...expectedJsonResult }]);
	});

	it('should take screenshot in binary format', async () => {
		const result = await takeScreenshot.execute.call(
			createMockExecuteFunction({
				...baseNodeParameters,
				outputImageAsBinary: true,
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/screenshot',
		);

		expect(GenericFunctions.convertScreenshotToBinary).toHaveBeenCalledWith(
			mockResponse.meta.screenshots[0],
		);

		expect(result).toEqual([
			{
				json: { ...expectedJsonResult.json, image: '' },
				...expectedBinaryResult,
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(
			takeScreenshot.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(
			takeScreenshot.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.WINDOW_ID_REQUIRED);
	});
});
