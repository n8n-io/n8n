import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { App } from '@/modules/apps/app.entity';
import { AppRepository } from '@/modules/apps/app.repository';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProtectedResourceResolver } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { resourceUrlToWebhookPath, trimTrailingSlash } from './utils';

const APPS_PATH_PREFIX = '/apps/';

/** Scopes advertised for served apps. Empty, like the trigger resources. */
export const APP_SCOPES: string[] = [];

/**
 * A served app with `authMode: 'n8n'` is a first-party OAuth resource at
 * `<base>/apps/<namespace>/`: the serving controller sends a visitor without a
 * page cookie through the instance's authorization flow and back to that URL.
 * Same base URL as the trigger resources, because the OAuth server accepts a
 * virtual client only under it.
 */
@Service()
export class AppResourceResolver implements ProtectedResourceResolver {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly urlService: UrlService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {}

	readonly id = 'app';
	readonly scopes = APP_SCOPES;

	async resolveByUrl(resourceUrl: string) {
		const pathname = resourceUrlToWebhookPath(resourceUrl, this.urlService.getWebhookBaseUrl());
		if (pathname === undefined) {
			this.logger.debug(`Resource URL is not under the webhook base URL: ${resourceUrl}`);
			return undefined;
		}
		return await this.resolveByPath(pathname);
	}

	async resolveByPath(pathname: string) {
		if (!pathname.startsWith(APPS_PATH_PREFIX) || !this.moduleRegistry.isActive('apps')) {
			return undefined;
		}
		// Only the app root is a resource; a deeper path is one of its pages.
		const [namespace, ...rest] = pathname.slice(APPS_PATH_PREFIX.length).split('/');
		if (!namespace || rest.some((segment) => segment !== '')) return undefined;

		const app = await this.appRepository.findByNamespace(namespace);
		if (!app || app.authMode !== 'n8n') return undefined;

		const resourceUrl = this.resourceUrlFor(app);
		const audiences = [resourceUrl];
		return {
			id: `app:${app.id}`,
			isFirstParty: true,
			getResourceUrl: () => resourceUrl,
			getAudiences: () => audiences,
			getAllowedRedirectUris: async () => [resourceUrl],
			scopes: APP_SCOPES,
			displayName: app.name,
			authorize: async (user: User) => await this.canOpen(user, app),
		};
	}

	resourceUrlFor(app: Pick<App, 'namespace'>) {
		return `${trimTrailingSlash(this.urlService.getWebhookBaseUrl())}${APPS_PATH_PREFIX}${app.namespace}/`;
	}

	/** The same check the apps REST API applies: `app:read` on the app's project. */
	async canOpen(user: User, app: Pick<App, 'projectId'>) {
		return await userHasScopes(user, ['app:read'], false, { projectId: app.projectId });
	}
}
