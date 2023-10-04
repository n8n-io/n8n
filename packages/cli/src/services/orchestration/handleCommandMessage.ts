import { LoggerProxy } from 'n8n-workflow';
import { messageToRedisServiceCommandObject } from './helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import Container from 'typedi';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import type { N8nInstanceType } from '@/Interfaces';
import { License } from '@/License';

// this function handles commands sent to the MAIN instance. the workers handle their own commands
export async function handleCommandMessage(messageString: string) {
	const queueModeId = config.get('redis.queueModeId');
	const instanceType = config.get('generic.instanceType') as N8nInstanceType;
	const isMainInstance = instanceType === 'main';
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
				await Container.get(MessageEventBus).restart();
			case 'reloadExternalSecretsProviders':
				await Container.get(ExternalSecretsManager).reloadAllProviders();
			default:
				break;
		}
		return message;
	}
	return;
}
