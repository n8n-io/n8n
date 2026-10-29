import { appSchema } from '@n8n/api-types';
import { RoleService } from '@n8n/backend-services';
import type { ProtectedResourceResolver } from '@n8n/backend-services/auth';
import { ProjectRelationRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	SYSTEM_TRUSTED_SOURCE_ID,
	type ProtectedResource,
	type ResourcePrincipal,
} from '@n8n/inbound-auth';
import { hasGlobalScope } from '@n8n/permissions';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppHostService } from '../serving/app-host.service';

@Service()
export class AppProtectedResource implements ProtectedResourceResolver {
	readonly id = 'apps';
	readonly scopes: string[] = [];

	constructor(
		private readonly apps: AppRepository,
		private readonly hosts: AppHostService,
		private readonly roles: RoleService,
		private readonly projects: ProjectRelationRepository,
	) {}

	forApp(app: App): ProtectedResource {
		const url = this.hosts.callbackUrl(app);
		const currentApp = async () => {
			const current = await this.apps.findById(app.id);
			return current?.publishedVersionId && current.namespace === app.namespace ? current : null;
		};
		return {
			id: `app:${app.id}`,
			surface: 'apps',
			displayName: app.name,
			isFirstParty: true,
			uiHints: { icon: 'grid-2x2', consentType: 'app' },
			scopes: [],
			getResourceUrl: () => url,
			getAudiences: () => [url],
			getAcceptedSourceIds: () => [SYSTEM_TRUSTED_SOURCE_ID],
			getAllowedRedirectUris: async () => [url],
			isAvailable: async () => !!(await currentApp()),
			authorize: async (user) => {
				const current = await currentApp();
				return !!current && (await this.canAccess(current, user));
			},
		};
	}

	async canAccess(app: App, user: ResourcePrincipal): Promise<boolean> {
		if (app.visibility !== 'project' || hasGlobalScope(user, 'app:read')) return true;
		const roles = await this.roles.rolesWithScope('project', ['app:read']);
		const projects = await this.projects.getAccessibleProjectsByRoles(user.id, roles);
		return projects.includes(app.projectId);
	}

	matchesVirtualClientUrl(value: string): boolean {
		try {
			const url = new URL(value);
			if (url.username || url.password || url.search || url.hash) return false;
			return (
				this.appId(url.pathname) !== undefined && this.hosts.namespaceFromUrl(url) !== undefined
			);
		} catch {
			return false;
		}
	}

	async resolveByUrl(value: string): Promise<ProtectedResource | undefined> {
		if (!this.matchesVirtualClientUrl(value)) return undefined;
		const id = this.appId(new URL(value).pathname);
		if (!id) return undefined;
		const app = await this.apps.findById(id);
		const resource = app?.publishedVersionId ? this.forApp(app) : undefined;
		return resource?.getResourceUrl() === value ? resource : undefined;
	}

	async resolveByPath(): Promise<ProtectedResource | undefined> {
		// App resources require the apps host, which a path cannot identify.
		return undefined;
	}

	private appId(pathname: string): string | undefined {
		const match = /^\/_n8n\/auth\/([^/]+)\/callback$/.exec(pathname);
		return match && appSchema.shape.id.safeParse(match[1]).success ? match[1] : undefined;
	}
}
