import type { TransactionRunner } from '@n8n/db';
import {
	IsNull,
	LessThan,
	type DataSource,
	type EntityManager,
	type UpdateResult,
} from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { AppVersion } from '../app-version.entity';
import { AppVersionRepository } from '../app-version.repository';

const now = new Date('2026-01-01T12:00:00.000Z');

function setup(overrides: Partial<AppVersion> = {}) {
	const manager = mock<EntityManager>();
	const repository = new AppVersionRepository(
		mock<DataSource>({ manager }),
		mock<TransactionRunner>(),
	);
	const version = mock<AppVersion>({
		id: 'version',
		appId: 'app',
		buildStatus: 'queued',
		buildAttempts: 2,
		bundleArtifactId: null,
		...overrides,
	});
	manager.findOneBy.mockResolvedValue(version);
	manager.update.mockResolvedValue(mock<UpdateResult>({ affected: 1 }));
	return { repository, manager, version };
}

describe('AppVersionRepository build state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => vi.useRealTimers());

	it.each([
		{ expected: 'queued', status: 'queued', attempts: 0 },
		{ expected: 'failed', status: 'failed', attempts: 2 },
		{ expected: 2, status: 'running', attempts: 2 },
	] as const)(
		'claims $status builds and increments the attempt count',
		async ({ expected, status, attempts }) => {
			const { repository, manager } = setup({ buildStatus: status, buildAttempts: attempts });

			expect(await repository.claimBuild('app', 'version', expected, {})).toEqual({
				attemptNumber: attempts + 1,
				startedAt: now,
			});
			expect(manager.findOneBy).toHaveBeenCalledExactlyOnceWith(AppVersion, {
				id: 'version',
				appId: 'app',
				buildStatus: status,
			});
			expect(manager.update).toHaveBeenCalledExactlyOnceWith(
				AppVersion,
				{ id: 'version', appId: 'app', buildStatus: status, buildAttempts: attempts },
				{ buildStatus: 'running', buildAttempts: attempts + 1, buildStatusUpdatedAt: now },
			);
		},
	);

	it('does not update a version that does not match the app and build status', async () => {
		const { repository, manager } = setup();
		manager.findOneBy.mockResolvedValue(null);

		expect(await repository.claimBuild('app', 'version', 'queued', {})).toBeNull();
		expect(manager.update).not.toHaveBeenCalled();
	});

	it('does not claim a version that already has a bundle', async () => {
		const { repository, manager } = setup({ bundleArtifactId: 7 });

		expect(await repository.claimBuild('app', 'version', 'queued', {})).toBeNull();
		expect(manager.update).not.toHaveBeenCalled();
	});

	it('does not claim an automatic retry for a stale attempt', async () => {
		const { repository, manager } = setup({ buildStatus: 'running' });

		expect(await repository.claimBuild('app', 'version', 1, {})).toBeNull();
		expect(manager.update).not.toHaveBeenCalled();
	});

	it('returns no claim when the version changes before the update', async () => {
		const { repository, manager } = setup();
		manager.update.mockResolvedValue(mock<UpdateResult>({ affected: 0 }));

		expect(await repository.claimBuild('app', 'version', 'queued', {})).toBeNull();
		expect(manager.update).toHaveBeenCalledOnce();
	});

	it.each([1, 0])('handles build failure when %i rows match', async (affected) => {
		const { repository, manager, version } = setup({ buildStatus: 'failed' });
		manager.update.mockResolvedValue(mock<UpdateResult>({ affected }));

		expect(await repository.failBuild('version', 2, {})).toBe(affected ? version : null);
		expect(manager.update).toHaveBeenCalledExactlyOnceWith(
			AppVersion,
			{ id: 'version', buildStatus: 'running', buildAttempts: 2 },
			{ buildStatus: 'failed', buildStatusUpdatedAt: now },
		);
		if (affected) {
			expect(manager.findOneBy).toHaveBeenCalledExactlyOnceWith(AppVersion, { id: 'version' });
		} else {
			expect(manager.findOneBy).not.toHaveBeenCalled();
		}
	});

	it.each([1, 0])('handles bundle attachment when %i rows match', async (affected) => {
		const { repository, manager } = setup();
		manager.update.mockResolvedValue(mock<UpdateResult>({ affected }));

		expect(await repository.attachBundle('version', 7, 2, {})).toBe(affected === 1);
		expect(manager.update).toHaveBeenCalledExactlyOnceWith(
			AppVersion,
			{ id: 'version', bundleArtifactId: IsNull(), buildStatus: 'running', buildAttempts: 2 },
			{ bundleArtifactId: 7, buildStatus: 'succeeded', buildStatusUpdatedAt: now },
		);
	});

	it('uses separate cutoff conditions for queued and running builds', async () => {
		const { repository, manager } = setup();
		const queuedBefore = new Date('2026-01-01T11:59:00.000Z');
		const runningBefore = new Date('2026-01-01T11:50:00.000Z');

		await repository.failInterruptedBuilds(queuedBefore, runningBefore);

		expect(manager.update).toHaveBeenCalledTimes(2);
		expect(manager.update).toHaveBeenNthCalledWith(
			1,
			AppVersion,
			{ buildStatus: 'queued', createdAt: LessThan(queuedBefore) },
			{ buildStatus: 'failed', buildStatusUpdatedAt: now },
		);
		expect(manager.update).toHaveBeenNthCalledWith(
			2,
			AppVersion,
			{ buildStatus: 'running', buildStatusUpdatedAt: LessThan(runningBefore) },
			{ buildStatus: 'failed', buildStatusUpdatedAt: now },
		);
	});
});
