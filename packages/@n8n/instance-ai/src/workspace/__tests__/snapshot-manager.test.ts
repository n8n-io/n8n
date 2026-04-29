// Mock the Daytona SDK before importing — its source has require() paths that
// jest can't resolve in this monorepo, and we don't need the real types here.
jest.mock('@daytonaio/sdk', () => {
	class DaytonaError extends Error {
		statusCode?: number;
		constructor(message: string, statusCode?: number) {
			super(message);
			this.name = 'DaytonaError';
			this.statusCode = statusCode;
		}
	}
	class DaytonaNotFoundError extends DaytonaError {
		constructor(message: string, statusCode = 404) {
			super(message, statusCode);
			this.name = 'DaytonaNotFoundError';
		}
	}
	class Image {
		dockerfile = 'FROM node:20\nRUN echo mock';
		static base() {
			return new Image();
		}
		runCommands() {
			return this;
		}
	}
	return { DaytonaError, DaytonaNotFoundError, Image };
});

import { DaytonaError } from '@daytonaio/sdk';

import type { Logger } from '../../logger';
import { SnapshotManager } from '../snapshot-manager';

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

interface CreateSnapshotParams {
	name: string;
	image: { dockerfile: string };
}

interface FakeSnapshotApi {
	get: jest.Mock<Promise<{ name: string }>, [string]>;
	create: jest.Mock<Promise<{ name: string }>, [CreateSnapshotParams, unknown?]>;
}

interface FakeDaytona {
	snapshot: FakeSnapshotApi;
}

function makeFakeDaytona(): FakeDaytona {
	return {
		snapshot: {
			get: jest.fn<Promise<{ name: string }>, [string]>(),
			create: jest.fn<Promise<{ name: string }>, [CreateSnapshotParams, unknown?]>(),
		},
	};
}

describe('SnapshotManager.createSnapshot', () => {
	it('returns the snapshot name on successful create', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toBe('n8n/instance-ai:1.123.0');
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		const callArgs = daytona.snapshot.create.mock.calls[0][0];
		expect(callArgs).toEqual(expect.objectContaining({ name: 'n8n/instance-ai:1.123.0' }));
		expect(callArgs.image).toBeDefined();
	});

	it('treats 409 conflict as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toBe('n8n/instance-ai:1.123.0');
	});

	it('treats messages mentioning "already exists" as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot with this name already exists', 400),
		);

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toBe('n8n/instance-ai:1.123.0');
	});

	it('throws on transient errors', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('upstream 500', 500));

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow('upstream 500');
	});

	it('throws when no version is configured', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
		const daytona = makeFakeDaytona();

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow();
		expect(daytona.snapshot.create).not.toHaveBeenCalled();
	});

	it('forwards options to daytona.snapshot.create', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });
		const onLogs = jest.fn();

		await manager.createSnapshot(daytona as never, { timeout: 1800, onLogs });

		expect(daytona.snapshot.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'n8n/instance-ai:1.123.0' }),
			expect.objectContaining({ timeout: 1800, onLogs }),
		);
	});
});

describe('SnapshotManager.ensureSnapshot', () => {
	describe('when no version is provided', () => {
		it('returns null without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toBeNull();
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
			expect(daytona.snapshot.create).not.toHaveBeenCalled();
		});

		it('returns null in proxy mode without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'proxy');

			expect(result).toBeNull();
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
		});
	});

	describe('proxy mode', () => {
		it('returns the snapshot name without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'proxy');

			expect(result).toBe('n8n/instance-ai:1.123.0');
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
			expect(daytona.snapshot.create).not.toHaveBeenCalled();
		});
	});

	describe('direct mode', () => {
		it('optimistically creates and returns the snapshot name', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toBe('n8n/instance-ai:1.123.0');
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
		});

		it('treats 409 conflict as success', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toBe('n8n/instance-ai:1.123.0');
		});

		it('returns null and clears memoization on transient errors', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create
				.mockRejectedValueOnce(new DaytonaError('upstream 500', 500))
				.mockResolvedValueOnce({ name: 'n8n/instance-ai:1.123.0' });

			const first = await manager.ensureSnapshot(daytona as never, 'direct');
			const second = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(first).toBeNull();
			expect(second).toBe('n8n/instance-ai:1.123.0');
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		});

		it('memoizes a successful create — does not call create twice', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			await manager.ensureSnapshot(daytona as never, 'direct');
			const second = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(second).toBe('n8n/instance-ai:1.123.0');
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		});

		it('reports transient failures via the error reporter', async () => {
			const errorReporter = { error: jest.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			const error = new DaytonaError('upstream 500', 500);
			daytona.snapshot.create.mockRejectedValue(error);

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					tags: expect.objectContaining({ component: 'snapshot-manager' }) as unknown,
				}),
			);
		});

		it('does not report when create succeeds', async () => {
			const errorReporter = { error: jest.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('does not report 409/already-exists as an error', async () => {
			const errorReporter = { error: jest.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).not.toHaveBeenCalled();
		});
	});
});
