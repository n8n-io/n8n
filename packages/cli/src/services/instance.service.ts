import { Service } from 'typedi';
import config from '@/config';

@Service()
export class InstanceService {
	/**
	 * Return the n8n instance base URL without trailing slash.
	 */
	getInstanceBaseUrl(): string {
		const n8nBaseUrl = config.getEnv('editorBaseUrl') || this.getWebhookBaseUrl();
		return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
	}

	getWebhookBaseUrl() {
		let urlBaseWebhook = process.env.WEBHOOK_URL ?? this.getBaseUrl();
		if (!urlBaseWebhook.endsWith('/')) {
			urlBaseWebhook += '/';
		}
		return urlBaseWebhook;
	}

	/**
	 * Returns the base URL n8n is reachable from
	 */
	private getBaseUrl() {
		const protocol = config.getEnv('protocol');
		const host = config.getEnv('host');
		const port = config.getEnv('port');
		const path = config.getEnv('path');

		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${path}`;
		}
		return `${protocol}://${host}:${port}${path}`;
	}
}
