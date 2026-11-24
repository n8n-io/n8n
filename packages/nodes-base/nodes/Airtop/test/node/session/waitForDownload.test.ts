import * as waitForDownload from '../../../actions/session/waitForDownload.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import { createMockExecuteFunction } from '../helpers';
import type { Mock } from 'vitest';

vi.mock('../../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof GenericFunctions>(
		'../../../GenericFunctions',
	);
	return {
		...originalModule,
		waitForSessionEvent: vi.fn(),
	};
});

describe('Test Airtop, session waitForDownload operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should wait for download successfully', async () => {
		const mockEvent = {
			event: 'file_status',
			status: 'available',
			fileId: 'test-file-123',
			downloadUrl: 'https://example.com/download/test-file-123',
		};

		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValue(mockEvent);

		const nodeParameters = {
			resource: 'session',
			operation: 'waitForDownload',
			sessionId: 'test-session-123',
			timeout: 1,
		};

		const result = await waitForDownload.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.waitForSessionEvent).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.waitForSessionEvent).toHaveBeenCalledWith(
			'test-session-123',
			expect.any(Function),
			1,
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					data: {
						fileId: 'test-file-123',
						downloadUrl: 'https://example.com/download/test-file-123',
					},
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'waitForDownload',
			sessionId: '',
		};

		await expect(
			waitForDownload.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});

	it('should throw error when sessionId is whitespace', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'waitForDownload',
			sessionId: '   ',
		};

		await expect(
			waitForDownload.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});
});
