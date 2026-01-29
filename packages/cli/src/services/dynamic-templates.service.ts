import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import axios from 'axios';

export const DYNAMIC_TEMPLATES_URL = 'https://dynamic-templates.n8n.io/templates';
export const REQUEST_TIMEOUT_MS = 5000;

type DynamicTemplate = Record<string, unknown>;

@Service()
export class DynamicTemplatesService {
	constructor(private readonly logger: Logger) {}

	async fetchDynamicTemplates(): Promise<DynamicTemplate[]> {
		try {
			const response = await axios.get<{ templates: DynamicTemplate[] }>(DYNAMIC_TEMPLATES_URL, {
				headers: { 'Content-Type': 'application/json' },
				timeout: REQUEST_TIMEOUT_MS,
			});
			return response.data.templates;
		} catch (error) {
			this.logger.error('Error fetching dynamic templates', { error });
			throw error;
		}
	}
}
