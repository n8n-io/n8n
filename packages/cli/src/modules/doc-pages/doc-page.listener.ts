import type { DocPageResourceType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { DocPageAiService } from './doc-page-ai.service';
import { DocPageService } from './doc-page.service';

@Service()
export class DocPageListener {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly docPageService: DocPageService,
		private readonly docPageAiService: DocPageAiService,
		private readonly userRepository: UserRepository,
	) {
		this.logger = this.logger.scoped('doc-pages');
	}

	init() {
		this.eventService.on('workflow-activated', async ({ workflowId, user }) => {
			await this.onPublish('workflow', workflowId, user.id);
		});
		this.eventService.on('agent-published', async ({ agentId, user }) => {
			await this.onPublish('agent', agentId, user.id);
		});
		this.eventService.on('workflow-deleted', async ({ workflowId }) => {
			await this.run('delete page', async () => {
				await this.docPageService.deleteByResource('workflow', workflowId);
			});
		});
		this.eventService.on('agent-deleted', async ({ agentId }) => {
			await this.run('delete page', async () => {
				await this.docPageService.deleteByResource('agent', agentId);
			});
		});
	}

	/**
	 * On the first publish, creates the page and writes it with the LLM.
	 * Later publishes only refresh the page properties.
	 */
	async onPublish(type: DocPageResourceType, id: string, userId: string) {
		await this.run('update page on publish', async () => {
			const resource = await this.docPageService.loadResource(type, id);
			if (!resource) return;
			if (await this.docPageService.hasPage(type, id)) {
				await this.docPageService.refreshProperties(resource);
				return;
			}
			if (!resource.kind) return;

			const page = await this.docPageService.ensureForResource(resource, userId);
			const user = await this.userRepository.findByIdWithRole(userId);
			if (!page || !user) return;

			await this.docPageAiService.generateForPage(user, page.id, resource);
		});
	}

	private async run(action: string, operation: () => Promise<void>) {
		try {
			await operation();
		} catch (error) {
			this.logger.error(`Failed to ${action}`, { error });
		}
	}
}
