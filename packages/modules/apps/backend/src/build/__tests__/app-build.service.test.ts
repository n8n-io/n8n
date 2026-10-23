import { Logger } from '@n8n/backend-common';
import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { AppBuildService } from '../app-build.service';
import { AppBuildError } from '../app-build.types';
import { createAppScaffold } from '../../scaffold/app-scaffold';
import { appStorageLockSubKey } from '../../storage/app-storage-lock';
import type { AppVersion } from '../../versions/app-version.entity';
import { AppVersionRepository } from '../../versions/app-version.repository';
import { AppVersionService } from '../../versions/app-version.service';
import { AppWorkspaceService } from '../app-workspace.service';
import { AppsConfig } from '../../apps.config';

function setup() {
	const versions = mock<AppVersionRepository>();
	const source = mock<AppVersionService>();
	const workspaces = mock<AppWorkspaceService>();
	const locks = mock<DbLockService>();
	const logger = mock<Logger>();
	const config = new AppsConfig();
	const ctx = mock<OperationContext>();
	const version = mock<AppVersion>({
		id: 'version',
		appId: 'app',
		buildStatus: 'queued',
		buildAttempts: 0,
		buildStatusUpdatedAt: null,
	});
	locks.withLockContext.mockImplementation(async (_lock, work) => await work(ctx));
	source.getVersion.mockImplementation(async () => ({ ...version }));
	source.readSource.mockResolvedValue(createAppScaffold());
	versions.claimBuild.mockImplementation(async (_app, _version, status) => {
		if (version.buildStatus !== (typeof status === 'string' ? status : 'running')) return null;
		if (typeof status === 'number' && status !== version.buildAttempts) return null;
		version.buildStatus = 'running';
		version.buildAttempts++;
		version.buildStatusUpdatedAt = new Date();
		return { attemptNumber: version.buildAttempts, startedAt: version.buildStatusUpdatedAt };
	});
	versions.failBuild.mockImplementation(async () => {
		version.buildStatus = 'failed';
		return { ...version };
	});
	const bundle = new Map([['index.html', Buffer.from('built')]]);
	workspaces.build.mockResolvedValue(bundle);
	source.attachBundle.mockImplementation(async () => {
		version.buildStatus = 'succeeded';
		return version;
	});
	const service = new AppBuildService(versions, source, workspaces, locks, logger, config);
	return { service, versions, source, workspaces, locks, version, bundle, ctx, config, logger };
}

