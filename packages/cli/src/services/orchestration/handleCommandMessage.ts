import { Container } from 'typedi';
import { LoggerProxy } from 'n8n-workflow';
import config from '@/config';
import { License } from '@/License';
import { messageToRedisServiceCommandObject } from './helpers';

// this function handles commands sent to the MAIN instance. the workers handle their own commands
export async function handleCommandMessage(messageString: string) {
	const queueModeId = config.get('redis.queueModeId');
	const message = messageToRedisServiceCommandObject(messageString);
	if (message) {
		if (
			message.senderId === queueModeId ||
			(message.targets && !message.targets.includes(queueModeId))
		) {
			LoggerProxy.debug(
				`Skipping command message ${message.command} because it's not for this instance.`,
			);
			return message;
		}
		switch (message.command) {
			case 'reloadLicense':
				await Container.get(License).reload();
				break;
			default:
				break;
		}
		return message;
	}
	return;
}
