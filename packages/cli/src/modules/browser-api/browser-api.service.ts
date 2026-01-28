import type { PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent, type NodeExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';

import { browserApiDataSchema, type ValidatedBrowserApiData } from './browser-api.schema';

/**
 * Service that handles browser API calls triggered by workflow nodes.
 * When a node sets browserApi metadata, this service sends a push message
 * to connected browser sessions to invoke the appropriate browser API.
 *
 * Security:
 * - Payloads are validated with Zod before processing
 * - Messages are sent only to the user who triggered the execution
 *   (for manual executions) or to the workflow owner (for production executions).
 * - Messages are never broadcast to all connected users.
 */
@Service()
export class BrowserApiService {
	constructor(
		private readonly push: Push,
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
	) {
		this.logger = this.logger.scoped('push');
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	async handleNodeExecuteAfter(ctx: NodeExecuteAfterContext) {
		const browserApi = ctx.taskData.metadata?.browserApi;

		if (!browserApi) {
			return;
		}

		// Validate the browserApi payload
		const validationResult = browserApiDataSchema.safeParse(browserApi);
		if (!validationResult.success) {
			this.logger.warn('Invalid browserApi payload rejected', {
				workflowId: ctx.workflow.id,
				nodeName: ctx.nodeName,
				errors: validationResult.error.issues,
			});
			return;
		}

		const validatedData = validationResult.data;

		// Construct push message
		const pushMessage = {
			type: 'browserApi',
			data: {
				...validatedData,
				workflowId: ctx.workflow.id,
				workflowName: ctx.workflow.name,
			},
		} as PushMessage;

		// Determine target and send message
		const pushRef = ctx.executionData.pushRef;
		if (pushRef) {
			this.logger.debug('Sending browser API message to session', {
				workflowId: ctx.workflow.id,
				nodeName: ctx.nodeName,
				type: validatedData.type,
				pushRef,
			});
			this.push.send(pushMessage, pushRef);
			return;
		}

		const manualUserId = ctx.executionData.manualData?.userId;
		if (manualUserId) {
			this.logger.debug('Sending browser API message to user', {
				workflowId: ctx.workflow.id,
				nodeName: ctx.nodeName,
				type: validatedData.type,
				userId: manualUserId,
			});
			this.push.sendToUsers(pushMessage, [manualUserId]);
			return;
		}

		// Production execution - send to workflow owner
		await this.sendToWorkflowOwner(ctx, pushMessage, validatedData.type);
	}

	/**
	 * Sends the push message to the workflow owner for production executions.
	 */
	private async sendToWorkflowOwner(
		ctx: NodeExecuteAfterContext,
		pushMessage: PushMessage,
		browserApiType: ValidatedBrowserApiData['type'],
	): Promise<void> {
		try {
			const project = await this.ownershipService.getWorkflowProjectCached(ctx.workflow.id);
			const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);

			if (owner) {
				this.logger.debug('Sending browser API message to workflow owner', {
					workflowId: ctx.workflow.id,
					nodeName: ctx.nodeName,
					type: browserApiType,
					ownerId: owner.id,
				});
				this.push.sendToUsers(pushMessage, [owner.id]);
			} else {
				this.logger.debug('Skipping browser API message for team project workflow', {
					workflowId: ctx.workflow.id,
					nodeName: ctx.nodeName,
					type: browserApiType,
					projectId: project.id,
				});
			}
		} catch (error) {
			this.logger.warn('Failed to determine workflow owner for browser API message', {
				workflowId: ctx.workflow.id,
				nodeName: ctx.nodeName,
				error: ensureError(error),
			});
		}
	}
}
