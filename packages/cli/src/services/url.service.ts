import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { PathResolvingService } from '@/services/path-resolving.service';

@Service()
export class UrlService {
	/** Returns the base URL n8n is reachable from */
	readonly baseUrl: string;

	/** The normalized URL base path from N8N_BASE_PATH or legacy N8N_PATH */
	readonly basePath: string;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly pathResolvingService: PathResolvingService,
	) {
		this.basePath = this.pathResolvingService.getUrlBasePath();
		this.baseUrl = this.generateBaseUrl();
	}

	/** Returns the base URL of the production webhooks */
	getWebhookBaseUrl() {
		// N8N_WEBHOOK_URL (config `webhookUrl`, already normalized by @n8n/config) is the successor to the
		// deprecated WEBHOOK_URL; we prefer it when set. Only the legacy env var still needs quote trimming.
		let base =
			this.globalConfig.webhookUrl || this.trimQuotes(process.env.WEBHOOK_URL) || this.baseUrl;
		if (!base.endsWith('/')) base += '/';
		return base;
	}

	getTestWebhookBaseUrl() {
		let base = this.globalConfig.webhookUrl || this.getInstanceBaseUrl();
		if (!base.endsWith('/')) base += '/';
		return base;
	}

	/** Return the n8n instance base URL without trailing slash */
	getInstanceBaseUrl(): string {
		const n8nBaseUrl = this.trimQuotes(this.globalConfig.editorBaseUrl) || this.getWebhookBaseUrl();

		return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
	}

	/** Returns the absolute URL of this instance's JWKS endpoint. */
	getInstanceJwksUri(): string {
		return `${this.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}/.well-known/jwks.json`;
	}

	private generateBaseUrl(): string {
		const { port, host, protocol } = this.globalConfig;

		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${this.basePath}`;
		}
		return `${protocol}://${host}:${port}${this.basePath}`;
	}

	/** Remove leading and trailing double quotes from a URL. */
	private trimQuotes(url?: string) {
		return url?.replace(/^["]+|["]+$/g, '') ?? '';
	}
}
