import type { Workspace } from '@n8n/agents';
import type { User } from '@n8n/db';
import { restoreApp } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';

import { AppDraftService } from '../app-draft.service';
import type { AppPublishService } from '../app-publish.service';
import type { App } from '../app.entity';
import type { AppsService } from '../apps.service';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/user/workspace')),
}));
vi.mock('@n8n/instance-ai', () => ({ restoreApp: vi.fn() }));

const APP = { id: 'app-1', name: 'Greeter', namespace: 'greeter' } as App;
const USER = { id: 'user-1' } as User;
const restoreAppMock = vi.mocked(restoreApp);

function createService() {
	const appsService = mock<AppsService>();
	appsService.getApp.mockResolvedValue(APP);
	appsService.listVersions.mockResolvedValue([]);
	const appPublishService = mock<AppPublishService>();
	const snapshotService = mock<AppSourceSnapshotService>();
	const service = new AppDraftService(appsService, appPublishService, snapshotService);
	return { service, appsService, snapshotService };
}

function createDraft(files: Record<string, string>) {
	const filesystem = {
		exists: vi.fn(async (file: string) =>
			Object.keys(files).some((f) => `/home/user/workspace/apps/greeter/${f}` === file),
		),
		readFile: vi.fn(
			async (file: string) => files[file.replace('/home/user/workspace/apps/greeter/', '')],
		),
		writeFile: vi.fn().mockResolvedValue(undefined),
	};
	const draft = { filesystem } as unknown as Workspace;
	return { draft, filesystem };
}

beforeEach(() => {
	restoreAppMock.mockReset();
});

describe('AppDraftService', () => {
	describe('listFiles', () => {
		it('stores the app sandbox first, then lists the newest version', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft } = createDraft({ 'package.json': '{}' });
			appsService.listVersions.mockResolvedValue([{ id: 's-2' }, { id: 'v-1' }] as never);
			appsService.listVersionFiles.mockResolvedValue(['package.json', 'src/main.ts']);

			const result = await service.listFiles('app-1', USER, draft);

			expect(snapshotService.snapshotAfterRun).toHaveBeenCalledWith('app-1', USER, draft);
			expect(appsService.listVersionFiles).toHaveBeenCalledWith('app-1', 's-2');
			expect(result).toEqual({ versionId: 's-2', files: ['package.json', 'src/main.ts'] });
		});

		it('returns null for an app without any version', async () => {
			const { service, snapshotService } = createService();

			expect(await service.listFiles('app-1', USER)).toBeNull();
			expect(snapshotService.snapshotAfterRun).not.toHaveBeenCalled();
		});
	});

	describe('write', () => {
		it('hands the callback the current draft content and writes what it returns', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft, filesystem } = createDraft({
				'package.json': '{}',
				'src/main.ts': 'export const x = 1;',
			});
			appsService.listVersions.mockResolvedValue([{ id: 's-9' }] as never);
			const filesFor = vi.fn(async (read: (file: string) => Promise<string | undefined>) => ({
				'src/main.ts': `${await read('src/main.ts')}\nexport const y = 2;`,
				'src/new.ts': String(await read('src/new.ts')),
			}));

			const result = await service.write('app-1', USER, filesFor, draft);

			expect(restoreAppMock).not.toHaveBeenCalled();
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/src/main.ts',
				'export const x = 1;\nexport const y = 2;',
				undefined,
			);
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/src/new.ts',
				'undefined',
				undefined,
			);
			expect(snapshotService.snapshotAfterRun).toHaveBeenCalledWith('app-1', USER, draft);
			expect(result).toEqual({ versionId: 's-9' });
		});

		it('restores the app into a sandbox that does not hold it before writing', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft, filesystem } = createDraft({});
			appsService.listVersions.mockResolvedValue([{ id: 's-5' }] as never);
			restoreAppMock.mockImplementation(async () => {
				filesystem.exists.mockResolvedValue(true);
				return { appId: 'app-1' } as never;
			});

			const result = await service.write(
				'app-1',
				USER,
				async () => ({ 'src/main.ts': 'x' }),
				draft,
			);

			expect(restoreAppMock).toHaveBeenCalledWith(
				expect.objectContaining({ appWorkspace: expect.anything() }),
				{ action: 'restore', appId: 'app-1' },
			);
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/src/main.ts',
				'x',
				undefined,
			);
			expect(snapshotService.snapshotAfterRun).toHaveBeenCalledWith('app-1', USER, draft);
			expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
			expect(result).toEqual({ versionId: 's-5' });
		});

		it('reports a failed restore without writing or snapshotting', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft, filesystem } = createDraft({});
			restoreAppMock.mockResolvedValue({ error: true, stage: 'restore', message: 'unpack failed' });

			const result = await service.write(
				'app-1',
				USER,
				async () => ({ 'src/main.ts': 'x' }),
				draft,
			);

			expect(result).toEqual({ error: true, message: 'unpack failed' });
			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(snapshotService.snapshotAfterRun).not.toHaveBeenCalled();
			expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
		});

		it('surfaces what the callback throws without writing anything', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft, filesystem } = createDraft({ 'package.json': '{}' });

			await expect(
				service.write(
					'app-1',
					USER,
					async () => {
						throw new Error('nope');
					},
					draft,
				),
			).rejects.toThrow('nope');

			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(snapshotService.snapshotAfterRun).not.toHaveBeenCalled();
			expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
		});
	});
});
