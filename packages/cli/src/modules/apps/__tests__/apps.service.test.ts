import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AppVersion } from '../app-version.entity';
import type { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import { AppNotFoundError } from '../errors/app-not-found.error';
import { AppQuotaExceededError } from '../errors/app-quota-exceeded.error';
import type { PageRepository } from '../page.repository';
import { AppsService } from '../apps.service';

describe('AppsService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let globalConfig: GlobalConfig;
	let service: AppsService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		appVersionService = mock<AppVersionService>();
		globalConfig = mock<GlobalConfig>({ apps: { maxAppsPerProject: 20 } });
		service = new AppsService(
			appRepository,
			mock<PageRepository>(),
			mock<WorkflowFinderService>(),
			appVersionService,
			globalConfig,
		);
	});

	describe('createApp', () => {
		it('throws AppQuotaExceededError when the project already has maxAppsPerProject apps', async () => {
			appRepository.countByProjectId.mockResolvedValue(20);

			await expect(
				service.createApp('project-1', { name: 'App', namespace: 'app' }),
			).rejects.toThrow(AppQuotaExceededError);

			expect(appRepository.createApp).not.toHaveBeenCalled();
		});

		it('creates the app when under quota', async () => {
			appRepository.countByProjectId.mockResolvedValue(19);

			await service.createApp('project-1', { name: 'App', namespace: 'app' });

			expect(appRepository.createApp).toHaveBeenCalledWith('project-1', 'App', 'app');
		});
	});

	describe('createVersion', () => {
		it('throws AppNotFoundError before touching appVersionService.create when the app does not exist', async () => {
			appRepository.findOneBy.mockResolvedValue(null);

			await expect(
				service.createVersion('missing-app', Buffer.from(''), Buffer.from('')),
			).rejects.toThrow(AppNotFoundError);

			expect(appVersionService.create).not.toHaveBeenCalled();
		});

		it('passes the app projectId through to appVersionService.create', async () => {
			const app = mock<App>({ id: 'app-1', projectId: 'project-1' });
			appRepository.findOneBy.mockResolvedValue(app);
			appVersionService.create.mockResolvedValue(mock<AppVersion>({ id: 'v-1' }));
			const source = Buffer.from('source');
			const dist = Buffer.from('dist');

			await service.createVersion('app-1', source, dist);

			expect(appVersionService.create).toHaveBeenCalledWith('app-1', 'project-1', source, dist);
			expect(appVersionService.toResponse).toHaveBeenCalledWith(expect.anything(), 'v-1');
		});
	});
});
