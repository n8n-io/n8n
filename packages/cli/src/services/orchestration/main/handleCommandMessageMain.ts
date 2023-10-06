import { LoggerProxy } from 'n8n-workflow';
import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import Container from 'typedi';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';

export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.get('redis.queueModeId');
	const isMainInstance = config.get('generic.instanceType') === 'main';
	const message = messageToRedisServiceCommandObject(messageString);

	if (message) {
		LoggerProxy.debug(
			`RedisCommandHandler(main): Received command message ${message.command} from ${message.senderId}`,
		);
		if (
			message.senderId === queueModeId ||
			(message.targets && !message.targets.includes(queueModeId))
		) {
			// Skipping command message because it's not for this instance
			LoggerProxy.debug(
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
				if (isMainInstance) {
					// at this point in time, only a single main instance is supported, thus this command _should_ never be caught currently
					LoggerProxy.error(
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
			default:
				break;
		}
		return message;
	}
	return;
}
