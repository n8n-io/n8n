import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { BinaryDataRepository } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ProjectFileOrphanSweeperService } from '../project-file-orphan-sweeper.service';
import type { ProjectFileStore } from '../project-file-store';
import type { ProjectFileRepository } from '../project-file.repository';

describe('ProjectFileOrphanSweeperService', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		fileStorage: {
			orphanSweepIntervalMs: 1000,
			fileMaxAgeMs: 2 * 60 * 1000,
		},
	});

	const now = new Date('2026-08-12T12:00:00Z');
	const oldDate = new Date('2026-08-12T00:00:00Z');
	const freshDate = new Date('2026-08-12T11:59:30Z');

	let store: ReturnType<typeof mock<ProjectFileStore>>;
	let repository: ReturnType<typeof mock<ProjectFileRepository>>;
	let binaryDataRepository: ReturnType<typeof mock<BinaryDataRepository>>;
	let sweeper: ProjectFileOrphanSweeperService;

	const makeSweeper = (instanceType = 'main', isLeader = true, mode: 'fs' | 'db' = 'fs') => {
		store = mock<ProjectFileStore>({ mode });
		repository = mock<ProjectFileRepository>();
		binaryDataRepository = mock<BinaryDataRepository>();
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		return new ProjectFileOrphanSweeperService(
			globalConfig,
			mock<InstanceSettings>({ instanceType: instanceType as never, isLeader }),
			store,
			repository,
			binaryDataRepository,
			logger,
		);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		sweeper = makeSweeper();
	});

	afterEach(() => {
		sweeper.shutdown();
		vi.useRealTimers();
	});

	it('does not start the timer on workers or non-leader mains', () => {
		const setIntervalSpy = vi.spyOn(global, 'setInterval');

		makeSweeper('worker', true).start();
		makeSweeper('main', false).start();

		expect(setIntervalSpy).not.toHaveBeenCalled();
	});

	it('deletes an orphan only on the second pass it is seen (two-pass grace)', async () => {
		store.listStoredKeys.mockResolvedValue([
			{ key: 'project-files/p/orphan', lastModified: oldDate },
			{ key: 'project-files/p/live', lastModified: oldDate },
		]);
		repository.findAllStorageKeys.mockResolvedValue(['project-files/p/live']);

		await sweeper.sweep(now);
		expect(store.delete).not.toHaveBeenCalled();

		await sweeper.sweep(now);
		expect(store.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: 'project-files/p/orphan' },
		]);
	});

	it('never marks keys younger than the freshness window', async () => {
		store.listStoredKeys.mockResolvedValue([
			{ key: 'project-files/p/in-flight', lastModified: freshDate },
		]);
		repository.findAllStorageKeys.mockResolvedValue([]);

		await sweeper.sweep(now);
		await sweeper.sweep(now);

		expect(store.delete).not.toHaveBeenCalled();
	});

	it('unmarks a key that became referenced between passes', async () => {
		store.listStoredKeys.mockResolvedValue([
			{ key: 'project-files/p/orphan', lastModified: oldDate },
		]);
		repository.findAllStorageKeys.mockResolvedValueOnce([]);
		await sweeper.sweep(now);

		// Now the row references the key — no longer an orphan.
		repository.findAllStorageKeys.mockResolvedValue(['project-files/p/orphan']);
		await sweeper.sweep(now);

		expect(store.delete).not.toHaveBeenCalled();
	});

	it('reconciles binary_data rows against live storage keys in db mode', async () => {
		sweeper = makeSweeper('main', true, 'db');
		binaryDataRepository.findBySourceTypeOlderThan.mockResolvedValue([
			{ fileId: 'uuid-orphan', sourceId: 'file-gone' },
			{ fileId: 'uuid-live', sourceId: 'file-live' },
		]);
		repository.findAllStorageKeys.mockResolvedValue(['uuid-live']);

		await sweeper.sweep(now);
		await sweeper.sweep(now);

		expect(binaryDataRepository.findBySourceTypeOlderThan).toHaveBeenCalledWith(
			'project_file',
			new Date(now.getTime() - globalConfig.fileStorage.fileMaxAgeMs),
		);
		expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledWith(['uuid-orphan']);
		expect(store.delete).not.toHaveBeenCalled();
	});

	it('clears marked keys on leader stepdown', async () => {
		store.listStoredKeys.mockResolvedValue([
			{ key: 'project-files/p/orphan', lastModified: oldDate },
		]);
		repository.findAllStorageKeys.mockResolvedValue([]);

		await sweeper.sweep(now);
		sweeper.stopSweepTimer();
		await sweeper.sweep(now);

		// The mark was dropped, so the orphan starts a fresh two-pass cycle.
		expect(store.delete).not.toHaveBeenCalled();
	});
});
