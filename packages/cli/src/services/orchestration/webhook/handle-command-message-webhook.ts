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
			case 'community-package-install':
			case 'community-package-update':
			case 'community-package-uninstall':
				if (!debounceMessageReceiver(message, 200)) {
					return message;
				}
				const { packageName, packageVersion } = message.payload;
				const communityPackagesService = Container.get(CommunityPackagesService);
				if (message.command === 'community-package-uninstall') {
					await communityPackagesService.removeNpmPackage(packageName);
				} else {
					await communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion);
				}
				break;

			default:
				break;
		}

		return message;
	}

	return;
}
