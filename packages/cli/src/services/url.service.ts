import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { PathResolvingService } from '@/services/path-resolving.service';

@Service()
export class UrlService {
	/** Returns the base URL n8n is reachable from */
	readonly baseUrl: string;

	/** The normalized base path combining N8N_BASE_PATH and N8N_PATH */
	readonly basePath: string;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly pathResolvingService: PathResolvingService,
	) {
		// Use PathResolvingService for consistent path resolution
		this.basePath = this.pathResolvingService.getBasePath();
		this.baseUrl = this.generateBaseUrl();
	}

	/** Returns the base URL of the webhooks */
	getWebhookBaseUrl() {
		// WEBHOOK_URL overrides the entire webhook URL
		let urlBaseWebhook = this.trimQuotes(process.env.WEBHOOK_URL) || this.baseUrl;
		if (!urlBaseWebhook.endsWith('/')) {
			urlBaseWebhook += '/';
		}
		return urlBaseWebhook;
	}

	/** Return the n8n instance base URL without trailing slash */
	getInstanceBaseUrl(): string {
		const n8nBaseUrl = this.trimQuotes(this.globalConfig.editorBaseUrl) || this.getWebhookBaseUrl();

		return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
	}

	private generateBaseUrl(): string {
		const { port, host, protocol } = this.globalConfig;

		// Use the normalized basePath which combines N8N_BASE_PATH and N8N_PATH
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
