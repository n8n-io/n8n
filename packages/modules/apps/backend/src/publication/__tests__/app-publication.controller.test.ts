import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AppPublicationController } from '../app-publication.controller';
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
