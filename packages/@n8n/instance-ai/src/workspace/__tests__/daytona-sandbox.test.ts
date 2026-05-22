const mockDaytonaCreate = jest.fn<Promise<unknown>, [Record<string, unknown>, unknown?]>();
const mockDaytonaGet = jest.fn<Promise<unknown>, [string]>();

jest.mock('@daytonaio/sdk', () => {
	class DaytonaError extends Error {
		statusCode?: number;
		constructor(message: string, statusCode?: number) {
			super(message);
			this.statusCode = statusCode;
		}
	}
	class DaytonaNotFoundError extends DaytonaError {}
	class Daytona {
		create = mockDaytonaCreate;
		get = mockDaytonaGet;
	}
	return { Daytona, DaytonaError, DaytonaNotFoundError };
});

import { DaytonaNotFoundError } from '@daytonaio/sdk';

import type { ErrorReporter, Logger } from '../../logger';
import { DaytonaSandbox } from '../daytona-sandbox';

function makeSandboxInstance(id = 'remote-sandbox') {
	return {
		id,
		state: 'started',
		getWorkDir: jest.fn(async () => await Promise.resolve('/home/daytona/workspace')),
		delete: jest.fn(async () => await Promise.resolve()),
		stop: jest.fn(async () => await Promise.resolve()),
		start: jest.fn(async () => await Promise.resolve()),
		process: { executeCommand: jest.fn() },
	};
}

function makeLogger(): Logger {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
}

describe('DaytonaSandbox', () => {
	beforeEach(() => {
		mockDaytonaCreate.mockReset();
		mockDaytonaGet.mockReset();
		mockDaytonaGet.mockRejectedValue(new DaytonaNotFoundError('not found', 404));
	});

	it('falls back from snapshot creation to image creation and preserves sandbox labels', async () => {
		const logger = makeLogger();
		const errorReporter: ErrorReporter = { error: jest.fn() };
		const snapshotError = new Error('snapshot missing');
		mockDaytonaCreate
			.mockRejectedValueOnce(snapshotError)
			.mockResolvedValueOnce(makeSandboxInstance());

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			apiUrl: 'https://api.example.com',
			labels: {
				'n8n-builder': 'builder-run',
				run_id: 'run-1',
				thread_id: 'thread-1',
			},
			snapshot: 'n8n/instance-ai:1.123.0',
			image: 'node:20',
			ephemeral: true,
			logger,
			errorReporter,
			createStrategyMode: 'direct',
		});

		await sandbox.start();

		expect(mockDaytonaCreate).toHaveBeenCalledTimes(2);
		expect(mockDaytonaCreate.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				ephemeral: true,
				labels: {
					'n8n-builder': 'builder-run',
					'n8n-instance-ai-sandbox-id': 'sandbox-id',
					run_id: 'run-1',
					thread_id: 'thread-1',
				},
				name: 'sandbox-name',
				snapshot: 'n8n/instance-ai:1.123.0',
			}),
		);
		expect(mockDaytonaCreate.mock.calls[1][0]).toEqual(
			expect.objectContaining({
				ephemeral: true,
				image: 'node:20',
				labels: {
					'n8n-builder': 'builder-run',
					'n8n-instance-ai-sandbox-id': 'sandbox-id',
					run_id: 'run-1',
					thread_id: 'thread-1',
				},
				name: 'sandbox-name',
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Sandbox create from snapshot failed; falling back to image',
			expect.objectContaining({
				mode: 'direct',
				snapshotName: 'n8n/instance-ai:1.123.0',
			}),
		);
		expect(errorReporter.error).toHaveBeenCalledWith(
			snapshotError,
			expect.objectContaining({
				tags: {
					component: 'builder-sandbox-factory',
					mode: 'direct',
					strategy: 'snapshot',
				},
			}),
		);
	});

	it('reports image strategy failures and rethrows', async () => {
		const errorReporter: ErrorReporter = { error: jest.fn() };
		const imageError = new Error('image create failed');
		mockDaytonaCreate.mockRejectedValue(imageError);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			image: 'node:20',
			errorReporter,
			createStrategyMode: 'proxy',
		});

		await expect(sandbox.start()).rejects.toThrow('image create failed');
		expect(errorReporter.error).toHaveBeenCalledWith(
			imageError,
			expect.objectContaining({
				tags: {
					component: 'builder-sandbox-factory',
					mode: 'proxy',
					strategy: 'image',
				},
			}),
		);
	});
});
