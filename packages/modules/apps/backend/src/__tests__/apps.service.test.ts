import { CreateAppDto, ListAppsQueryDto, UpdateAppDto } from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppsService } from '../apps.service';

function createService() {
	const appRepository = mock<AppRepository>();
	const projectScopeService = mock<ProjectScopeService>();
	const service = new AppsService(appRepository, projectScopeService);
	return { service, appRepository, projectScopeService };
}

describe('AppsService', () => {
	it.each([
		{ access: 'project list grants', projectIds: ['project-1'] },
		{ access: 'no list grants', projectIds: [] },
		{ access: 'global list grants', projectIds: null },
	])('filters the overview through $access', async ({ projectIds }) => {
		const { service, appRepository, projectScopeService } = createService();
		const user = mock<User>();
		const query = ListAppsQueryDto.parse({});
		projectScopeService.getProjectIds.mockResolvedValue(projectIds);
		appRepository.list.mockResolvedValue({ data: [], count: 0 });

		expect(await service.listAppsForUser(user, query)).toEqual({ data: [], count: 0 });
		expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['app:list']);
		expect(appRepository.list).toHaveBeenCalledWith(projectIds, query);
	});

	it('creates an app with project visibility by default', async () => {
		const { service, appRepository } = createService();
		const dto = CreateAppDto.parse({ name: 'App', namespace: 'app' });
		const app = mock<App>({
			id: '11111111-1111-4111-8111-111111111111',
			projectId: 'project-1',
			...dto,
			draftVersionId: null,
			publishedVersionId: null,
			createdAt: new Date('2026-10-13T00:00:00.000Z'),
			updatedAt: new Date('2026-10-13T00:00:00.000Z'),
		});
		appRepository.projectExists.mockResolvedValue(true);
		appRepository.createApp.mockResolvedValue(app);

		const response = await service.createApp('project-1', dto);
		expect(appRepository.createApp).toHaveBeenCalledWith(
			'project-1',
			expect.objectContaining({ visibility: 'project' }),
		);
		expect(response.visibility).toBe('project');
	});

	it('returns not found when creating an app in a missing project', async () => {
		const { service, appRepository } = createService();
		const dto = CreateAppDto.parse({ name: 'App', namespace: 'app' });
		appRepository.projectExists.mockResolvedValue(false);

		const creation = service.createApp('project-1', dto);
		await expect(creation).rejects.toThrow(NotFoundError);
		await expect(creation).rejects.toThrow('Project not found');
		expect(appRepository.projectExists).toHaveBeenCalledExactlyOnceWith('project-1');
		expect(appRepository.createApp).not.toHaveBeenCalled();
	});

	it('returns not found when listing apps in a missing project', async () => {
		const { service, appRepository } = createService();
		const query = ListAppsQueryDto.parse({});
		appRepository.projectExists.mockResolvedValue(false);

		const listing = service.listApps('project-1', query);
		await expect(listing).rejects.toThrow(NotFoundError);
		await expect(listing).rejects.toThrow('Project not found');
		expect(appRepository.projectExists).toHaveBeenCalledExactlyOnceWith('project-1');
		expect(appRepository.list).not.toHaveBeenCalled();
	});

	it('updates an app and maps the returned row to the response', async () => {
		const { service, appRepository } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		const dto = UpdateAppDto.parse({
			name: 'Updated app',
			namespace: 'updated-app',
			visibility: 'public',
		});
		const app = mock<App>({
			id: appId,
			projectId: 'project-1',
			...dto,
			draftVersionId: '22222222-2222-4222-8222-222222222222',
			publishedVersionId: '33333333-3333-4333-8333-333333333333',
			createdAt: new Date('2026-10-13T00:00:00.000Z'),
			updatedAt: new Date('2026-10-14T00:00:00.000Z'),
		});
		appRepository.updateApp.mockResolvedValue(app);

		const response = await service.updateApp('project-1', appId, dto);

		expect(appRepository.updateApp).toHaveBeenCalledExactlyOnceWith('project-1', appId, dto);
		expect(response).toEqual({
			id: appId,
			projectId: 'project-1',
			name: 'Updated app',
			namespace: 'updated-app',
			visibility: 'public',
			draftVersionId: '22222222-2222-4222-8222-222222222222',
			publishedVersionId: '33333333-3333-4333-8333-333333333333',
			createdAt: '2026-10-13T00:00:00.000Z',
			updatedAt: '2026-10-14T00:00:00.000Z',
		});
	});

	it('rejects empty metadata updates', async () => {
		const { service, appRepository } = createService();

		await expect(service.updateApp('project-1', 'app-1', {})).rejects.toThrow(BadRequestError);
		expect(appRepository.updateApp).not.toHaveBeenCalled();
	});

	it('returns not found when an app is not in the requested project', async () => {
		const { service, appRepository } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		appRepository.findOneBy.mockResolvedValue(null);

		await expect(service.getApp('project-1', appId)).rejects.toThrow(NotFoundError);
		expect(appRepository.findOneBy).toHaveBeenCalledWith({ id: appId, projectId: 'project-1' });
	});

	it.each(['getApp', 'updateApp', 'deleteApp'] as const)(
		'returns not found for a malformed app ID in %s',
		async (method) => {
			const { service, appRepository } = createService();

			await expect(service[method]('project-1', 'app-1', { name: 'Updated app' })).rejects.toThrow(
				NotFoundError,
			);
			expect(appRepository.findOneBy).not.toHaveBeenCalled();
			expect(appRepository.updateApp).not.toHaveBeenCalled();
			expect(appRepository.delete).not.toHaveBeenCalled();
		},
	);

	it.each([1, 0])('handles app deletion when %i rows match', async (affected) => {
		const { service, appRepository } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		appRepository.delete.mockResolvedValue({ affected, raw: [] });

		const deletion = service.deleteApp('project-1', appId);
		if (affected) {
			await expect(deletion).resolves.toBeUndefined();
		} else {
			await expect(deletion).rejects.toThrow(NotFoundError);
		}
		expect(appRepository.delete).toHaveBeenCalledWith({ id: appId, projectId: 'project-1' });
	});
});
