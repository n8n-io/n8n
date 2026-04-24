import type { Daytona, Image } from '@daytonaio/sdk';

import type { Logger } from '../../logger';
import { SnapshotManager } from '../snapshot-manager';

interface MockDaytona {
	snapshot: {
		get: jest.Mock;
		create: jest.Mock;
	};
}

function createMockDaytona(): MockDaytona {
	return {
		snapshot: {
			get: jest.fn(),
			create: jest.fn(),
		},
	};
}

function asDaytona(daytona: MockDaytona): Daytona {
	return daytona as unknown as Daytona;
}

function createMockLogger(): Logger {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
}

function notFoundError(name: string): Error {
	return new Error(`Snapshot ${name} not found`);
}

describe('SnapshotManager', () => {
	const snapshotName = 'n8n-instance-ai-1.97.0';
	let logger: Logger;

	beforeEach(() => {
		logger = createMockLogger();
	});

	describe('ensureSnapshot', () => {
		it('returns the configured snapshot name when it already exists', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockResolvedValue({ name: snapshotName });

			const result = await manager.ensureSnapshot(asDaytona(daytona));

			expect(result).toBe(snapshotName);
			expect(daytona.snapshot.get).toHaveBeenCalledWith(snapshotName);
			expect(daytona.snapshot.create).not.toHaveBeenCalled();
		});

		it('creates the snapshot when it does not exist', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create.mockResolvedValue({ name: snapshotName });

			const result = await manager.ensureSnapshot(asDaytona(daytona));

			expect(result).toBe(snapshotName);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
			const [params, options] = daytona.snapshot.create.mock.calls[0] as [
				{ name: string; image: Image },
				{ timeout: number; onLogs: (chunk: string) => void },
			];
			expect(params.name).toBe(snapshotName);
			expect(params.image.dockerfile).toContain('daytonaio/sandbox:0.5.0');
			expect(params.image.dockerfile).toContain('npm install');
			expect(options.timeout).toBe(600);
		});

		it('uses the provided base image when building the snapshot image', async () => {
			const manager = new SnapshotManager('custom/base:1.0', snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create.mockResolvedValue({ name: snapshotName });

			await manager.ensureSnapshot(asDaytona(daytona));

			const [params] = daytona.snapshot.create.mock.calls[0] as [{ image: Image }];
			expect(params.image.dockerfile).toContain('custom/base:1.0');
		});

		it('memoizes — concurrent callers share a single snapshot.create', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));

			let resolveCreate: (value: { name: string }) => void = () => {};
			const createCalled = new Promise<void>((resolveCalled) => {
				daytona.snapshot.create.mockImplementation(
					async () =>
						await new Promise((resolve) => {
							resolveCreate = resolve;
							resolveCalled();
						}),
				);
			});

			const p1 = manager.ensureSnapshot(asDaytona(daytona));
			const p2 = manager.ensureSnapshot(asDaytona(daytona));
			const p3 = manager.ensureSnapshot(asDaytona(daytona));

			await createCalled;
			resolveCreate({ name: snapshotName });
			const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

			expect(r1).toBe(snapshotName);
			expect(r2).toBe(snapshotName);
			expect(r3).toBe(snapshotName);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.get).toHaveBeenCalledTimes(1);
		});

		it('short-circuits subsequent calls via memoization after success', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockResolvedValue({ name: snapshotName });

			await manager.ensureSnapshot(asDaytona(daytona));
			await manager.ensureSnapshot(asDaytona(daytona));
			await manager.ensureSnapshot(asDaytona(daytona));

			expect(daytona.snapshot.get).toHaveBeenCalledTimes(1);
		});

		it('tolerates "already exists" conflict from create (race with another caller)', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create.mockRejectedValue(
				new Error('Snapshot with name n8n-instance-ai-1.97.0 already exists'),
			);

			const result = await manager.ensureSnapshot(asDaytona(daytona));

			expect(result).toBe(snapshotName);
		});

		it('treats "conflict" messages from create as success', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create.mockRejectedValue(new Error('409 Conflict'));

			const result = await manager.ensureSnapshot(asDaytona(daytona));

			expect(result).toBe(snapshotName);
		});

		it('clears memoization on genuine failure so next caller retries', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create
				.mockRejectedValueOnce(new Error('internal server error'))
				.mockResolvedValueOnce({ name: snapshotName });

			await expect(manager.ensureSnapshot(asDaytona(daytona))).rejects.toThrow(
				'internal server error',
			);

			const result = await manager.ensureSnapshot(asDaytona(daytona));

			expect(result).toBe(snapshotName);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		});

		it('rethrows the original error on genuine create failure', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockRejectedValue(notFoundError(snapshotName));
			daytona.snapshot.create.mockRejectedValue(new Error('daytona unreachable'));

			await expect(manager.ensureSnapshot(asDaytona(daytona))).rejects.toThrow(
				'daytona unreachable',
			);
		});
	});

	describe('invalidate', () => {
		it('forces the next ensureSnapshot call to re-check Daytona', async () => {
			const manager = new SnapshotManager(undefined, snapshotName, logger);
			const daytona = createMockDaytona();
			daytona.snapshot.get.mockResolvedValue({ name: snapshotName });

			await manager.ensureSnapshot(asDaytona(daytona));
			manager.invalidate();
			await manager.ensureSnapshot(asDaytona(daytona));

			expect(daytona.snapshot.get).toHaveBeenCalledTimes(2);
		});
	});
});
