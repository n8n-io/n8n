import type { AppBuildResponse, AppResponse } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { AppArchive } from '../../app-archive';
import { AppsConfig } from '../../apps.config';
import { AppsService } from '../../apps.service';
import { createAppScaffold } from '../../scaffold/app-scaffold';
import { AppChangeService } from '../app-change.service';
import { AppSourceArchiveService } from '../app-source-archive.service';
import { AppVersionService } from '../app-version.service';

const BUILD: AppBuildResponse = {
	versionId: 'new-version',
	status: 'succeeded',
	attempts: 1,
	statusUpdatedAt: null,
};

function setup(draftVersionId: string | null) {
	const apps = mock<AppsService>();
	const versions = mock<AppVersionService>();
	const changes = mock<AppChangeService>();
	const archives = new AppArchive(new AppsConfig());
	apps.getApp.mockResolvedValue(mock<AppResponse>({ draftVersionId }));
	versions.readSource.mockResolvedValue(new Map([['src/App.vue', Buffer.from('<template/>')]]));
	changes.commit.mockResolvedValue(BUILD);
	const service = new AppSourceArchiveService(apps, versions, changes, archives);
	return { service, versions, changes, archives };
}

describe('AppSourceArchiveService', () => {
	it('exports the draft source with its version as the base', async () => {
		const { service, versions, archives } = setup('draft');

		const { baseVersionId, archive } = await service.exportDraft('project', 'app');

		expect(baseVersionId).toBe('draft');
		expect(versions.readSource).toHaveBeenCalledWith('project', 'app', 'draft');
		expect(await archives.unpack(archive)).toEqual(
			new Map([['src/App.vue', Buffer.from('<template/>')]]),
		);
	});

	it('exports the scaffold for an app without a version', async () => {
		const { service, versions, archives } = setup(null);

		const { baseVersionId, archive } = await service.exportDraft('project', 'app');

		expect(baseVersionId).toBeNull();
		expect(versions.readSource).not.toHaveBeenCalled();
		expect(await archives.unpack(archive)).toEqual(createAppScaffold());
	});

	it('commits the files of the archive on top of the base version', async () => {
		const { service, changes, archives } = setup('draft');
		const files = new Map([['src/App.vue', Buffer.from('<template>New</template>')]]);

		const result = await service.commit(
			'project',
			'app',
			'draft',
			await archives.pack(files),
			'Edit',
		);

		expect(result).toEqual(BUILD);
		expect(changes.commit).toHaveBeenCalledWith('project', 'app', 'draft', files, 'Edit');
	});
});
