import { Config, Env } from '@n8n/config';
import { UserError } from 'n8n-workflow';

import { WORKFLOW_PORTAL_CALLBACK_PATH } from './workflow-portal.constants';

@Config
export class WorkflowPortalConfig {
	@Env('N8N_WORKFLOW_PORTAL_BASE_URL')
	baseUrl: string = '';

	@Env('N8N_WORKFLOW_PORTAL_PORT')
	port: number = 5681;

	@Env('N8N_WORKFLOW_PORTAL_LISTEN_ADDRESS')
	listenAddress: string = '127.0.0.1';

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
			throw new UserError('Set N8N_WORKFLOW_PORTAL_BASE_URL to the public app origin.');
		}
		this.baseUrl = url.origin;

		if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) {
			throw new UserError('Set N8N_WORKFLOW_PORTAL_PORT to a port from 1 to 65535.');
		}
	}

	get callbackUrl() {
		return this.baseUrl + WORKFLOW_PORTAL_CALLBACK_PATH;
	}

	isPortalHost(host: string | undefined) {
		const hostname = URL.parse(`http://${host ?? ''}`)?.hostname.replace(/\.$/, '');
		return hostname === new URL(this.baseUrl).hostname.replace(/\.$/, '');
	}
}
