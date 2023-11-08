/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container } from 'typedi';
import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import { Push } from '@/push';

export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = config.getEnv('generic.instanceType') === 'main';
	const message = messageToRedisServiceCommandObject(messageString);
	const logger = Container.get(Logger);
	const multiMainSetup = Container.get(MultiMainSetup);
	const externalHooks = Container.get(ExternalHooks);
	const push = Container.get(Push);

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
		switch (message.command) {
			case 'reloadLicense':
				if (!debounceMessageReceiver(message, 500)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}

				if (isMainInstance && !config.getEnv('leaderSelection.enabled')) {
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
				break;

			case 'reloadExternalSecretsProviders':
				if (!debounceMessageReceiver(message, 200)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				await Container.get(ExternalSecretsManager).reloadAllProviders();
				break;

			case 'workflowWasUpdated':
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
				}

				if (multiMainSetup.isFollower) break;

				const workflowRepository = Container.get(WorkflowRepository);

				const workflow = await workflowRepository.findOne({
					select: ['id', 'active'],
					where: {
						id: (message.payload?.workflowId as string) ?? '',
					},
				});

				if (!workflow) break;

				const activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

				try {
					await activeWorkflowRunner.remove(workflow.id);
					await activeWorkflowRunner.add(workflow.id, workflow.active ? 'update' : 'activate');
					await externalHooks.run('workflow.activate', [workflow]);
				} catch (e) {
					const error = e instanceof Error ? e : new Error(`${e}`);
					logger.error(`Error while trying to handle workflow update: ${error.message}`);
				}

				if (workflow.active) {
					await multiMainSetup.broadcastWorkflowWasActivated(
						workflow.id,
						[message.senderId],
						(message.payload?.pushSessionId as string) ?? '',
					);
				}

				break;

			case 'workflowWasActivated':
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
				}

				const { workflowId, sessionId } = message.payload ?? {};

				console.log('[activation] sessionId', sessionId);

				if (typeof workflowId !== 'string' || typeof sessionId !== 'string') break;

				push.send('workflowActivated', { workflowId }, sessionId);

				break;

			case 'workflowWasDeactivated':
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = { result: 'debounced' };
					return message;
				}

				const { _workflowId, _sessionId } = message.payload ?? {};

				console.log('[deactivation] sessionId', _sessionId);

				if (typeof _workflowId !== 'string' || typeof _sessionId !== 'string') break;

				push.send('workflowDeactivated', { workflowId: _workflowId }, _sessionId);

				break;

			default:
				break;
		}

		return message;
	}

	return;
}
