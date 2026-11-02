import { Logger } from '@n8n/backend-common';
import { RoleService, UrlService } from '@n8n/backend-services';
import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository } from '@n8n/db';
import type { ResourcePrincipal } from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { AppProtectedResource } from '../app-protected-resource';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppsConfig } from '../../apps.config';
import { AppHostService } from '../../serving/app-host.service';

const id = '11111111-1111-4111-8111-111111111111';
const url = `https://sales.apps.example.com/_n8n/auth/${id}/callback`;

function setup(deploymentType = 'default') {
	const app = mock<App>({
		id,
		namespace: 'sales',
		projectId: 'project',
		visibility: 'project',
		publishedVersionId: 'version',
	});
	const apps = mock<AppRepository>();
	apps.findById.mockResolvedValue(app);
	const hosts = new AppHostService(
		mock<AppsConfig>({ baseUrl: 'https://apps.example.com' }),
		mock<GlobalConfig>({
			host: 'foo.app.n8n.cloud',
			deployment: mock<GlobalConfig['deployment']>({ type: deploymentType }),
		}),
		mock<UrlService>({
			getInstanceBaseUrl: () => 'https://foo.app.n8n.cloud',
			getWebhookBaseUrl: () => 'https://foo.app.n8n.cloud',
		}),
	);
	const roles = mock<RoleService>();
	roles.rolesWithScope.mockResolvedValue(['project:viewer']);
	const projects = mock<ProjectRelationRepository>();
	projects.getAccessibleProjectsByRoles.mockResolvedValue(['project']);
	const resource = new AppProtectedResource(apps, hosts, roles, projects);
	const registry = new ProtectedResourceRegistry(mock<Logger>());
	registry.registerResolver(resource);
	return {
		app,
		apps,
		roles,
		projects,
		resource,
		registry,
	};
}

describe('AppProtectedResource', () => {
	it('does not resolve app resources by path', async () => {
		const { registry, apps } = setup();

		await expect(registry.getByResourcePath(new URL(url).pathname)).resolves.toBeUndefined();

		expect(apps.findById).not.toHaveBeenCalled();
	});

	it('resolves published apps only by their canonical URL', async () => {
		const { registry, apps } = setup();
		const mainUrl = `https://n8n.example.com${new URL(url).pathname}`;

		await expect(registry.getByResourceUrl(mainUrl)).resolves.toBeUndefined();
		expect(apps.findById).not.toHaveBeenCalled();

		expect((await registry.getByResourceUrl(url))?.getResourceUrl()).toBe(url);
		expect(apps.findById).toHaveBeenCalledExactlyOnceWith(id);
	});

	it('matches only canonical configured callback URLs', async () => {
		const { resource } = setup();
		expect(resource.matchesVirtualClientUrl(url)).toBe(true);
		expect(resource.matchesVirtualClientUrl(url + '?extra=1')).toBe(false);
		expect(resource.matchesVirtualClientUrl(url.replace('https:', 'http:'))).toBe(false);
		expect(
			resource.matchesVirtualClientUrl(url.replace('apps.example.com', 'other.example.com')),
		).toBe(false);
		expect((await resource.resolveByUrl(url))?.getAudiences()).toEqual([url]);
	});

	it('resolves Cloud callbacks only for the configured instance and namespace', async () => {
		const { resource, apps } = setup('cloud');
		const cloudUrl = url.replace('sales.apps', 'sales--foo.apps');

		for (const value of [
			url,
			url.replace('sales.apps', 'foo--sales.apps'),
			cloudUrl.replace('--foo', '--bar'),
			cloudUrl.replace('https:', 'http:'),
			cloudUrl.replace('.com/', '.com:1234/'),
			cloudUrl + '?extra=1',
			cloudUrl + '#extra',
			cloudUrl.replace('https://', 'https://user@'),
		]) {
			expect(resource.matchesVirtualClientUrl(value)).toBe(false);
			await expect(resource.resolveByUrl(value)).resolves.toBeUndefined();
		}
		expect(apps.findById).not.toHaveBeenCalled();

		expect(resource.matchesVirtualClientUrl(cloudUrl)).toBe(true);
		const descriptor = await resource.resolveByUrl(cloudUrl);
		expect(descriptor?.getResourceUrl()).toBe(cloudUrl);
		expect(descriptor?.getAudiences()).toEqual([cloudUrl]);
		expect(await descriptor?.getAllowedRedirectUris?.()).toEqual([cloudUrl]);
		expect(apps.findById).toHaveBeenCalledExactlyOnceWith(id);

		await expect(
			resource.resolveByUrl(cloudUrl.replace('sales', 'other')),
		).resolves.toBeUndefined();
	});

	it('checks current project grants and visibility', async () => {
		const { resource, app, roles, projects } = setup();
		const user = mock<ResourcePrincipal>({
			id: 'user',
			role: { slug: 'global:member', scopes: [] },
		});
		const descriptor = resource.forApp(app);
		expect(await descriptor.authorize(user)).toBe(true);
		expect(roles.rolesWithScope).toHaveBeenCalledExactlyOnceWith('project', ['app:read']);
		expect(projects.getAccessibleProjectsByRoles).toHaveBeenCalledExactlyOnceWith('user', [
			'project:viewer',
		]);
		projects.getAccessibleProjectsByRoles.mockResolvedValue([]);
		expect(await descriptor.authorize(user)).toBe(false);
		app.visibility = 'instance';
		expect(await descriptor.authorize(user)).toBe(true);
	});

	it('requires read access regardless of visibility', async () => {
		const { resource, app, projects } = setup();
		const user = mock<ResourcePrincipal>({
			id: 'user',
			role: { slug: 'global:member', scopes: [] },
		});
		app.visibility = 'public';

		expect(await resource.canRead(app, user)).toBe(true);
		projects.getAccessibleProjectsByRoles.mockResolvedValue([]);
		expect(await resource.canRead(app, user)).toBe(false);
	});

	it('grants global app read access without project membership', async () => {
		const { resource, app, roles, projects } = setup();
		const user = mock<ResourcePrincipal>({
			id: 'user',
			role: { slug: 'global:member', scopes: [{ slug: 'app:read' }] },
		});
		projects.getAccessibleProjectsByRoles.mockResolvedValue([]);

		expect(await resource.forApp(app).authorize(user)).toBe(true);
		expect(roles.rolesWithScope).not.toHaveBeenCalled();
		expect(projects.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
	});

	it('makes old resources unavailable after unpublish or rename', async () => {
		const { resource, app, apps } = setup();
		const descriptor = resource.forApp(app);
		apps.findById.mockResolvedValue(mock<App>({ ...app, namespace: 'renamed' }));
		expect(await descriptor.isAvailable?.()).toBe(false);
		apps.findById.mockResolvedValue(mock<App>({ ...app, publishedVersionId: null }));
		expect(await descriptor.isAvailable?.()).toBe(false);
		expect(await resource.resolveByUrl(url)).toBeUndefined();
	});
});
