import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';
import type { RedisServiceCommandObject } from '@/services/redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '@/services/redis/RedisConstants';
import * as os from 'os';
import { License } from '@/License';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { debounceMessageReceiver, getOsCpuString } from '../helpers';
import type { WorkerCommandReceivedHandlerOptions } from './types';
import { Logger } from '@/Logger';
import { N8N_VERSION } from '@/constants';

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
