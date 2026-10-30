import { appNamespaceSchema, appSchema } from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';

import { AppsConfig } from '../apps.config';

const FQDN_MAX_LENGTH = 253;
const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PREVIEW_MARKER = '--preview';

@Service()
export class AppHostService {
	readonly baseUrl: URL;
	readonly sameOrigin: boolean;
	private readonly hostSuffix: string = '';

	constructor(
		config: AppsConfig,
		private readonly globalConfig: GlobalConfig,
		urls: UrlService,
	) {
		this.sameOrigin = config.unsafeSameOrigin;
		if (this.sameOrigin) {
			this.baseUrl = new URL(`${urls.getInstanceBaseUrl()}/`);
			return;
		}
		if (!config.baseUrl) {
			throw new BadRequestError('Set N8N_APPS_BASE_URL before enabling the apps module.');
		}
		try {
			const url = new URL(config.baseUrl);
			if (
				!['http:', 'https:'].includes(url.protocol) ||
				url.username ||
				url.password ||
				url.pathname !== '/' ||
				url.search ||
				url.hash ||
				isIP(url.hostname) ||
				url.hostname.length > FQDN_MAX_LENGTH ||
				!url.hostname.split('.').every((label) => DNS_LABEL_PATTERN.test(label))
			)
				throw new Error('Invalid apps URL');
			for (const serviceUrl of [urls.getInstanceBaseUrl(), urls.getWebhookBaseUrl()]) {
				const hostname = new URL(serviceUrl).hostname.toLowerCase();
				if (hostname === url.hostname || hostname.endsWith(`.${url.hostname}`)) {
					throw new Error('The apps parent overlaps an n8n service host');
				}
			}
			this.baseUrl = url;
		} catch {
			throw new BadRequestError(
				'Set N8N_APPS_BASE_URL to a separate parent URL without a path, query, or fragment.',
			);
		}
		if (globalConfig.deployment.type === 'cloud') {
			const instanceName = globalConfig.host.split('.')[0].toLowerCase();
			if (!DNS_LABEL_PATTERN.test(instanceName) || instanceName.includes('--')) {
				throw new BadRequestError(
					'Set N8N_HOST to a valid instance hostname before enabling apps on Cloud.',
				);
			}
			this.hostSuffix = `--${instanceName}`;
		}
	}

	origin(namespace: string): string | null {
		return this.originForLabel(namespace, '');
	}

	previewOrigin(namespace: string): string | null {
		return this.originForLabel(namespace, PREVIEW_MARKER);
	}

	appPath(appId: string, preview = false): string {
		return `${this.baseUrl.pathname}apps/${appId}/${preview ? '_preview/' : ''}`;
	}

	appUrl(app: { id: string; namespace: string }, preview = false): string | null {
		if (this.sameOrigin) {
			if (!appSchema.shape.id.safeParse(app.id).success) return null;
			return new URL(this.appPath(app.id, preview), this.baseUrl).href;
		}
		return preview ? this.previewOrigin(app.namespace) : this.origin(app.namespace);
	}

	callbackUrl(app: { id: string; namespace: string }): string {
		const appUrl = this.appUrl(app);
		if (!appUrl) throw new BadRequestError('Use a valid app namespace before publishing this app.');
		return `${appUrl.replace(/\/$/, '')}/_n8n/auth/${app.id}/callback`;
	}

	callbackAppId(url: URL): string | undefined {
		const match = /\/_n8n\/auth\/([^/]+)\/callback$/.exec(url.pathname);
		const id = match?.[1];
		if (!id || !appSchema.shape.id.safeParse(id).success) return undefined;
		if (this.sameOrigin) {
			return url.origin === this.baseUrl.origin &&
				url.pathname === `${this.appPath(id)}_n8n/auth/${id}/callback`
				? id
				: undefined;
		}
		return url.pathname === `/_n8n/auth/${id}/callback` && this.namespaceFromUrl(url)
			? id
			: undefined;
	}

