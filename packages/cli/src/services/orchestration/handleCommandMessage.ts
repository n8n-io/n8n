import { LoggerProxy } from 'n8n-workflow';
import { messageToRedisServiceCommandObject } from './helpers';
import Container from 'typedi';
import { License } from '@/License';

// this function handles commands sent to the MAIN instance. the workers handle their own commands
export async function handleCommandMessage(messageString: string, uniqueInstanceId: string) {
	const message = messageToRedisServiceCommandObject(messageString);
	if (message) {
		if (
			message.senderId === uniqueInstanceId ||
			(message.targets && !message.targets.includes(uniqueInstanceId))
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
