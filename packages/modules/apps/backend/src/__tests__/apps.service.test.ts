import { CreateAppDto, ListAppsQueryDto, UpdateAppDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService, UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { DbLock, DbLockService, type OperationContext, type User } from '@n8n/db';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { appStorageLockSubKey } from '../storage/app-storage-lock';
import { AppVersionRepository } from '../versions/app-version.repository';
import { AppWorkspaceService } from '../build/app-workspace.service';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';
import { AppsService } from '../apps.service';
import { AppHostService } from '../serving/app-host.service';

function createService({ deploymentType = 'default', host = 'n8n.example.net' } = {}) {
	const appRepository = mock<AppRepository>();
	const appVersions = mock<AppVersionRepository>();
	const projectScopeService = mock<ProjectScopeService>();
	const locks = mock<DbLockService>();
	const workspaces = mock<AppWorkspaceService>();
	const logger = mock<Logger>();
	const configuredHosts = new AppHostService(
		mock<AppsConfig>({ baseUrl: 'https://apps.example.com' }),
		mock<GlobalConfig>({
			host,
			deployment: mock<GlobalConfig['deployment']>({ type: deploymentType }),
		}),
		mock<UrlService>({
			getInstanceBaseUrl: () => 'https://n8n.example.net',
			getWebhookBaseUrl: () => 'https://hooks.example.net',
		}),
	);
	const hosts = mock<AppHostService>();
	hosts.origin.mockImplementation((namespace) => configuredHosts.origin(namespace));
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn({}));
	appVersions.hasRunningBuild.mockResolvedValue(false);
	const service = new AppsService(
		appRepository,
		appVersions,
		projectScopeService,
		locks,
		workspaces,
		logger,
		hosts,
	);
	return {
		service,
		appRepository,
		appVersions,
		projectScopeService,
		locks,
		workspaces,
		logger,
		hosts,
	};
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
		const { service, appRepository, hosts } = createService();
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
		hosts.origin.mockReturnValue('https://updated-app.apps.example.com');

		const response = await service.updateApp('project-1', appId, dto);

		expect(appRepository.updateApp).toHaveBeenCalledExactlyOnceWith('project-1', appId, dto);
		expect(hosts.origin).toHaveBeenCalledWith('updated-app');
		expect(response).toEqual({
			id: appId,
			projectId: 'project-1',
			name: 'Updated app',
			namespace: 'updated-app',
			visibility: 'public',
			draftVersionId: '22222222-2222-4222-8222-222222222222',
			publishedVersionId: '33333333-3333-4333-8333-333333333333',
			createdAt: '2026-10-13T00:00:00.000Z',
			publishedUrl: 'https://updated-app.apps.example.com',
			updatedAt: '2026-10-14T00:00:00.000Z',
		});
	});

	it.each([
		{ deploymentType: 'cloud', host: 'test.app.n8n.cloud', maxLength: 57 },
		{ deploymentType: 'cloud', host: 'foo--bar.app.n8n.cloud', maxLength: 53 },
		{ deploymentType: 'default', host: 'test.app.n8n.cloud', maxLength: 63 },
	])('accepts namespaces at the limit for $deploymentType host $host', async (config) => {
		const { service, appRepository } = createService(config);
		const appId = '11111111-1111-4111-8111-111111111111';
		const namespace = 'a'.repeat(config.maxLength);
		const dto = CreateAppDto.parse({ name: 'App', namespace });
		const app = mock<App>({
			id: appId,
			...dto,
			publishedVersionId: null,
			createdAt: new Date('2026-10-13T00:00:00.000Z'),
			updatedAt: new Date('2026-10-13T00:00:00.000Z'),
		});
		appRepository.projectExists.mockResolvedValue(true);
		appRepository.createApp.mockResolvedValue(app);
		appRepository.updateApp.mockResolvedValue(app);

		await expect(service.createApp('project-1', dto)).resolves.toMatchObject({ namespace });
		await expect(service.updateApp('project-1', appId, { namespace })).resolves.toMatchObject({
			namespace,
		});
		expect(appRepository.createApp).toHaveBeenCalledExactlyOnceWith('project-1', dto);
		expect(appRepository.updateApp).toHaveBeenCalledExactlyOnceWith('project-1', appId, {
			namespace,
		});
	});

	it.each([
		{ host: 'test.app.n8n.cloud', namespace: 'a'.repeat(58) },
		{ host: 'foo--bar.app.n8n.cloud', namespace: 'a'.repeat(54) },
	])(
		'rejects namespace "$namespace" before writing for Cloud host $host',
		async ({ host, namespace }) => {
			const { service, appRepository } = createService({ deploymentType: 'cloud', host });
			const appId = '11111111-1111-4111-8111-111111111111';
			const dto = CreateAppDto.parse({ name: 'App', namespace });
			appRepository.projectExists.mockResolvedValue(true);
			const message =
				'This namespace produces an invalid app URL for this instance. Choose another namespace.';

			await expect(service.createApp('project-1', dto)).rejects.toThrow(message);
			await expect(
				service.updateApp('project-1', appId, { namespace: dto.namespace }),
			).rejects.toThrow(message);
			expect(appRepository.createApp).not.toHaveBeenCalled();
			expect(appRepository.updateApp).not.toHaveBeenCalled();
		},
	);

	it('updates other fields without validating the existing namespace', async () => {
		const { service, appRepository, hosts } = createService({
			deploymentType: 'cloud',
			host: 'test.app.n8n.cloud',
		});
		const appId = '11111111-1111-4111-8111-111111111111';
		appRepository.updateApp.mockResolvedValue(
			mock<App>({
				id: appId,
				name: 'Updated app',
				namespace: 'a'.repeat(63),
				publishedVersionId: null,
				createdAt: new Date('2026-10-13T00:00:00.000Z'),
				updatedAt: new Date('2026-10-13T00:00:00.000Z'),
			}),
		);

		await expect(
			service.updateApp('project-1', appId, { name: 'Updated app' }),
		).resolves.toMatchObject({
			name: 'Updated app',
		});
		expect(appRepository.updateApp).toHaveBeenCalledExactlyOnceWith('project-1', appId, {
			name: 'Updated app',
		});
		expect(hosts.origin).not.toHaveBeenCalled();
	});

	it('rejects empty metadata updates', async () => {
		const { service, appRepository } = createService();

		await expect(service.updateApp('project-1', 'app-1', {})).rejects.toThrow(BadRequestError);
		expect(appRepository.updateApp).not.toHaveBeenCalled();
	});

	it('returns not found when an app is not in the requested project', async () => {
		const { service, appRepository } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		appRepository.findInProject.mockResolvedValue(null);

		await expect(service.getApp('project-1', appId)).rejects.toThrow(NotFoundError);
		expect(appRepository.findInProject).toHaveBeenCalledWith('project-1', appId);
	});

	it.each(['getApp', 'updateApp', 'deleteApp'] as const)(
		'returns not found for a malformed app ID in %s',
		async (method) => {
			const { service, appRepository, workspaces } = createService();

			await expect(service[method]('project-1', 'app-1', { name: 'Updated app' })).rejects.toThrow(
				NotFoundError,
			);
			expect(appRepository.findInProject).not.toHaveBeenCalled();
			expect(appRepository.updateApp).not.toHaveBeenCalled();
			expect(appRepository.deleteInProject).not.toHaveBeenCalled();
			expect(workspaces.delete).not.toHaveBeenCalled();
		},
	);

	it.each([1, 0])('handles app deletion when %i rows match', async (affected) => {
		const { service, appRepository, appVersions, locks, workspaces } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		const ctx = mock<OperationContext>();
		appRepository.findInProject.mockResolvedValue(mock<App>({ id: appId }));
		appRepository.deleteInProject.mockResolvedValue(affected === 1);
		locks.withLockContext.mockImplementation(async (_key, fn) => {
			expect(appVersions.hasRunningBuild).not.toHaveBeenCalled();
			const result = await fn(ctx);
			expect(appVersions.hasRunningBuild).toHaveBeenCalledExactlyOnceWith(appId, ctx);
			expect(workspaces.delete).not.toHaveBeenCalled();
			return result;
		});

		const deletion = service.deleteApp('project-1', appId);
		if (affected) {
			await expect(deletion).resolves.toBeUndefined();
			expect(workspaces.delete).toHaveBeenCalledExactlyOnceWith('project-1', appId);
		} else {
			await expect(deletion).rejects.toThrow(NotFoundError);
			expect(workspaces.delete).not.toHaveBeenCalled();
		}
		expect(appRepository.findInProject).toHaveBeenCalledWith('project-1', appId, ctx);
		expect(appRepository.deleteInProject).toHaveBeenCalledWith('project-1', appId, ctx);
		expect(locks.withLockContext).toHaveBeenCalledWith(DbLock.APPS_STORAGE, expect.any(Function), {
			subKey: appStorageLockSubKey(appId),
		});
	});

	it('returns not found before checking builds when the app is not in the project', async () => {
		const { service, appRepository, appVersions, workspaces } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		appRepository.findInProject.mockResolvedValue(null);
		appVersions.hasRunningBuild.mockResolvedValue(true);

		await expect(service.deleteApp('project-1', appId)).rejects.toThrow(NotFoundError);
		expect(appVersions.hasRunningBuild).not.toHaveBeenCalled();
		expect(appRepository.deleteInProject).not.toHaveBeenCalled();
		expect(workspaces.delete).not.toHaveBeenCalled();
	});

	it('blocks deletion during a running build and allows it after the build finishes', async () => {
		const { service, appRepository, appVersions, locks, workspaces } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		const ctx = mock<OperationContext>();
		locks.withLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
		appRepository.findInProject.mockResolvedValue(mock<App>({ id: appId }));
		appRepository.deleteInProject.mockResolvedValue(true);
		appVersions.hasRunningBuild.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		const deletion = service.deleteApp('project-1', appId);
		await expect(deletion).rejects.toThrow(ConflictError);
		await expect(deletion).rejects.toThrow(
			'The app has a running build. Wait for the build to finish before deleting it.',
		);
		expect(appVersions.hasRunningBuild).toHaveBeenCalledExactlyOnceWith(appId, ctx);
		expect(appRepository.deleteInProject).not.toHaveBeenCalled();
		expect(workspaces.delete).not.toHaveBeenCalled();

		await expect(service.deleteApp('project-1', appId)).resolves.toBeUndefined();
		expect(appRepository.deleteInProject).toHaveBeenCalledExactlyOnceWith('project-1', appId, ctx);
		expect(workspaces.delete).toHaveBeenCalledExactlyOnceWith('project-1', appId);
	});

	it('completes app deletion when sandbox teardown fails', async () => {
		const { service, appRepository, workspaces, logger } = createService();
		const appId = '11111111-1111-4111-8111-111111111111';
		const error = new Error('Provider unavailable.');
		appRepository.findInProject.mockResolvedValue(mock<App>({ id: appId }));
		appRepository.deleteInProject.mockResolvedValue(true);
		workspaces.delete.mockRejectedValue(error);

		await expect(service.deleteApp('project-1', appId)).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Could not delete app sandbox.', { appId, error });
	});
});
