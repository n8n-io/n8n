import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import axios from 'axios';

export const REQUEST_TIMEOUT_MS = 5000;

type DynamicTemplate = Record<string, unknown>;

@Service()
export class DynamicTemplatesService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	async fetchDynamicTemplates(): Promise<DynamicTemplate[]> {
		if (!this.globalConfig.templates.dynamicTemplatesHost) {
			return [];
		}
		try {
			const response = await axios.get<{ templates: DynamicTemplate[] }>(
				this.globalConfig.templates.dynamicTemplatesHost,
				{
					headers: { 'Content-Type': 'application/json' },
					timeout: REQUEST_TIMEOUT_MS,
				},
			);
			return response.data.templates;
		} catch (error) {
			this.logger.error('Error fetching dynamic templates', { error });
			throw error;
		}
	}
}
