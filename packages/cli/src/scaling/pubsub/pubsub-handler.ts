import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { PubSubEventMap } from '@/events/maps/pub-sub.event-map';
import { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
import { License } from '@/license';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { CommunityPackagesService } from '@/services/community-packages.service';
import { assertNever } from '@/utils';
import { TestWebhooks } from '@/webhooks/test-webhooks';

import type { PubSub } from './pubsub.types';
import { WorkerStatusService } from '../worker-status.service.ee';

/**
 * Responsible for handling events emitted from messages received via a pubsub channel.
 */
@Service()
export class PubSubHandler {
	constructor(
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly license: License,
		private readonly eventbus: MessageEventBus,
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly communityPackagesService: CommunityPackagesService,
		private readonly publisher: Publisher,
		private readonly workerStatusService: WorkerStatusService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly push: Push,
		private readonly workflowRepository: WorkflowRepository,
		private readonly testWebhooks: TestWebhooks,
	) {}

	init() {
		switch (this.instanceSettings.instanceType) {
			case 'webhook':
				this.setupHandlers(this.commonHandlers);
				break;
			case 'worker':
				this.setupHandlers({
					...this.commonHandlers,
					'get-worker-status': async () =>
						await this.publisher.publishWorkerResponse({
							senderId: this.instanceSettings.hostId,
							response: 'response-to-get-worker-status',
							payload: this.workerStatusService.generateStatus(),
						}),
				});
				break;
			case 'main':
				this.setupHandlers({
					...this.commonHandlers,
					...this.multiMainHandlers,
					'response-to-get-worker-status': async (payload) =>
						this.push.broadcast({
							type: 'sendWorkerStatusMessage',
							data: {
								workerId: payload.senderId,
								status: payload,
							},
						}),
				});

				break;
			default:
				assertNever(this.instanceSettings.instanceType);
		}
	}

	private setupHandlers<EventNames extends keyof PubSubEventMap>(
		map: {
			[EventName in EventNames]?: (event: PubSubEventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handlerFn] of Object.entries(map) as Array<
			[EventNames, (event: PubSubEventMap[EventNames]) => void | Promise<void>]
		>) {
			this.eventService.on(eventName, async (event) => {
				await handlerFn(event);
			});
		}
	}

	private commonHandlers: {
		[EventName in keyof PubSub.CommonEvents]: (event: PubSubEventMap[EventName]) => Promise<void>;
	} = {
		'reload-license': async () => await this.license.reload(),
		'restart-event-bus': async () => await this.eventbus.restart(),
		'reload-external-secrets-providers': async () =>
			await this.externalSecretsManager.reloadAllProviders(),
		'community-package-install': async ({ packageName, packageVersion }) =>
			await this.communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion),
		'community-package-update': async ({ packageName, packageVersion }) =>
			await this.communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion),
		'community-package-uninstall': async ({ packageName }) =>
			await this.communityPackagesService.removeNpmPackage(packageName),
	};

	private multiMainHandlers: {
		[EventName in keyof PubSub.MultiMainEvents]: (
			event: PubSubEventMap[EventName],
		) => Promise<void>;
	} = {
		'add-webhooks-triggers-and-pollers': async ({ workflowId }) => {
			if (this.instanceSettings.isFollower) return;

			try {
				await this.activeWorkflowManager.add(workflowId, 'activate', undefined, {
					shouldPublish: false, // prevent leader from re-publishing message
				});

				this.push.broadcast({ type: 'workflowActivated', data: { workflowId } });

				await this.publisher.publishCommand({
					command: 'display-workflow-activation',
					payload: { workflowId },
				}); // instruct followers to show activation in UI
			} catch (e) {
				const error = ensureError(e);
				const { message } = error;

				await this.workflowRepository.update(workflowId, { active: false });

				this.push.broadcast({
					type: 'workflowFailedToActivate',
					data: { workflowId, errorMessage: message },
				});

				await this.publisher.publishCommand({
					command: 'display-workflow-activation-error',
					payload: { workflowId, errorMessage: message },
				}); // instruct followers to show activation error in UI
			}
		},
		'remove-triggers-and-pollers': async ({ workflowId }) => {
			if (this.instanceSettings.isFollower) return;

			await this.activeWorkflowManager.removeActivationError(workflowId);
			await this.activeWorkflowManager.removeWorkflowTriggersAndPollers(workflowId);

			this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } });

			// instruct followers to show workflow deactivation in UI
			await this.publisher.publishCommand({
				command: 'display-workflow-deactivation',
				payload: { workflowId },
			});
		},
		'display-workflow-activation': async ({ workflowId }) =>
			this.push.broadcast({ type: 'workflowActivated', data: { workflowId } }),
		'display-workflow-deactivation': async ({ workflowId }) =>
			this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } }),
		'display-workflow-activation-error': async ({ workflowId, errorMessage }) =>
			this.push.broadcast({ type: 'workflowFailedToActivate', data: { workflowId, errorMessage } }),
		'relay-execution-lifecycle-event': async ({ pushRef, ...pushMsg }) => {
			if (!this.push.hasPushRef(pushRef)) return;

			this.push.send(pushMsg, pushRef);
		},
		'clear-test-webhooks': async ({ webhookKey, workflowEntity, pushRef }) => {
			if (!this.push.hasPushRef(pushRef)) return;

			this.testWebhooks.clearTimeout(webhookKey);

			const workflow = this.testWebhooks.toWorkflow(workflowEntity);

			await this.testWebhooks.deactivateWebhooks(workflow);
		},
	};
}
