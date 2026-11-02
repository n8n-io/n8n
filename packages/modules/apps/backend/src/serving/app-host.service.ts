import { appNamespaceSchema } from '@n8n/api-types';
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
	private readonly hostSuffix: string = '';

	constructor(
		config: AppsConfig,
		private readonly globalConfig: GlobalConfig,
		urls: UrlService,
	) {
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

	callbackUrl(app: { id: string; namespace: string }): string {
		const origin = this.origin(app.namespace);
		if (!origin) throw new BadRequestError('Use a valid app namespace before publishing this app.');
		return `${origin}/_n8n/auth/${app.id}/callback`;
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
}