	requestAppId(req: IncomingMessage): string | undefined {
		if (!this.sameOrigin || !this.ownsRequest(req)) return undefined;
		const id = this.requestPath(req).slice(`${this.baseUrl.pathname}apps/`.length).split('/')[0];
		return appSchema.shape.id.safeParse(id).success ? id : undefined;
	}

	isPreview(req: IncomingMessage): boolean {
		if (!this.sameOrigin) return !!this.previewNamespace(req);
		const id = this.requestAppId(req);
		if (!id) return false;
		const root = this.appPath(id, true);
		const pathname = this.requestPath(req);
		return pathname === root.slice(0, -1) || pathname.startsWith(root);
	}

	/** Express trusts the immediate peer when the configured proxy hop count is positive. */
	requestHost(req: IncomingMessage): string | undefined {
		const forwarded = req.headers['x-forwarded-host'];
		if (
			this.globalConfig.proxy_hops > 0 &&
			req.socket.remoteAddress &&
			typeof forwarded === 'string'
		) {
			return forwarded.split(',')[0].trim();
		}
		return req.headers.host;
	}

	ownsRequest(req: IncomingMessage): boolean {
		if (this.sameOrigin) {
			const host = this.parseHost(this.requestHost(req));
			const prefix = `${this.baseUrl.pathname}apps`;
			const pathname = this.requestPath(req);
			return (
				host?.origin === this.baseUrl.origin &&
				(pathname === prefix || pathname.startsWith(`${prefix}/`))
			);
		}
		return this.isAppsHostRange(this.requestHost(req));
	}

	validRequestHost(req: IncomingMessage): boolean {
		return !!this.parseHost(this.requestHost(req));
	}

	namespace(req: IncomingMessage): string | undefined {
		const host = this.parseHost(this.requestHost(req));
		return host ? this.namespaceFromUrl(host) : undefined;
	}

	namespaceFromUrl(url: URL): string | undefined {
		const suffix = `${this.hostSuffix}.${this.baseUrl.hostname}`;
		if (!url.hostname.endsWith(suffix)) return undefined;
		const namespace = url.hostname.slice(0, -suffix.length);
		return this.origin(namespace) === url.origin ? namespace : undefined;
	}

	previewNamespace(req: IncomingMessage): string | undefined {
		const host = this.parseHost(this.requestHost(req));
		const suffix = `${PREVIEW_MARKER}${this.hostSuffix}.${this.baseUrl.hostname}`;
		if (!host?.hostname.endsWith(suffix)) return undefined;
		const namespace = host.hostname.slice(0, -suffix.length);
		return this.previewOrigin(namespace) === host.origin ? namespace : undefined;
	}

	private originForLabel(namespace: string, marker: string): string | null {
		if (!appNamespaceSchema.safeParse(namespace).success) return null;
		if (this.sameOrigin) return this.baseUrl.origin;
		const label = `${namespace}${marker}${this.hostSuffix}`;
		if (label.length > 63 || label.length + this.baseUrl.hostname.length + 1 > FQDN_MAX_LENGTH)
			return null;
		const url = new URL(this.baseUrl);
		const hostname = `${label}.${this.baseUrl.hostname}`;
		url.hostname = hostname;
		return url.hostname === hostname ? url.origin : null;
	}

	private isAppsHostRange(value: string | undefined): boolean {
		const host = this.parseHost(value);
		// Reserve the parent and all descendants so invalid app addresses cannot reach main routes.
		return !!(
			host &&
			(host.hostname === this.baseUrl.hostname ||
				host.hostname.endsWith(`.${this.baseUrl.hostname}`))
		);
	}

	private parseHost(value: string | undefined): URL | undefined {
		if (!value || /[\s/@?#\\]/.test(value)) return undefined;
		try {
			const host = new URL(`${this.baseUrl.protocol}//${value}`);
			host.hostname = host.hostname.replace(/\.$/, '');
			return host;
		} catch {
			return undefined;
		}
	}

	private requestPath(req: IncomingMessage): string {
		const url =
			'originalUrl' in req && typeof req.originalUrl === 'string' ? req.originalUrl : req.url;
		return (url ?? '').split('?')[0];
	}
}
