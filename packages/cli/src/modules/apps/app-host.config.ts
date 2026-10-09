import { Config, Env } from '@n8n/config';
import { UserError } from 'n8n-workflow';

import { APP_CALLBACK_PATH, APP_SERVING_PATH } from './app-host.constants';

@Config
export class AppHostConfig {
	@Env('N8N_APPS_BASE_URL')
	baseUrl: string = '';

	sanitize() {
		const url = URL.parse(this.baseUrl);
		if (
			!url ||
			!['http:', 'https:'].includes(url.protocol) ||
			url.pathname !== '/' ||
			url.search ||
			url.hash ||
			url.username ||
			url.password
		) {
			throw new UserError('Set N8N_APPS_BASE_URL to the public app origin.');
		}
		this.baseUrl = url.origin;
	}

	get callbackUrl() {
		return this.baseUrl + APP_CALLBACK_PATH;
	}

	isAppHost(host: string | undefined) {
		const hostname = URL.parse(`http://${host ?? ''}`)
			?.hostname.toLowerCase()
			.replace(/\.$/, '');
		return hostname === new URL(this.baseUrl).hostname.toLowerCase().replace(/\.$/, '');
	}

	appUrl(namespace: string) {
		return `${this.baseUrl}${APP_SERVING_PATH}/${encodeURIComponent(namespace)}/`;
	}
}
