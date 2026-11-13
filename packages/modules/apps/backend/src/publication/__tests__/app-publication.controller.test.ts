import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppPublicationController } from '../app-publication.controller';
import type { AppPublicationService } from '../app-publication.service';
import type { AppsService } from '../../apps.service';
import type { AppBindingsService } from '../../bindings/app-bindings.service';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionService } from '../../versions/app-version.service';
import { AppAuthController } from '../../auth/app-auth.controller';
import { AppPreviewController } from '../../preview/app-preview.controller';

describe('App controller access', () => {
	it('gates publication changes and version listing with project scopes', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AppPublicationController as never,
		);
		expect(metadata.routes.get('publish')?.accessScope).toEqual({
			scope: 'app:update',
			globalOnly: false,
		});
		expect(metadata.routes.get('unpublish')?.accessScope).toEqual({
			scope: 'app:update',
			globalOnly: false,
		});
		expect(metadata.routes.get('listVersions')?.accessScope).toEqual({
			scope: 'app:read',
			globalOnly: false,
		});
		expect(metadata.routes.get('restoreVersion')?.accessScope).toEqual({
			scope: 'app:update',
			globalOnly: false,
		});
		expect(metadata.routes.get('getPublishPreview')?.accessScope).toEqual({
			scope: 'app:read',
			globalOnly: false,
		});
	});

	it('gates preview grants with the read scope', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AppPreviewController as never,
		);
		expect(metadata.surface).toBeUndefined();
		expect(metadata.routes.get('createGrant')?.accessScope).toEqual({
			scope: 'app:read',
			globalOnly: false,
		});
	});

	it('registers auth handlers exclusively on the apps surface', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AppAuthController as never,
		);
		expect(metadata.surface).toBe('apps');
		expect(metadata.routes.size).toBeGreaterThan(0);
		for (const route of metadata.routes.values()) {
			expect(route.skipAuth).toBe(true);
			expect(route.ipRateLimit).toBe(true);
		}
	});
});

describe('AppPublicationController.restoreVersion', () => {
	it('restores the version as the acting user and returns the new version', async () => {
		const bindings = mock<AppBindingsService>();
		const created = new Date('2026-11-03T10:00:00.000Z');
		bindings.restoreVersion.mockResolvedValue({
			id: '0190a8d6-4a2e-7000-8000-0000000000d2',
			appId: '0190a8d6-4a2e-7000-8000-000000000001',
			label: 'Launch',
			description: null,
			sourceArtifactId: 1,
			bundleArtifactId: null,
			buildStatus: 'queued',
			bindings: [],
			createdAt: created,
			updatedAt: created,
		} as unknown as AppVersion);
		const controller = new AppPublicationController(
			mock<AppPublicationService>(),
			mock<AppsService>(),
			mock<AppVersionService>(),
			bindings,
		);
		const user = mock<User>();
		const req = mock<AuthenticatedRequest<{ projectId: string; appId: string; versionId: string }>>(
			{
				user,
				params: { projectId: 'p1', appId: 'app-1', versionId: 'old-version' },
			},
		);

		const response = await controller.restoreVersion(req, mock<Response>(), {
			baseVersionId: 'draft',
		});

		expect(bindings.restoreVersion).toHaveBeenCalledWith(
			user,
			'p1',
			'app-1',
			'old-version',
			'draft',
		);
		expect(response).toEqual({
			id: '0190a8d6-4a2e-7000-8000-0000000000d2',
			appId: '0190a8d6-4a2e-7000-8000-000000000001',
			label: 'Launch',
			description: null,
			sourceArtifactId: 1,
			bundleArtifactId: null,
			buildStatus: 'queued',
			createdAt: '2026-11-03T10:00:00.000Z',
			updatedAt: '2026-11-03T10:00:00.000Z',
		});
	});
});

describe('AppPublicationController.publish', () => {
	const versionId = '0190a8d6-4a2e-7000-8000-0000000000d2';
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest<{ projectId: string; appId: string }>>({
		user,
		params: { projectId: 'p1', appId: 'app-1' },
	});

	function setup() {
		const publication = mock<AppPublicationService>();
		const bindings = mock<AppBindingsService>();
		const controller = new AppPublicationController(
			publication,
			mock<AppsService>(),
			mock<AppVersionService>(),
			bindings,
		);
		return { controller, publication, bindings };
	}

	it('checks the app, then publishes the attached resources, then the app', async () => {
		const { controller, publication, bindings } = setup();
		const order: string[] = [];
		publication.assertCanPublish.mockImplementation(async () => {
			order.push('check');
		});
		bindings.publishResources.mockImplementation(async () => {
			order.push('resources');
		});
		publication.publish.mockImplementation(async () => {
			order.push('app');
		});

		await controller.publish(req, mock<Response>(), {
			versionId,
			label: 'v1',
			publishResources: true,
		});

		expect(bindings.publishResources).toHaveBeenCalledWith(user, 'p1', 'app-1', versionId);
		expect(publication.publish).toHaveBeenCalledWith(
			'p1',
			'app-1',
			versionId,
			{ label: 'v1' },
			{ userId: 'user-1' },
		);
		expect(order).toEqual(['check', 'resources', 'app']);
	});

	it('publishes no resource when the app cannot be published', async () => {
		const { controller, publication, bindings } = setup();
		publication.assertCanPublish.mockRejectedValue(new Error('Use a valid app namespace'));

		await expect(
			controller.publish(req, mock<Response>(), { versionId, label: 'v1', publishResources: true }),
		).rejects.toThrow('valid app namespace');

		expect(bindings.publishResources).not.toHaveBeenCalled();
		expect(publication.publish).not.toHaveBeenCalled();
	});

	it('does not publish the app when a resource fails', async () => {
		const { controller, publication, bindings } = setup();
		bindings.publishResources.mockRejectedValue(new Error('Could not publish "Sales"'));

		await expect(
			controller.publish(req, mock<Response>(), { versionId, label: 'v1', publishResources: true }),
		).rejects.toThrow('Could not publish "Sales"');

		expect(publication.publish).not.toHaveBeenCalled();
	});

	it.each([false, undefined])(
		'publishes only the app when publishResources is %s',
		async (flag) => {
			const { controller, publication, bindings } = setup();

			await controller.publish(req, mock<Response>(), {
				versionId,
				label: 'v1',
				publishResources: flag,
			});

			expect(bindings.publishResources).not.toHaveBeenCalled();
			expect(publication.publish).toHaveBeenCalledTimes(1);
		},
	);
});
