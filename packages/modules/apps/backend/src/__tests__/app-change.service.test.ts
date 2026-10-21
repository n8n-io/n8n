import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AppBuildService } from '../app-build.service';
import { AppChangeService } from '../app-change.service';
import { createAppScaffold } from '../app-scaffold';
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
	return { versions, builds, service: new AppChangeService(versions, builds) };
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
		expect(versions.saveSource).toHaveBeenCalledWith('project', 'app', 'draft', files, null);
		expect(builds.build).toHaveBeenCalledWith('project', 'app', 'new-version');
	});

	it('does not start a build when the source commit conflicts', async () => {
		const { service, versions, builds } = setup();
		versions.saveSource.mockRejectedValue(new ConflictError('Draft changed.'));
		await expect(service.commit('project', 'app', 'draft', createAppScaffold())).rejects.toThrow(
			ConflictError,
		);
		expect(builds.build).not.toHaveBeenCalled();
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
		);
		expect(builds.build).toHaveBeenCalledWith('project', 'app', 'new-version');
	});

	it('restores source and its label into a new version and builds that version', async () => {
		const { service, versions, builds } = setup();
		versions.getVersion.mockResolvedValue(mock<AppVersion>({ label: 'Restore' }));
		versions.readSource.mockResolvedValue(createAppScaffold());
		await service.restore('project', 'app', 'old-version', 'draft');
		expect(versions.saveSource).toHaveBeenCalledWith(
			'project',
			'app',
			'draft',
			createAppScaffold(),
			'Restore',
		);
		expect(builds.build).toHaveBeenCalledWith('project', 'app', 'new-version');
	});
});
