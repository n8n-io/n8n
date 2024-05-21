import { Container } from 'typedi';
import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { Push } from '@/push';
import { TestWebhooks } from '@/TestWebhooks';
import { OrchestrationService } from '@/services/orchestration.service';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

// eslint-disable-next-line complexity
export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = config.getEnv('generic.instanceType') === 'main';
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
			case 'reloadLicense':
				if (!debounceMessageReceiver(message, 500)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}

				if (isMainInstance && !config.getEnv('multiMainSetup.enabled')) {
					// at this point in time, only a single main instance is supported, thus this command _should_ never be caught currently
					logger.error(
						'Received command to reload license via Redis, but this should not have happened and is not supported on the main instance yet.',
					);
					return message;
				}
				await Container.get(License).reload();
				break;
			case 'restartEventBus':
				if (!debounceMessageReceiver(message, 200)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				await Container.get(MessageEventBus).restart();
			case 'reloadExternalSecretsProviders':
				if (!debounceMessageReceiver(message, 200)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				await Container.get(ExternalSecretsManager).reloadAllProviders();
				break;

			case 'add-webhooks-triggers-and-pollers': {
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
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

						await Container.get(OrchestrationService).publish('workflow-failed-to-activate', {
							workflowId,
							errorMessage: error.message,
						});
					}
				}

				break;
			}

			case 'remove-triggers-and-pollers': {
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
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
					message.payload = { result: 'debounced' };
					return message;
				}

				const { workflowId } = message.payload ?? {};

				if (typeof workflowId !== 'string') break;

				push.broadcast('workflowActivated', { workflowId });

				break;
			}

			case 'display-workflow-deactivation': {
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
				}

				const { workflowId } = message.payload ?? {};

				if (typeof workflowId !== 'string') break;

				push.broadcast('workflowDeactivated', { workflowId });

				break;
			}

			case 'workflow-failed-to-activate': {
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
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
