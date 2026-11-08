import type { AppBinding } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AppBuildService } from '../../build/app-build.service';
import { AppChangeService } from '../app-change.service';
import { createAppScaffold } from '../../scaffold/app-scaffold';
import type { AppVersion } from '../app-version.entity';
import { AppVersionService } from '../app-version.service';

function setup() {
	const versions = mock<AppVersionService>();
	const builds = mock<AppBuildService>();
	versions.saveSource.mockResolvedValue(mock<AppVersion>({ id: 'new-version' }));
	builds.build.mockResolvedValue({
		versionId: 'new-version',
		status: 'failed',
		attempts: 1,
		statusUpdatedAt: null,
		diagnostics: { stage: 'build', message: 'Fix the source.', log: 'Error' },
	});
	return { versions, builds, service: new AppChangeService(versions, builds, mock<Logger>()) };
}

describe('AppChangeService', () => {
	it('returns build diagnostics for the accepted version', async () => {
		const { service, versions, builds } = setup();
		const files = createAppScaffold();
		expect(await service.commit('project', 'app', 'draft', files)).toMatchObject({
			versionId: 'new-version',
			status: 'failed',
			diagnostics: { message: 'Fix the source.' },
		});
		expect(versions.saveSource).toHaveBeenCalledWith(
			'project',
			'app',
			'draft',
			files,
			null,
			undefined,
		);
		expect(builds.build).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
			changeSource: 'chat',
		});
	});

	it.each([
		{
			reason: 'shutdown',
			error: new ConflictError('The instance is stopping.'),
			status: 'queued',
			attempts: 0,
		},
		{
			reason: 'another main claiming the build',
			error: new ConflictError('The app build is already running.'),
			status: 'running',
			attempts: 1,
		},
	] as const)('returns the saved version status for $reason', async (testCase) => {
		const { service, versions, builds } = setup();
		const status = {
			versionId: 'new-version',
			status: testCase.status,
			attempts: testCase.attempts,
			statusUpdatedAt: null,
		};
		builds.build.mockRejectedValue(testCase.error);
		builds.status.mockResolvedValue(status);

		expect(await service.commit('project', 'app', 'draft', createAppScaffold())).toEqual(status);
		expect(versions.saveSource).toHaveBeenCalledOnce();
		expect(builds.status).toHaveBeenCalledExactlyOnceWith('project', 'app', 'new-version');
	});

	it('rejects source changes during shutdown', async () => {
		const { service, versions, builds } = setup();
		builds.assertNotStopping.mockImplementation(() => {
			throw new ConflictError('The instance is stopping.');
		});

		await expect(service.commit('project', 'app', 'draft', createAppScaffold())).rejects.toThrow(
			ConflictError,
		);
		expect(versions.saveSource).not.toHaveBeenCalled();
		expect(builds.build).not.toHaveBeenCalled();
		expect(builds.status).not.toHaveBeenCalled();
	});

	it.each([
		new Error('Database unavailable.'),
		new NotFoundError('App not found.'),
		new ForbiddenError('Access denied.'),
	])('preserves other build errors: %s', async (error) => {
		const { service, builds } = setup();
		builds.build.mockRejectedValue(error);

		await expect(service.commit('project', 'app', 'draft', createAppScaffold())).rejects.toBe(
			error,
		);
		expect(builds.status).not.toHaveBeenCalled();
	});

	it('does not start a build when the source commit conflicts', async () => {
		const { service, versions, builds } = setup();
		versions.saveSource.mockRejectedValue(new ConflictError('Draft changed.'));
		await expect(service.commit('project', 'app', 'draft', createAppScaffold())).rejects.toThrow(
			ConflictError,
		);
		expect(builds.build).not.toHaveBeenCalled();
		expect(builds.status).not.toHaveBeenCalled();
	});

	it('uses the same commit path for scaffold source', async () => {
		const { service, versions, builds } = setup();
		await service.scaffold('project', 'app');
		expect(versions.saveSource).toHaveBeenCalledWith(
			'project',
			'app',
			null,
			createAppScaffold(),
			null,
			undefined,
		);
		expect(builds.build).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
			changeSource: 'initial',
		});
	});

	describe('startRestore', () => {
		it('restores the version into a new version and starts its build without waiting', async () => {
			const { service, versions, builds } = setup();
			versions.restoreSource.mockResolvedValue(mock<AppVersion>({ id: 'new-version' }));

			const version = await service.startRestore('project', 'app', 'old-version', 'draft');

			expect(version.id).toBe('new-version');
			expect(versions.restoreSource).toHaveBeenCalledWith('project', 'app', 'old-version', 'draft');
			expect(builds.startBuild).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
				changeSource: 'restore',
			});
			expect(builds.build).not.toHaveBeenCalled();
		});

		it('passes the actor to the restored version build', async () => {
			const { service, versions, builds } = setup();
			versions.restoreSource.mockResolvedValue(mock<AppVersion>({ id: 'new-version' }));

			await service.startRestore('project', 'app', 'old-version', 'draft', {
				userId: 'user-1',
			});

			expect(builds.startBuild).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
				userId: 'user-1',
				changeSource: 'restore',
			});
		});

		it('keeps the restored version when its build cannot start', async () => {
			const { service, versions, builds } = setup();
			versions.restoreSource.mockResolvedValue(mock<AppVersion>({ id: 'new-version' }));
			builds.startBuild.mockRejectedValue(new ConflictError('The build is already running.'));

			expect((await service.startRestore('project', 'app', 'old-version', 'draft')).id).toBe(
				'new-version',
			);
		});

		it('does not start a build when the draft changed', async () => {
			const { service, versions, builds } = setup();
			versions.restoreSource.mockRejectedValue(new ConflictError('The app draft changed.'));

			await expect(service.startRestore('project', 'app', 'old-version', 'stale')).rejects.toThrow(
				ConflictError,
			);
			expect(builds.startBuild).not.toHaveBeenCalled();
		});

		it('rejects a restore during shutdown', async () => {
			const { service, versions, builds } = setup();
			builds.assertNotStopping.mockImplementation(() => {
				throw new ConflictError('The instance is stopping.');
			});

			await expect(service.startRestore('project', 'app', 'old-version', 'draft')).rejects.toThrow(
				ConflictError,
			);
			expect(versions.restoreSource).not.toHaveBeenCalled();
		});
	});

	describe('saveBindings', () => {
		const bindings: AppBinding[] = [{ key: 'submit', kind: 'workflow', workflowId: 'w1' }];

		it('copies a built draft with the new bindings and does not build', async () => {
			const { service, versions, builds } = setup();
			const copy = { id: 'copy', bindings } as AppVersion;
			const previousBindings: AppBinding[] = [{ key: 'old', kind: 'workflow', workflowId: 'w0' }];
			versions.getVersion.mockResolvedValue({
				id: 'draft',
				buildStatus: 'succeeded',
				bundleArtifactId: 4,
				bindings: previousBindings,
			} as AppVersion);
			versions.copyDraft.mockResolvedValue(copy);

			expect(await service.saveBindings('project', 'app', 'draft', bindings)).toEqual({
				version: copy,
				previousBindings,
			});
			expect(versions.copyDraft).toHaveBeenCalledWith('project', 'app', 'draft', bindings);
			expect(versions.saveSource).not.toHaveBeenCalled();
			expect(builds.startBuild).not.toHaveBeenCalled();
		});

		it.each(['queued', 'running', 'failed'] as const)(
			'saves the source of a %s draft with the new bindings and starts its build',
			async (buildStatus) => {
				const { service, versions, builds } = setup();
				versions.getVersion.mockResolvedValue({
					id: 'draft',
					label: 'Draft',
					buildStatus,
					bundleArtifactId: null,
				} as AppVersion);
				versions.readSource.mockResolvedValue(createAppScaffold());

				const { version } = await service.saveBindings('project', 'app', 'draft', bindings);

				expect(version.id).toBe('new-version');
				expect(versions.saveSource).toHaveBeenCalledWith(
					'project',
					'app',
					'draft',
					createAppScaffold(),
					'Draft',
					bindings,
				);
				expect(builds.startBuild).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
					changeSource: 'bindings',
				});
				expect(versions.copyDraft).not.toHaveBeenCalled();
			},
		);

		it('saves the first version of an app from the scaffold with the bindings', async () => {
			const { service, versions, builds } = setup();

			const result = await service.saveBindings('project', 'app', null, bindings, {
				userId: 'user-1',
			});

			expect(result.version.id).toBe('new-version');
			expect(result.previousBindings).toEqual([]);
			expect(versions.getVersion).not.toHaveBeenCalled();
			expect(versions.saveSource).toHaveBeenCalledWith(
				'project',
				'app',
				null,
				createAppScaffold(),
				null,
				bindings,
			);
			expect(builds.startBuild).toHaveBeenCalledWith('project', 'app', 'new-version', false, {
				userId: 'user-1',
				changeSource: 'bindings',
			});
		});

		it('keeps the saved bindings when the build cannot start', async () => {
			const { service, versions, builds } = setup();
			versions.getVersion.mockResolvedValue({ id: 'draft', buildStatus: 'queued' } as AppVersion);
			versions.readSource.mockResolvedValue(createAppScaffold());
			builds.startBuild.mockRejectedValue(new ConflictError('The app build is already running.'));

			expect((await service.saveBindings('project', 'app', 'draft', bindings)).version.id).toBe(
				'new-version',
			);
		});

		it('rejects binding changes during shutdown', async () => {
			const { service, versions, builds } = setup();
			builds.assertNotStopping.mockImplementation(() => {
				throw new ConflictError('The instance is stopping.');
			});

			await expect(service.saveBindings('project', 'app', 'draft', bindings)).rejects.toThrow(
				ConflictError,
			);
			expect(versions.getVersion).not.toHaveBeenCalled();
		});
	});
});
