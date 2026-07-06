import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

export const TEMPLATE_REQUEST_TIMEOUT_MS = 5000;

export type WorkflowTemplateResult =
	| { available: true; template: Record<string, unknown> }
	| { available: false };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
			const response = await fetch(url, {
				headers: { Accept: 'application/json' },
				signal: AbortSignal.timeout(TEMPLATE_REQUEST_TIMEOUT_MS),
			});
			if (!response.ok) {
				throw new OperationalError(`Template request failed with status ${response.status}`);
			}
			const body: unknown = await response.json();
			const workflow = isRecord(body) ? body.workflow : undefined;
			if (!isRecord(workflow)) {
				this.logger.warn('Workflow template response missing workflow payload', { templateId });
				return { available: false };
			}
			return { available: true, template: workflow };
		} catch (error) {
			this.logger.error('Error fetching workflow template', { error, templateId });
			throw error;
		}
	}
}
