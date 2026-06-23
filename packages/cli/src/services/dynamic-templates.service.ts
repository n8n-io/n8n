import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

export const REQUEST_TIMEOUT_MS = 5000;

type DynamicTemplate = Record<string, unknown>;

@Service()
export class DynamicTemplatesService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			ssrf: 'disabled', // Fixed, n8n-controlled host
		});
	}

	async fetchDynamicTemplates(): Promise<DynamicTemplate[]> {
		if (!this.globalConfig.templates.dynamicTemplatesHost) {
			return [];
		}
		try {
			const response = (await this.http.request({
				url: this.globalConfig.templates.dynamicTemplatesHost,
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				json: true,
				timeout: REQUEST_TIMEOUT_MS,
			})) as { templates: DynamicTemplate[] };
			return response.templates;
		} catch (error) {
			this.logger.error('Error fetching dynamic templates', { error });
			throw error;
		}
	}
}
