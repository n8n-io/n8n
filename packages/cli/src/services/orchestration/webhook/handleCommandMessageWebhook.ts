import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import Container from 'typedi';
import { Logger } from 'winston';
import { messageToRedisServiceCommandObject, debounceMessageReceiver } from '../helpers';
import config from '@/config';

export async function handleCommandMessageWebhook(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = config.getEnv('generic.instanceType') === 'main';
	const message = messageToRedisServiceCommandObject(messageString);
	const logger = Container.get(Logger);

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

			default:
				break;
		}

		return message;
	}

	return;
}
