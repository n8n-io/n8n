import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

@Service()
export class UrlService {
	/** Returns the base URL n8n is reachable from */
	readonly baseUrl: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.baseUrl = this.generateBaseUrl();
	}

	/** Returns the base URL of the production webhooks */
	getWebhookBaseUrl() {
		// N8N_WEBHOOK_URL (via config webhookUrl) is the successor to the deprecated WEBHOOK_URL, so we prefer it when set.
		const configured = this.globalConfig.webhookUrl || process.env.WEBHOOK_URL;
		let base = this.trimQuotes(configured) || this.baseUrl;
		if (!base.endsWith('/')) base += '/';
		return base;
	}

	getTestWebhookBaseUrl() {
		let base = this.trimQuotes(this.globalConfig.webhookUrl) || this.getInstanceBaseUrl();
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
		const { path, port, host, protocol } = this.globalConfig;

		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${path}`;
		}
		return `${protocol}://${host}:${port}${path}`;
	}

	/** Remove leading and trailing double quotes from a URL. */
	private trimQuotes(url?: string) {
		return url?.replace(/^["]+|["]+$/g, '') ?? '';
	}
}
