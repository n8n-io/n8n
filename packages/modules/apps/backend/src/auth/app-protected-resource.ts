import { appSchema } from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { ProtectedResourceResolver } from '@n8n/backend-services/auth';
import { Service } from '@n8n/di';
import {
	SYSTEM_TRUSTED_SOURCE_ID,
	type ProtectedResource,
	type ResourcePrincipal,
} from '@n8n/inbound-auth';
import type { ResourceGrant } from '@n8n/permissions';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppHostService, type AppHostKind } from '../serving/app-host.service';

@Service()
export class AppProtectedResource implements ProtectedResourceResolver {
	readonly id = 'apps';
	readonly scopes: string[] = [];

	constructor(
		private readonly apps: AppRepository,
		private readonly hosts: AppHostService,
		private readonly projectScope: ProjectScopeService,
	) {}

	forApp(
		app: App,
		{ kind = 'published', revalidate = true }: { kind?: AppHostKind; revalidate?: boolean } = {},
	): ProtectedResource {
		const url = this.hosts.callbackUrl(app, kind);
		const preview = kind === 'preview';
		const currentApp = async () => {
			if (!revalidate) return app;
			const current = await this.apps.findById(app.id);
			return current?.namespace === app.namespace && (preview || current.publishedVersionId)
				? current
				: null;
		};
		return {
			id: preview ? `app-preview:${app.id}` : `app:${app.id}`,
			surface: 'apps',
			displayName: app.name,
			isFirstParty: true,
			// The editor opens the preview for a user who is signed in to n8n already.
			skipConsent: preview,
			uiHints: { icon: 'grid-2x2', consentType: 'app' },
			scopes: [],
			getResourceUrl: () => url,
			getAudiences: () => [url],
			getAcceptedSourceIds: () => [SYSTEM_TRUSTED_SOURCE_ID],
			getAllowedRedirectUris: async () => [url],
			isAvailable: async () => !!(await currentApp()),
			authorize: async (user) => {
				const current = await currentApp();
				if (!current) return false;
				return preview ? await this.canRead(current, user) : await this.canAccess(current, user);
			},
			getGrant: () => this.grantFor(app, kind),
		};
	}

	/**
	 * Mirrors `authorize`, so a sealed run re-checks project access. The grant keeps the
	 * visibility of the moment it is sealed. It does not re-check that the app is still published.
	 */
	grantFor(
		app: Pick<App, 'id' | 'namespace' | 'projectId' | 'visibility'>,
		kind: AppHostKind = 'published',
	): ResourceGrant {
		const audiences = [this.hosts.callbackUrl(app, kind)];
		if (kind === 'published' && app.visibility === 'instance') return { audiences };
		return { audiences, projectAccess: { projectId: app.projectId, scopes: ['app:read'] } };
	}

	async canAccess(app: App, user: ResourcePrincipal): Promise<boolean> {
		return app.visibility === 'instance' || (await this.canRead(app, user));
	}

	async canRead(app: App, user: ResourcePrincipal): Promise<boolean> {
		return await this.projectScope.hasScopes(user, app.projectId, ['app:read']);
	}

	matchesVirtualClientUrl(value: string): boolean {
		try {
			const url = new URL(value);
			if (url.username || url.password || url.search || url.hash) return false;
			return (
				this.appId(url.pathname) !== undefined && this.hosts.hostKindFromUrl(url) !== undefined
			);
		} catch {
			return false;
		}
	}

	async resolveByUrl(value: string): Promise<ProtectedResource | undefined> {
		if (!this.matchesVirtualClientUrl(value)) return undefined;
		const url = new URL(value);
		const id = this.appId(url.pathname);
		const kind = this.hosts.hostKindFromUrl(url);
		if (!id || !kind) return undefined;
		const app = await this.apps.findById(id);
		const resource =
			app && (kind === 'preview' || app.publishedVersionId)
				? this.forApp(app, { kind })
				: undefined;
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
