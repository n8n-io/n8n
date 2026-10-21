import { Logger } from '@n8n/backend-common';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import { DbLockService, type OperationContext } from '@n8n/db';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AppBuildService } from '../app-build.service';
import { AppBuildError } from '../app-build.types';
import { createAppScaffold } from '../app-scaffold';
import type { AppVersion } from '../app-version.entity';
import { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import { AppWorkspaceService } from '../app-workspace.service';
import { AppsConfig } from '../apps.config';

function setup() {
	const versions = mock<AppVersionRepository>();
	const source = mock<AppVersionService>();
	const workspaces = mock<AppWorkspaceService>();
	const locks = mock<DbLockService>();
	const writeAccess = mock<InstanceWriteAccessService>();
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
	const service = new AppBuildService(
		versions,
		source,
		workspaces,
		locks,
		writeAccess,
		logger,
		config,
	);
	return { service, versions, source, workspaces, writeAccess, version, bundle, ctx, config };
}

describe('AppBuildService', () => {
	afterEach(() => vi.restoreAllMocks());

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
		const { service, source, workspaces, version, bundle } = setup();
		expect(await service.build('project', 'app', 'version')).toMatchObject({
			versionId: 'version',
			status: 'succeeded',
			attempts: 1,
		});
		expect(source.readSource).toHaveBeenCalledWith('project', 'app', 'version');
		expect(workspaces.build).toHaveBeenCalledWith(
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

	it('rejects protected-instance writes', async () => {
		const { service, writeAccess, versions } = setup();
		writeAccess.isReadOnly.mockReturnValue(true);
		await expect(service.build('project', 'app', 'version')).rejects.toThrow(ForbiddenError);
		expect(versions.claimBuild).not.toHaveBeenCalled();
	});

	it('marks a running build failed on shutdown', async () => {
		const { service, workspaces } = setup();
		workspaces.build.mockImplementation(
			async (_app, _version, _attempt, _files, signal) =>
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
