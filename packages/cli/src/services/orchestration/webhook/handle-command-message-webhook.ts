import { InstanceSettings } from 'n8n-core';
import Container from 'typedi';
import { Logger } from 'winston';

import config from '@/config';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { CommunityPackagesService } from '@/services/community-packages.service';

import { messageToRedisServiceCommandObject, debounceMessageReceiver } from '../helpers';

export async function handleCommandMessageWebhook(messageString: string) {
	const queueModeId = config.getEnv('redis.queueModeId');
	const isMainInstance = Container.get(InstanceSettings).instanceType === 'main';
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
			case 'reload-license':
				if (!debounceMessageReceiver(message, 500)) {
					return { ...message, payload: { result: 'debounced' } };
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

			default:
				break;
		}

		return message;
	}

	return;
}
