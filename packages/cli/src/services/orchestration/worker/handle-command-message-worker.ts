import { jsonParse } from 'n8n-workflow';
import os from 'node:os';
import Container from 'typedi';

import { N8N_VERSION } from '@/constants';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { COMMAND_PUBSUB_CHANNEL } from '@/scaling/constants';
import type { PubSub } from '@/scaling/pubsub/pubsub.types';
import { CommunityPackagesService } from '@/services/community-packages.service';

import type { WorkerCommandReceivedHandlerOptions } from './types';
import { debounceMessageReceiver, getOsCpuString } from '../helpers';

// eslint-disable-next-line complexity
export async function getWorkerCommandReceivedHandler(
	messageString: string,
	options: WorkerCommandReceivedHandlerOptions,
) {
	if (!messageString) return;

	const logger = Container.get(Logger);
	let message: PubSub.Command;
	try {
		message = jsonParse<PubSub.Command>(messageString);
	} catch {
		logger.debug(
			`Received invalid message via channel ${COMMAND_PUBSUB_CHANNEL}: "${messageString}"`,
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
			case 'get-worker-status':
				if (!debounceMessageReceiver(message, 500)) return;
				await options.publisher.publishWorkerResponse({
					workerId: options.queueModeId,
					command: 'get-worker-status',
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
			case 'get-worker-id':
				if (!debounceMessageReceiver(message, 500)) return;
				await options.publisher.publishWorkerResponse({
					workerId: options.queueModeId,
					command: 'get-worker-id',
				});
				break;
			case 'restart-event-bus':
				if (!debounceMessageReceiver(message, 500)) return;
				try {
					await Container.get(MessageEventBus).restart();
					await options.publisher.publishWorkerResponse({
						workerId: options.queueModeId,
						command: 'restart-event-bus',
						payload: {
							result: 'success',
						},
					});
				} catch (error) {
					await options.publisher.publishWorkerResponse({
						workerId: options.queueModeId,
						command: 'restart-event-bus',
						payload: {
							result: 'error',
							error: (error as Error).message,
						},
					});
				}
				break;
			case 'reload-external-secrets-providers':
				if (!debounceMessageReceiver(message, 500)) return;
				try {
					await Container.get(ExternalSecretsManager).reloadAllProviders();
					await options.publisher.publishWorkerResponse({
						workerId: options.queueModeId,
						command: 'reload-external-secrets-providers',
						payload: {
							result: 'success',
						},
					});
				} catch (error) {
					await options.publisher.publishWorkerResponse({
						workerId: options.queueModeId,
						command: 'reload-external-secrets-providers',
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
			case 'reload-license':
				if (!debounceMessageReceiver(message, 500)) return;
				await Container.get(License).reload();
				break;
			default:
				if (
					message.command === 'relay-execution-lifecycle-event' ||
					message.command === 'clear-test-webhooks'
				) {
					break; // meant only for main
				}

				logger.debug(
					`Received unknown command via channel ${COMMAND_PUBSUB_CHANNEL}: "${message.command}"`,
				);
				break;
		}
	}
}
