import { jsonParse } from 'n8n-workflow';
import os from 'node:os';
import Container from 'typedi';

import { N8N_VERSION } from '@/constants';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { Logger } from '@/logger';
import { CommunityPackagesService } from '@/services/community-packages.service';
import { COMMAND_REDIS_CHANNEL } from '@/services/redis/redis-constants';
import type { RedisServiceCommandObject } from '@/services/redis/redis-service-commands';

import type { WorkerCommandReceivedHandlerOptions } from './types';
import { debounceMessageReceiver, getOsCpuString } from '../helpers';

export function getWorkerCommandReceivedHandler(options: WorkerCommandReceivedHandlerOptions) {
	// eslint-disable-next-line complexity
	return async (channel: string, messageString: string) => {
		if (channel === COMMAND_REDIS_CHANNEL) {
			if (!messageString) return;
			const logger = Container.get(Logger);
			let message: RedisServiceCommandObject;
			try {
				message = jsonParse<RedisServiceCommandObject>(messageString);
			} catch {
				logger.debug(
					`Received invalid message via channel ${COMMAND_REDIS_CHANNEL}: "${messageString}"`,
				);
				return;
			}
			if (message) {
				logger.debug(
					`RedisCommandHandler(worker): Received command message ${message.command} from ${message.senderId}`,
				);
				if (message.targets && !message.targets.includes(options.queueModeId)) {
					return; // early return if the message is not for this worker
				}
				switch (message.command) {
					case 'getStatus':
						if (!debounceMessageReceiver(message, 500)) return;
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: 'getStatus',
							payload: {
								workerId: options.queueModeId,
								runningJobsSummary: options.getRunningJobsSummary(),
								freeMem: os.freemem(),
								totalMem: os.totalmem(),
								uptime: process.uptime(),
								loadAvg: os.loadavg(),
								cpus: getOsCpuString(),
								arch: os.arch(),
								platform: os.platform(),
								hostname: os.hostname(),
								interfaces: Object.values(os.networkInterfaces()).flatMap((interfaces) =>
									(interfaces ?? [])?.map((net) => ({
										family: net.family,
										address: net.address,
										internal: net.internal,
									})),
								),
								version: N8N_VERSION,
							},
						});
						break;
					case 'getId':
						if (!debounceMessageReceiver(message, 500)) return;
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: 'getId',
						});
						break;
					case 'restartEventBus':
						if (!debounceMessageReceiver(message, 500)) return;
						try {
							await Container.get(MessageEventBus).restart();
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: 'restartEventBus',
								payload: {
									result: 'success',
								},
							});
						} catch (error) {
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: 'restartEventBus',
								payload: {
									result: 'error',
									error: (error as Error).message,
								},
							});
						}
						break;
					case 'reloadExternalSecretsProviders':
						if (!debounceMessageReceiver(message, 500)) return;
						try {
							await Container.get(ExternalSecretsManager).reloadAllProviders();
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: 'reloadExternalSecretsProviders',
								payload: {
									result: 'success',
								},
							});
						} catch (error) {
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: 'reloadExternalSecretsProviders',
								payload: {
									result: 'error',
									error: (error as Error).message,
								},
							});
						}
						break;
					case 'community-package-install':
					case 'community-package-update':
					case 'community-package-uninstall':
						if (!debounceMessageReceiver(message, 500)) return;
						const { packageName, packageVersion } = message.payload;
						const communityPackagesService = Container.get(CommunityPackagesService);
						if (message.command === 'community-package-uninstall') {
							await communityPackagesService.removeNpmPackage(packageName);
						} else {
							await communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion);
						}
						break;
					case 'reloadLicense':
						if (!debounceMessageReceiver(message, 500)) return;
						await Container.get(License).reload();
						break;
					case 'stopWorker':
						if (!debounceMessageReceiver(message, 500)) return;
						// TODO: implement proper shutdown
						// await this.stopProcess();
						break;
					default:
						if (
							message.command === 'relay-execution-lifecycle-event' ||
							message.command === 'clear-test-webhooks'
						) {
							break; // meant only for main
						}

						logger.debug(
							`Received unknown command via channel ${COMMAND_REDIS_CHANNEL}: "${message.command}"`,
						);
						break;
				}
			}
		}
	};
}
