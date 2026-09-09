import type { Workspace } from '@n8n/agents';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { App } from '@/modules/apps/app.entity';
import type { AppsService } from '@/modules/apps/apps.service';

import { AppPreviewController } from '../app-preview.controller';
import type { AppPreviewService } from '../app-preview.service';
import type { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import type { InstanceAiService } from '../../instance-ai.service';

describe('AppPreviewController', () => {
	const appPreviewService = mock<AppPreviewService>();
	const appsService = mock<AppsService>();
	const instanceAiService = mock<InstanceAiService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const controller = new AppPreviewController(
		appPreviewService,
		appsService,
		instanceAiService,
		memoryService,
	);
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({
		user,
		params: { projectId: 'project-1' },
	});
	const res = mock<Response>();
	const app = mock<App>({ id: 'app-1', projectId: 'project-1', namespace: 'greeter' });
	const sandbox = { url: 'http://sandbox.test', apiKey: 'key' };

	beforeEach(() => {
		vi.clearAllMocks();
		appsService.getApp.mockResolvedValue(app);
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getN8nSandboxConfig.mockResolvedValue(sandbox);
		appPreviewService.ensure.mockResolvedValue({ status: 'starting' });
	});

	it('gates the route with a project-scoped app:read check', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AppPreviewController as never,
		);
		const route = metadata.routes.get('ensure');

		expect(route?.method).toBe('post');
		expect(route?.path).toBe('/:appId/preview');
		expect(route?.skipAuth).toBeFalsy();
		expect(route?.accessScope).toEqual({ scope: 'app:read', globalOnly: false });
	});

	it('ensures the preview for the app in the thread', async () => {
		await expect(controller.ensure(req, res, 'app-1', { threadId: 'thread-1' })).resolves.toEqual({
			status: 'starting',
		});

		expect(memoryService.checkThreadOwnership).toHaveBeenCalledWith('user-1', 'thread-1');
		expect(appPreviewService.ensure).toHaveBeenCalledWith({
			threadId: 'thread-1',
			appId: 'app-1',
			projectId: 'project-1',
			namespace: 'greeter',
			userId: 'user-1',
			sandbox,
			getWorkspace: expect.any(Function),
			getSourceTarball: expect.any(Function),
		});
	});

	it('hands the preview service the thread workspace and the newest source of the app', async () => {
		const workspace = mock<Workspace>();
		const tarball = { versionId: 'v-1', data: Buffer.from('gzip') };
		instanceAiService.getOrCreateWorkspace.mockResolvedValue(workspace);
		appsService.getSourceTarball.mockResolvedValue(tarball);
		await controller.ensure(req, res, 'app-1', { threadId: 'thread-1' });
		const input = appPreviewService.ensure.mock.calls[0][0];

		await expect(input.getWorkspace()).resolves.toBe(workspace);
		expect(instanceAiService.getOrCreateWorkspace).toHaveBeenCalledWith('thread-1', user);
		await expect(input.getSourceTarball()).resolves.toBe(tarball);
		expect(appsService.getSourceTarball).toHaveBeenCalledWith('app-1');
	});

	it('answers 404 when the app belongs to another project', async () => {
		appsService.getApp.mockResolvedValue(mock<App>({ id: 'app-1', projectId: 'project-2' }));

		await expect(controller.ensure(req, res, 'app-1', { threadId: 'thread-1' })).rejects.toThrow(
			NotFoundError,
		);
		expect(appPreviewService.ensure).not.toHaveBeenCalled();
	});

	it.each(['other_user', 'not_found'] as const)(
		'answers 404 when the thread is %s',
		async (ownership) => {
			memoryService.checkThreadOwnership.mockResolvedValue(ownership);

			await expect(controller.ensure(req, res, 'app-1', { threadId: 'thread-1' })).rejects.toThrow(
				NotFoundError,
			);
			expect(appPreviewService.ensure).not.toHaveBeenCalled();
		},
	);

	it('reports the provider as unsupported when the workspace is not an n8n sandbox', async () => {
		instanceAiService.getN8nSandboxConfig.mockResolvedValue(null);

		await expect(controller.ensure(req, res, 'app-1', { threadId: 'thread-1' })).resolves.toEqual({
			status: 'unsupported',
			reason: 'provider',
		});
		expect(appPreviewService.ensure).not.toHaveBeenCalled();
	});
});
