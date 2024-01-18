import { Container } from 'typedi';
import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { Push } from '@/push';
import { MultiMainSetup } from './MultiMainSetup.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { TestWebhooks } from '@/TestWebhooks';

export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = config.getEnv('generic.instanceType') === 'main';
	const message = messageToRedisServiceCommandObject(messageString);
	const logger = Container.get(Logger);
	const activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

	if (message) {
		logger.debug(
			`RedisCommandHandler(main): Received command message ${message.command} from ${message.senderId}`,
		);
		if (
			message.senderId === queueModeId ||
			(message.targets && !message.targets.includes(queueModeId))
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

			case 'workflowActiveStateChanged': {
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
				}

				const { workflowId, oldState, newState, versionId } = message.payload ?? {};

				if (
					typeof workflowId !== 'string' ||
					typeof oldState !== 'boolean' ||
					typeof newState !== 'boolean' ||
					typeof versionId !== 'string'
				) {
					break;
				}

				if (!oldState && newState) {
					try {
						await activeWorkflowRunner.add(workflowId, 'activate');
						push.broadcast('workflowActivated', { workflowId });
					} catch (e) {
						const error = e instanceof Error ? e : new Error(`${e}`);

						await Container.get(WorkflowRepository).update(workflowId, {
							active: false,
							versionId,
						});

						await Container.get(MultiMainSetup).publish('workflowFailedToActivate', {
							workflowId,
							errorMessage: error.message,
						});
					}
				} else if (oldState && !newState) {
					await activeWorkflowRunner.remove(workflowId);
					push.broadcast('workflowDeactivated', { workflowId });
				} else {
					await activeWorkflowRunner.remove(workflowId);
					await activeWorkflowRunner.add(workflowId, 'update');
				}

				await activeWorkflowRunner.removeActivationError(workflowId);
			}

			case 'workflowFailedToActivate': {
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

				const { type, args, sessionId } = message.payload;

				if (!push.getBackend().hasSessionId(sessionId)) break;

				push.send(type, args, sessionId);

				break;
			}

			case 'clear-test-webhooks': {
				if (!debounceMessageReceiver(message, 100)) {
					// @ts-expect-error Legacy typing
					message.payload = { result: 'debounced' };
					return message;
				}

				const { webhookKey, workflowEntity, sessionId } = message.payload;

				if (!push.getBackend().hasSessionId(sessionId)) break;

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
