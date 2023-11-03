import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';
import type { RedisServiceCommandObject } from '@/services/redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '@/services/redis/RedisServiceHelper';
import * as os from 'os';
import { License } from '@/License';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { debounceMessageReceiver, getOsCpuString } from '../helpers';
import type { WorkerCommandReceivedHandlerOptions } from './types';
import { Logger } from '@/Logger';

export function getWorkerCommandReceivedHandler(options: WorkerCommandReceivedHandlerOptions) {
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
						if (!debounceMessageReceiver(message, 200)) return;
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: message.command,
							payload: {
								workerId: options.queueModeId,
								runningJobs: options.getRunningJobIds(),
								runningJobsSummary: options.getRunningJobsSummary(),
								freeMem: os.freemem(),
								totalMem: os.totalmem(),
								uptime: process.uptime(),
								loadAvg: os.loadavg(),
								cpus: getOsCpuString(),
								arch: os.arch(),
								platform: os.platform(),
								hostname: os.hostname(),
								net: Object.values(os.networkInterfaces()).flatMap(
									(interfaces) =>
										interfaces?.map((net) => `${net.family} - address: ${net.address}`) ?? '',
								),
							},
						});
						break;
					case 'getId':
						if (!debounceMessageReceiver(message, 200)) return;
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: message.command,
						});
						break;
					case 'restartEventBus':
						if (!debounceMessageReceiver(message, 100)) return;
						try {
							await Container.get(MessageEventBus).restart();
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: message.command,
								payload: {
									result: 'success',
								},
							});
						} catch (error) {
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: message.command,
								payload: {
									result: 'error',
									error: (error as Error).message,
								},
							});
						}
						break;
					case 'reloadExternalSecretsProviders':
						if (!debounceMessageReceiver(message, 200)) return;
						try {
							await Container.get(ExternalSecretsManager).reloadAllProviders();
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: message.command,
								payload: {
									result: 'success',
								},
							});
						} catch (error) {
							await options.redisPublisher.publishToWorkerChannel({
								workerId: options.queueModeId,
								command: message.command,
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
						logger.debug(
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Received unknown command via channel ${COMMAND_REDIS_CHANNEL}: "${message.command}"`,
						);
						break;
				}
			}
		}
	};
}