describe('AppBuildService', () => {
	afterEach(() => vi.restoreAllMocks());

	it('returns a claimed build before the workspace finishes', async () => {
		const { service, workspaces, version, bundle } = setup();
		version.buildStatus = 'failed';
		const pending = createDeferredPromise<typeof bundle>();
		workspaces.build.mockReturnValue(pending.promise);

		try {
			expect(await service.startBuild('project', 'app', 'version', true)).toEqual({
				versionId: 'version',
				status: 'running',
				attempts: 1,
				statusUpdatedAt: expect.any(String),
			});
			expect(await service.status('project', 'app', 'version')).toMatchObject({
				status: 'running',
			});
		} finally {
			pending.resolve(bundle);
		}
		await vi.waitFor(async () => {
			expect(await service.status('project', 'app', 'version')).toMatchObject({
				status: 'succeeded',
				attempts: 1,
			});
		});
	});

	it('accepts only one of two concurrent retries', async () => {
		const { service, version, workspaces, bundle } = setup();
		version.buildStatus = 'failed';
		const pending = createDeferredPromise<typeof bundle>();
		workspaces.build.mockReturnValue(pending.promise);
		try {
			const results = await Promise.allSettled([
				service.startBuild('project', 'app', 'version', true),
				service.startBuild('project', 'app', 'version', true),
			]);
			expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
			expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
				reason: expect.any(ConflictError),
			});
		} finally {
			pending.resolve(bundle);
			await service.shutdown();
		}
	});

	it('reports failed background builds through status and logs their errors', async () => {
		const { service, workspaces, version, logger } = setup();
		version.buildStatus = 'failed';
		const error = new AppBuildError('build', 'Compilation failed.', 'Build output');
		workspaces.build.mockRejectedValueOnce(error);

		await service.startBuild('project', 'app', 'version', true);
		await vi.waitFor(async () => {
			expect(await service.status('project', 'app', 'version')).toEqual({
				versionId: 'version',
				status: 'failed',
				attempts: 1,
				statusUpdatedAt: expect.any(String),
			});
		});
		expect(logger.warn).toHaveBeenCalledWith('App build attempt failed.', {
			appId: 'app',
			versionId: 'version',
			attempt: 1,
			stage: 'build',
			error,
			log: 'Build output',
		});
	});

	it('returns lookup errors before accepting a background build', async () => {
		const { service, source, versions } = setup();
		source.getVersion.mockRejectedValue(new NotFoundError('App not found.'));
		await expect(service.startBuild('wrong-project', 'app', 'version', true)).rejects.toThrow(
			NotFoundError,
		);
		expect(versions.claimBuild).not.toHaveBeenCalled();
	});

	it('handles unexpected background errors after acceptance', async () => {
		const { service, workspaces, versions, logger } = setup();
		const error = new Error('Database unavailable.');
		workspaces.build.mockRejectedValue(new AppBuildError('build', 'Compilation failed.'));
		versions.failBuild.mockRejectedValue(error);

		await expect(service.startBuild('project', 'app', 'version')).resolves.toMatchObject({
			status: 'running',
		});
		await vi.waitFor(() => {
			expect(logger.warn).toHaveBeenCalledWith('App build could not complete.', {
				projectId: 'project',
				appId: 'app',
				versionId: 'version',
				error,
			});
		});
	});

	it('stops accepted background builds on shutdown', async () => {
		const { service, workspaces } = setup();
		workspaces.build.mockImplementation(async () => await new Promise(() => undefined));
		await service.startBuild('project', 'app', 'version');
		await service.shutdown();
		expect(await service.status('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			attempts: 1,
		});
		await expect(service.startBuild('project', 'app', 'version', true)).rejects.toThrow(
			ConflictError,
		);
	});

	it('records a timeout without retrying the attempt', async () => {
		const deadline = new AbortController();
		vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
		const { service, workspaces, config } = setup();
		config.buildTimeoutMs = 1234;
		workspaces.build.mockImplementation(async () => await new Promise(() => undefined));
		const result = service.build('project', 'app', 'version');
		await vi.waitFor(() => expect(workspaces.build).toHaveBeenCalled());
		expect(AbortSignal.timeout).toHaveBeenCalledWith(config.buildTimeoutMs);
		deadline.abort();
		expect(await result).toMatchObject({
			status: 'failed',
			attempts: 1,
			diagnostics: { message: expect.stringContaining('timed out') },
		});
		expect(workspaces.build).toHaveBeenCalledTimes(1);
	});

	it('builds the selected stored source and attaches output with attempt ownership', async () => {
		const { service, source, workspaces, locks, versions, version, bundle, ctx } = setup();
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			versionId: 'version',
			status: 'succeeded',
			attempts: 1,
		});
		expect(locks.withLockContext).toHaveBeenCalledWith(DbLock.APPS_STORAGE, expect.any(Function), {
			subKey: appStorageLockSubKey('app'),
		});
		expect(versions.claimBuild).toHaveBeenCalledWith('app', 'version', 'queued', ctx);
		expect(source.readSource).toHaveBeenCalledWith('project', 'app', 'version');
		expect(workspaces.build).toHaveBeenCalledWith(
			'project',
			'app',
			'version',
			{ attemptNumber: 1, startedAt: version.buildStatusUpdatedAt },
			createAppScaffold(),
			expect.any(AbortSignal),
		);
		expect(source.attachBundle).toHaveBeenCalledWith('project', 'app', 'version', bundle, {
			attemptNumber: 1,
			startedAt: version.buildStatusUpdatedAt,
		});
	});

	it('returns bounded compiler errors without retrying or attaching a bundle', async () => {
		const { service, source, workspaces, config } = setup();
		config.maxBuildLogBytes = 32;
		workspaces.build.mockRejectedValue(
			new AppBuildError('build', 'Compilation failed.', 'x'.repeat(config.maxBuildLogBytes * 2)),
		);
		const result = await service.build('project', 'app', 'version');
		expect(result).toMatchObject({
			status: 'failed',
			diagnostics: { stage: 'build', message: 'Compilation failed.' },
		});
		expect(Buffer.byteLength(result.diagnostics!.log)).toBe(config.maxBuildLogBytes);
		expect(workspaces.build).toHaveBeenCalledTimes(1);
		expect(source.attachBundle).not.toHaveBeenCalled();
	});

	it.each(['source', 'sandbox', 'store'] as const)(
		'returns generic diagnostics for unexpected %s failures without retrying',
		async (stage) => {
			const { service, source, workspaces, logger } = setup();
			const error = new Error('Operation failed with internal details.');
			const operations = {
				source: source.readSource,
				sandbox: workspaces.build,
				store: source.attachBundle,
			};
			operations[stage].mockRejectedValue(error);

			const result = await service.build('project', 'app', 'version');

			expect(result).toMatchObject({ status: 'failed', attempts: 1 });
			expect(result.diagnostics).toEqual({
				stage,
				message: 'The app build failed. Retry the build or contact your instance administrator.',
				log: '',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'App build attempt failed.',
				expect.objectContaining({ error }),
			);
		},
	);

	it('retries a temporary provider failure within the original call', async () => {
		const { service, workspaces, versions } = setup();
		workspaces.build.mockRejectedValueOnce(new AppBuildError('sandbox', 'Try again.', '', true));
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'succeeded',
			attempts: 2,
		});
		expect(versions.failBuild).not.toHaveBeenCalled();
	});

	it('returns a storage quota error without rebuilding', async () => {
		const { service, source, workspaces } = setup();
		source.attachBundle.mockRejectedValue(new BadRequestError('App storage limit reached.'));
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			diagnostics: { stage: 'store', message: 'App storage limit reached.' },
		});
		expect(workspaces.build).toHaveBeenCalledTimes(1);
	});

	it('stops after three temporary failures', async () => {
		const { service, workspaces } = setup();
		workspaces.build.mockRejectedValue(new AppBuildError('sandbox', 'Unavailable.', '', true));
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			attempts: 3,
		});
		expect(workspaces.build).toHaveBeenCalledTimes(3);
	});

	it('uses the configured attempt limit', async () => {
		const { service, workspaces, config } = setup();
		config.maxBuildAttempts = 1;
		workspaces.build.mockRejectedValue(new AppBuildError('sandbox', 'Unavailable.', '', true));
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			attempts: 1,
		});
		expect(workspaces.build).toHaveBeenCalledTimes(1);
	});

	it('builds more than two different apps concurrently', async () => {
		const { service, versions, source, workspaces, version, bundle } = setup();
		versions.claimBuild.mockResolvedValue({ attemptNumber: 1, startedAt: new Date() });
		source.attachBundle.mockImplementation(async (_projectId, appId, id) => ({
			...version,
			id,
			appId,
			buildStatus: 'succeeded',
			buildAttempts: 1,
		}));
		let release!: () => void;
		const pending = new Promise<void>((resolve) => {
			release = resolve;
		});
		workspaces.build.mockImplementation(async () => {
			await pending;
			return bundle;
		});
		const builds = ['first', 'second', 'third'].map(
			async (appId) => await service.build('project', appId, `version-${appId}`),
		);
		try {
			await vi.waitFor(() => expect(workspaces.build).toHaveBeenCalledTimes(3));
		} finally {
			release();
		}
		expect((await Promise.all(builds)).map(({ status }) => status)).toEqual([
			'succeeded',
			'succeeded',
			'succeeded',
		]);
	});

	it('retries a failed version without resetting its attempt counter', async () => {
		const { service, version } = setup();
		version.buildStatus = 'failed';
		version.buildAttempts = 7;
		expect(await service.build('project', 'app', 'version', true)).toMatchObject({
			status: 'succeeded',
			attempts: 8,
		});
	});

	it('rejects a second request for a running version', async () => {
		const { service, version, workspaces } = setup();
		version.buildStatus = 'running';
		await expect(service.build('project', 'app', 'version', true)).rejects.toThrow(ConflictError);
		expect(workspaces.build).not.toHaveBeenCalled();
	});

	it('does not report a stale attempt as the result of a newer attempt', async () => {
		const { service, versions, workspaces } = setup();
		workspaces.build.mockRejectedValue(new AppBuildError('build', 'Old result.'));
		versions.failBuild.mockResolvedValue(null);
		await expect(service.build('project', 'app', 'version')).rejects.toThrow(ConflictError);
	});

	it('keeps diagnostics with the failed attempt when a manual retry starts', async () => {
		const { service, versions, version, workspaces } = setup();
		workspaces.build.mockRejectedValue(new AppBuildError('build', 'Fix this version.'));
		versions.failBuild.mockImplementation(async () => {
			const failed: AppVersion = { ...version, buildStatus: 'failed' };
			version.buildStatus = 'running';
			version.buildAttempts++;
			return failed;
		});
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			attempts: 1,
			diagnostics: { message: 'Fix this version.' },
		});
	});

	it('fails unsupported source before acquiring a workspace', async () => {
		const { service, source, workspaces } = setup();
		source.readSource.mockResolvedValue(new Map());
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			status: 'failed',
			diagnostics: { stage: 'source' },
		});
		expect(workspaces.build).not.toHaveBeenCalled();
	});

	it('checks the project before claiming work', async () => {
		const { service, source, versions } = setup();
		source.getVersion.mockRejectedValue(new NotFoundError('App not found.'));
		await expect(service.build('wrong-project', 'app', 'version')).rejects.toThrow(NotFoundError);
		expect(versions.claimBuild).not.toHaveBeenCalled();
	});

	it('rejects builds after shutdown', async () => {
		const { service, versions, workspaces } = setup();
		await service.shutdown();
		await expect(service.build('project', 'app', 'version')).rejects.toThrow(ConflictError);
		expect(versions.claimBuild).not.toHaveBeenCalled();
		expect(workspaces.build).not.toHaveBeenCalled();
	});

	it('rejects a build if shutdown finishes during the version lookup', async () => {
		const { service, source, versions, workspaces, version } = setup();
		let finishLookup!: (value: AppVersion) => void;
		source.getVersion.mockReturnValue(
			new Promise<AppVersion>((resolve) => {
				finishLookup = resolve;
			}),
		);
		const build = service.build('project', 'app', 'version');

		await service.shutdown();
		finishLookup(version);

		await expect(build).rejects.toThrow(ConflictError);
		expect(versions.claimBuild).not.toHaveBeenCalled();
		expect(workspaces.build).not.toHaveBeenCalled();
	});

	it('marks a running build failed on shutdown', async () => {
		const { service, workspaces } = setup();
		workspaces.build.mockImplementation(
			async (_project, _app, _version, _attempt, _files, signal) =>
				await new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => reject(new Error('Aborted.')), { once: true });
				}),
		);
		const result = service.build('project', 'app', 'version');
		await vi.waitFor(() => expect(workspaces.build).toHaveBeenCalled());
		await service.shutdown();
		expect(await result).toMatchObject({
			status: 'failed',
			diagnostics: { message: expect.stringContaining('shutdown') },
		});
	});
});
