import type { Workspace } from '@n8n/agents';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { AppPublishService } from '@/modules/apps/app-publish.service';
import type { AppThemeService } from '@/modules/apps/app-theme.service';
import type { App } from '@/modules/apps/app.entity';
import type { AppsService } from '@/modules/apps/apps.service';
import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import { AppPreviewController } from '../app-preview.controller';
import type { AppPreviewService } from '../app-preview.service';
import type { InstanceAiService } from '../../instance-ai.service';

describe('AppPreviewController', () => {
	const appPreviewService = mock<AppPreviewService>();
	const appsService = mock<AppsService>();
	const instanceAiService = mock<InstanceAiService>();
	const appPublishService = mock<AppPublishService>();
	const appThemeService = mock<AppThemeService>();
	const instanceWriteAccess = mock<InstanceWriteAccessService>();
	const controller = new AppPreviewController(
		appPreviewService,
		appsService,
		instanceAiService,
		appPublishService,
		appThemeService,
		instanceWriteAccess,
	);
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({
		user,
		params: { projectId: 'project-1' },
	});
	const res = mock<Response>();
	const app = mock<App>({ id: 'app-1', projectId: 'project-1', namespace: 'greeter' });
	const sandbox = { url: 'http://sandbox.test', apiKey: 'key' };
	const APP_SANDBOX_KEY = 'app-app-1';

	beforeEach(() => {
		vi.clearAllMocks();
		appsService.getApp.mockResolvedValue(app);
		instanceAiService.getAppPreviewSandbox.mockResolvedValue({
			enabled: true,
			n8nSandbox: sandbox,
		});
		appPreviewService.ensure.mockResolvedValue({ status: 'starting' });
		instanceAiService.awaitPendingSnapshot.mockResolvedValue(undefined);
		instanceWriteAccess.isReadOnly.mockReturnValue(false);
		instanceAiService.getCachedWorkspace.mockReturnValue(undefined);
		appPublishService.publish.mockResolvedValue({
			versionId: 'v-2',
			url: 'http://n8n/apps/greeter/',
		});
		appThemeService.applyTheme.mockResolvedValue({ versionId: 's-3' });
		appsService.toResponse.mockImplementation(
			async (value) => await Promise.resolve({ ...value, hasUnpublishedChanges: true }),
		);
	});

	const routeMetadata = (handler: string) =>
		Container.get(ControllerRegistryMetadata)
			.getControllerMetadata(AppPreviewController as never)
			.routes.get(handler);

	it('gates the route with a project-scoped app:read check', () => {
		const route = routeMetadata('ensure');

		expect(route?.method).toBe('post');
		expect(route?.path).toBe('/:appId/preview');
		expect(route?.skipAuth).toBeFalsy();
		expect(route?.accessScope).toEqual({ scope: 'app:read', globalOnly: false });
	});

	describe('publish', () => {
		it('gates the route with a project-scoped app:update check', () => {
			const route = routeMetadata('publish');

			expect(route?.method).toBe('post');
			expect(route?.path).toBe('/:appId/publish');
			expect(route?.skipAuth).toBeFalsy();
			expect(route?.accessScope).toEqual({ scope: 'app:update', globalOnly: false });
		});

		it('publishes without a draft when the app has no live sandbox', async () => {
			await expect(controller.publish(req, res, 'app-1')).resolves.toEqual({
				versionId: 'v-2',
				url: 'http://n8n/apps/greeter/',
			});

			expect(instanceAiService.getCachedWorkspace).toHaveBeenCalledWith(APP_SANDBOX_KEY);
			expect(appPublishService.publish).toHaveBeenCalledWith('app-1', user, { draft: undefined });
		});

		it("hands the app's sandbox over as the draft when it is cached", async () => {
			const workspace = mock<Workspace>();
			instanceAiService.getCachedWorkspace.mockReturnValue(workspace);

			await controller.publish(req, res, 'app-1');

			expect(appPublishService.publish).toHaveBeenCalledWith('app-1', user, { draft: workspace });
		});

		it('returns a build failure as the payload, not as an HTTP error', async () => {
			const failure = { error: true as const, stage: 'build' as const, message: 'boom', log: '' };
			appPublishService.publish.mockResolvedValue(failure);

			await expect(controller.publish(req, res, 'app-1')).resolves.toEqual(failure);
		});

		it('answers 404 when the app belongs to another project', async () => {
			appsService.getApp.mockResolvedValue(mock<App>({ id: 'app-1', projectId: 'project-2' }));

			await expect(controller.publish(req, res, 'app-1')).rejects.toThrow(NotFoundError);
			expect(appPublishService.publish).not.toHaveBeenCalled();
		});

		it('answers 403 on a read-only instance', async () => {
			instanceWriteAccess.isReadOnly.mockReturnValue(true);

			await expect(controller.publish(req, res, 'app-1')).rejects.toThrow(ForbiddenError);
			expect(appPublishService.publish).not.toHaveBeenCalled();
		});
	});

	describe('applyTheme', () => {
		const theme = { mode: 'dark' as const, vars: { '--primary': '#000' } };

		it('gates the route with a project-scoped app:update check', () => {
			const route = routeMetadata('applyTheme');

			expect(route?.method).toBe('post');
			expect(route?.path).toBe('/:appId/theme');
			expect(route?.skipAuth).toBeFalsy();
			expect(route?.accessScope).toEqual({ scope: 'app:update', globalOnly: false });
		});

		it('stores the theme, writes it into the stored source without a live sandbox, and answers the app', async () => {
			await expect(controller.applyTheme(req, res, 'app-1', { theme })).resolves.toMatchObject({
				id: 'app-1',
				hasUnpublishedChanges: true,
			});

			expect(appsService.updateApp).toHaveBeenCalledWith('app-1', { theme });
			expect(appThemeService.applyTheme).toHaveBeenCalledWith('app-1', theme, user, {
				draft: undefined,
			});
		});

		it("hands the app's sandbox over as the draft when it is cached", async () => {
			const workspace = mock<Workspace>();
			instanceAiService.getCachedWorkspace.mockReturnValue(workspace);

			await controller.applyTheme(req, res, 'app-1', { theme });

			expect(instanceAiService.getCachedWorkspace).toHaveBeenCalledWith(APP_SANDBOX_KEY);
			expect(appThemeService.applyTheme).toHaveBeenCalledWith('app-1', theme, user, {
				draft: workspace,
			});
		});

		it('answers 400 with the service message when the theme cannot be saved', async () => {
			appThemeService.applyTheme.mockResolvedValue({ error: true, message: 'no source yet' });

			const attempt = controller.applyTheme(req, res, 'app-1', { theme });

			await expect(attempt).rejects.toThrow(BadRequestError);
			await expect(attempt).rejects.toThrow('no source yet');
		});

		it('answers 403 on a read-only instance', async () => {
			instanceWriteAccess.isReadOnly.mockReturnValue(true);

			await expect(controller.applyTheme(req, res, 'app-1', { theme })).rejects.toThrow(
				ForbiddenError,
			);
			expect(appsService.updateApp).not.toHaveBeenCalled();
		});
	});

	it('ensures the preview of the app', async () => {
		await expect(controller.ensure(req, res, 'app-1')).resolves.toEqual({ status: 'starting' });

		expect(appPreviewService.ensure).toHaveBeenCalledWith({
			appId: 'app-1',
			projectId: 'project-1',
			namespace: 'greeter',
			userId: 'user-1',
			sandbox,
			hasActiveRun: expect.any(Function),
			getWorkspace: expect.any(Function),
			getSourceTarball: expect.any(Function),
		});
	});

	it('waits for the end-of-turn snapshot of the app before ensuring the preview', async () => {
		let landSnapshot!: () => void;
		instanceAiService.awaitPendingSnapshot.mockReturnValue(
			new Promise<void>((resolve) => (landSnapshot = resolve)),
		);

		const ensured = controller.ensure(req, res, 'app-1');
		await new Promise((resolve) => setImmediate(resolve));
		expect(instanceAiService.awaitPendingSnapshot).toHaveBeenCalledWith('app-1');
		expect(appPreviewService.ensure).not.toHaveBeenCalled();

		landSnapshot();
		await expect(ensured).resolves.toEqual({ status: 'starting' });
		expect(appPreviewService.ensure).toHaveBeenCalledTimes(1);
	});

	it('tells the preview service whether a run is live on the app', async () => {
		instanceAiService.hasActiveRunForApp.mockReturnValue(true);
		await controller.ensure(req, res, 'app-1');
		const input = appPreviewService.ensure.mock.calls[0][0];

		expect(input.hasActiveRun()).toBe(true);
		expect(instanceAiService.hasActiveRunForApp).toHaveBeenCalledWith('app-1');
		instanceAiService.hasActiveRunForApp.mockReturnValue(false);
		expect(input.hasActiveRun()).toBe(false);
	});

	it("hands the preview service the app's workspace and the newest source of the app", async () => {
		const workspace = mock<Workspace>();
		const tarball = { versionId: 'v-1', data: Buffer.from('gzip') };
		instanceAiService.getOrCreateWorkspace.mockResolvedValue(workspace);
		appsService.getSourceTarball.mockResolvedValue(tarball);
		await controller.ensure(req, res, 'app-1');
		const input = appPreviewService.ensure.mock.calls[0][0];

		await expect(input.getWorkspace()).resolves.toBe(workspace);
		expect(instanceAiService.getOrCreateWorkspace).toHaveBeenCalledWith(APP_SANDBOX_KEY, user);
		await expect(input.getSourceTarball()).resolves.toBe(tarball);
		expect(appsService.getSourceTarball).toHaveBeenCalledWith('app-1');
	});

	it('answers 404 when the app belongs to another project', async () => {
		appsService.getApp.mockResolvedValue(mock<App>({ id: 'app-1', projectId: 'project-2' }));

		await expect(controller.ensure(req, res, 'app-1')).rejects.toThrow(NotFoundError);
		expect(appPreviewService.ensure).not.toHaveBeenCalled();
	});

	it('reports the provider as unsupported when the sandbox is disabled', async () => {
		instanceAiService.getAppPreviewSandbox.mockResolvedValue({ enabled: false });

		await expect(controller.ensure(req, res, 'app-1')).resolves.toEqual({
			status: 'unsupported',
			reason: 'provider',
		});
		expect(appPreviewService.ensure).not.toHaveBeenCalled();
	});

	it('ensures without a sandbox service when the provider cannot route to a port', async () => {
		instanceAiService.getAppPreviewSandbox.mockResolvedValue({ enabled: true });

		await controller.ensure(req, res, 'app-1');

		expect(appPreviewService.ensure).toHaveBeenCalledWith(
			expect.objectContaining({ appId: 'app-1', sandbox: undefined }),
		);
	});
});
