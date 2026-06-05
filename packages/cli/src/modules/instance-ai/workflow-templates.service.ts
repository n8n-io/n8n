import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import axios from 'axios';

export const TEMPLATE_REQUEST_TIMEOUT_MS = 5000;

export type WorkflowTemplateResult =
	| { available: true; template: Record<string, unknown> }
	| { available: false };

@Service()
export class WorkflowTemplatesService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	async getTemplate(templateId: string): Promise<WorkflowTemplateResult> {
		const { enabled, host } = this.globalConfig.templates;
		if (!enabled || !host) {
			return { available: false };
		}

		const url = `${host.replace(/\/?$/, '/')}templates/workflows/${encodeURIComponent(templateId)}`;
		try {
			const response = await axios.get<{ workflow: Record<string, unknown> }>(url, {
				headers: { 'Content-Type': 'application/json' },
				timeout: TEMPLATE_REQUEST_TIMEOUT_MS,
			});
			return { available: true, template: response.data.workflow };
		} catch (error) {
			this.logger.error('Error fetching workflow template', { error, templateId });
			throw error;
		}
	}
}
