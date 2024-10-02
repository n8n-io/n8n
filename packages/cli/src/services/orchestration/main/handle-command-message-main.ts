import { InstanceSettings } from 'n8n-core';
import { Container } from 'typedi';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { Push } from '@/push';
import { CommunityPackagesService } from '@/services/community-packages.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { TestWebhooks } from '@/webhooks/test-webhooks';

import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';

// eslint-disable-next-line complexity
export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = Container.get(InstanceSettings).instanceType === 'main';
	const message = messageToRedisServiceCommandObject(messageString);
	const logger = Container.get(Logger);

	if (message) {
		logger.debug(
			`RedisCommandHandler(main): Received command message ${message.command} from ${message.senderId}`,
		);

		const selfSendingAllowed = [
			'add-webhooks-triggers-and-pollers',
			'remove-triggers-and-pollers',
		].includes(message.command);

		if (
			!selfSendingAllowed &&
			(message.senderId === queueModeId ||
				(message.targets && !message.targets.includes(queueModeId)))
		) {
			// Skipping command message because it's not for this instance
			logger.debug(
				`Skipping command message ${message.command} because it's not for this instance.`,
			);
			return message;
		}

		const push = Container.get(Push);

		switch (message.command) {
			case 'reload-license':
				if (!debounceMessageReceiver(message, 500)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				if (isMainInstance && !config.getEnv('multiMainSetup.enabled')) {
					return message; // this main is the sender, so disregard
				}
				await Container.get(License).reload();
				break;
			case 'restart-event-bus':
				if (!debounceMessageReceiver(message, 200)) {
					return { ...message, payload: { result: 'debounced' } };
				}
				await Container.get(MessageEventBus).restart();
			case 'reload-external-secrets-providers':
				if (!debounceMessageReceiver(message, 200)) {
					return { ...message, payload: { result: 'debounced' } };
				}
				await Container.get(ExternalSecretsManager).reloadAllProviders();
				break;
			case 'community-package-install':
			case 'community-package-update':
			case 'community-package-uninstall':
				if (!debounceMessageReceiver(message, 200)) {
					return message;
				}
				const { packageName } = message.payload;
				const communityPackagesService = Container.get(CommunityPackagesService);
				if (message.command === 'community-package-uninstall') {
					await communityPackagesService.removeNpmPackage(packageName);
				} else {
					await communityPackagesService.installOrUpdateNpmPackage(
						packageName,
						message.payload.packageVersion,
					);
				}
				break;

			case 'add-webhooks-triggers-and-pollers': {
				if (!debounceMessageReceiver(message, 100)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				const orchestrationService = Container.get(OrchestrationService);

				if (orchestrationService.isFollower) break;

				if (typeof message.payload?.workflowId !== 'string') break;

				const { workflowId } = message.payload;

				try {
					await Container.get(ActiveWorkflowManager).add(workflowId, 'activate', undefined, {
						shouldPublish: false, // prevent leader re-publishing message
					});

					push.broadcast('workflowActivated', { workflowId });

					// instruct followers to show activation in UI
					await orchestrationService.publish('display-workflow-activation', { workflowId });
				} catch (error) {
					if (error instanceof Error) {
						await Container.get(WorkflowRepository).update(workflowId, { active: false });

						Container.get(Push).broadcast('workflowFailedToActivate', {
							workflowId,
							errorMessage: error.message,
						});

						await Container.get(OrchestrationService).publish('display-workflow-activation-error', {
							workflowId,
							errorMessage: error.message,
						});
					}
				}

				break;
			}

			case 'remove-triggers-and-pollers': {
				if (!debounceMessageReceiver(message, 100)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				const orchestrationService = Container.get(OrchestrationService);

				if (orchestrationService.isFollower) break;

				if (typeof message.payload?.workflowId !== 'string') break;

				const { workflowId } = message.payload;

				const activeWorkflowManager = Container.get(ActiveWorkflowManager);

				await activeWorkflowManager.removeActivationError(workflowId);
				await activeWorkflowManager.removeWorkflowTriggersAndPollers(workflowId);

				push.broadcast('workflowDeactivated', { workflowId });

				// instruct followers to show workflow deactivation in UI
				await orchestrationService.publish('display-workflow-deactivation', { workflowId });

				break;
			}

			case 'display-workflow-activation': {
				if (!debounceMessageReceiver(message, 100)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				const { workflowId } = message.payload ?? {};

				if (typeof workflowId !== 'string') break;

				push.broadcast('workflowActivated', { workflowId });

				break;
			}

			case 'display-workflow-deactivation': {
				if (!debounceMessageReceiver(message, 100)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				const { workflowId } = message.payload ?? {};

				if (typeof workflowId !== 'string') break;

				push.broadcast('workflowDeactivated', { workflowId });

				break;
			}

			case 'display-workflow-activation-error': {
				if (!debounceMessageReceiver(message, 100)) {
					return { ...message, payload: { result: 'debounced' } };
				}

				const { workflowId, errorMessage } = message.payload ?? {};

				if (typeof workflowId !== 'string' || typeof errorMessage !== 'string') break;

				Container.get(Push).broadcast('workflowFailedToActivate', { workflowId, errorMessage });

				break;
			}

			case 'relay-execution-lifecycle-event': {
				/**
				 * Do not debounce this - all events share the same message name.
				 */

				const { type, args, pushRef } = message.payload;

				if (!push.getBackend().hasPushRef(pushRef)) break;

				push.send(type, args, pushRef);

				break;
			}

			case 'clear-test-webhooks': {
				if (!debounceMessageReceiver(message, 100)) {
					// @ts-expect-error Legacy typing
					message.payload = { result: 'debounced' };
					return message;
				}

				const { webhookKey, workflowEntity, pushRef } = message.payload;

				if (!push.getBackend().hasPushRef(pushRef)) break;

				const testWebhooks = Container.get(TestWebhooks);

				testWebhooks.clearTimeout(webhookKey);

				const workflow = testWebhooks.toWorkflow(workflowEntity);

				await testWebhooks.deactivateWebhooks(workflow);

				break;
			}

			default:
				break;
		}
		return message;
	}
	return;
}
