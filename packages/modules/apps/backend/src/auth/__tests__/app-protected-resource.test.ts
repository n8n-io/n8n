import { RoleService } from '@n8n/backend-services';
import { ProjectRelationRepository } from '@n8n/db';
import type { ResourcePrincipal } from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { AppProtectedResource } from '../app-protected-resource';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppHostService } from '../../serving/app-host.service';

const id = '11111111-1111-4111-8111-111111111111';
const url = `https://sales.apps.example.com/_n8n/auth/${id}/callback`;

function setup() {
	const app = mock<App>({
		id,
		namespace: 'sales',
		projectId: 'project',
		visibility: 'project',
		publishedVersionId: 'version',
	});
	const apps = mock<AppRepository>();
	apps.findById.mockResolvedValue(app);
	const hosts = mock<AppHostService>({
		baseUrl: new URL('https://apps.example.com'),
		callbackUrl: () => url,
		origin: (namespace) => (namespace === 'sales' ? 'https://sales.apps.example.com' : null),
	});
	const roles = mock<RoleService>();
	roles.rolesWithScope.mockResolvedValue(['project:viewer']);
	const projects = mock<ProjectRelationRepository>();
	projects.getAccessibleProjectsByRoles.mockResolvedValue(['project']);
	return { app, apps, projects, resource: new AppProtectedResource(apps, hosts, roles, projects) };
}

describe('AppProtectedResource', () => {
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

	it('checks current project grants and visibility', async () => {
		const { resource, app, projects } = setup();
		const user = mock<ResourcePrincipal>({
			id: 'user',
			role: { slug: 'global:member', scopes: [] },
		});
		const descriptor = resource.forApp(app);
		expect(await descriptor.authorize(user)).toBe(true);
		projects.getAccessibleProjectsByRoles.mockResolvedValue([]);
		expect(await descriptor.authorize(user)).toBe(false);
		app.visibility = 'instance';
		expect(await descriptor.authorize(user)).toBe(true);
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
