import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

/** What the card and the result of `propose_automation` say about this n8n instance. */
@Service()
export class AutomationInstanceInfo {
	constructor(
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Link that opens the workflow in the editor. */
	workflowUrl(workflowId: string): string {
		return `${this.urlService.getInstanceBaseUrl()}/workflow/${encodeURIComponent(workflowId)}`;
	}

	/** The time zone of a schedule when the workflow settings do not set one. */
	get defaultTimezone(): string {
		return this.globalConfig.generic.timezone;
	}
}
