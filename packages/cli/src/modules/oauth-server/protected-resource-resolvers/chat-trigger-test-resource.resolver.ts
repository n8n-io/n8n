import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatTriggerResourceResolverBase } from './chat-trigger-resource.base';

@Service()
export class ChatTriggerTestResourceResolver extends ChatTriggerResourceResolverBase {
	constructor(
		protected readonly config: GlobalConfig,
		private readonly registrations: TestWebhookRegistrationsService,
		private readonly urlService: UrlService,
		protected readonly logger: Logger,
		protected readonly workflowFinderService: WorkflowFinderService,
	) {
		super();
	}

	readonly id = 'chat-trigger-test';

	protected get endpoint() {
		return this.config.endpoints.webhookTest;
	}

	protected get baseUrl() {
		return this.urlService.getTestWebhookBaseUrl();
	}

	/**
	 * The registration holds the workflow exactly as the editor is testing it (including
	 * unsaved changes), so it is the source of truth here — not the DB draft. The `setup` GET
	 * is the page the visitor loads and the only redirect target, so it is the leg the
	 * resource names.
	 */
	protected async findChatTrigger(path: string) {
		const registration = await this.registrations.get(
			this.registrations.toKey({ httpMethod: 'GET', path }),
		);
		if (!registration) {
			this.logger.debug(`No test webhook registration found for path: ${path}`);
			return undefined;
		}

		const { workflowEntity, webhook } = registration;

		const node = workflowEntity.nodes.find((n) => n.name === webhook.node);
		if (!node) {
			this.logger.debug(
				`No node found with name ${webhook.node} in test registration for workflow with ID: ${workflowEntity.id}`,
			);
			return undefined;
		}

		return { node, workflowId: workflowEntity.id, workflowName: workflowEntity.name };
	}
}
