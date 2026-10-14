import { CreateAppDto, ListAppsQueryDto } from '@n8n/api-types';
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

	it('creates an app with n8n authentication by default', async () => {
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
			expect.objectContaining({ auth: 'n8n' }),
		);
		expect(response.auth).toBe('n8n');
		expect(response).not.toHaveProperty('visibility');
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

	it('transfers apps between projects validated by the caller', async () => {
		const { service, appRepository } = createService();

		await service.transferApps('source', 'target');

		expect(appRepository.update).toHaveBeenCalledWith(
			{ projectId: 'source' },
			{ projectId: 'target' },
		);
		expect(appRepository.projectExists).not.toHaveBeenCalled();
	});
});
