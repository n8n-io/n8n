import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { RedisServiceCommandObject } from '@/services/redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '@/services/redis/RedisServiceHelper';
import type { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import * as os from 'os';
import Container from 'typedi';
import { License } from '@/License';
import { MessageEventBus } from '../eventbus/MessageEventBus/MessageEventBus';
import { ExternalSecretsManager } from '../ExternalSecrets/ExternalSecretsManager.ee';

export function getWorkerCommandReceivedHandler(options: {
	queueModeId: string;
	instanceId: string;
	redisPublisher: RedisServicePubSubPublisher;
	getRunningJobIds: () => string[];
}) {
	return async (channel: string, messageString: string) => {
		if (channel === COMMAND_REDIS_CHANNEL) {
			if (!messageString) return;
			let message: RedisServiceCommandObject;
			try {
				message = jsonParse<RedisServiceCommandObject>(messageString);
			} catch {
				LoggerProxy.debug(
					`Received invalid message via channel ${COMMAND_REDIS_CHANNEL}: "${messageString}"`,
				);
				return;
			}
			if (message) {
				LoggerProxy.debug(
					`RedisCommandHandler(worker): Received command message ${message.command} from ${message.senderId}`,
				);
				if (message.targets && !message.targets.includes(options.queueModeId)) {
					return; // early return if the message is not for this worker
				}
				switch (message.command) {
					case 'getStatus':
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: message.command,
							payload: {
								workerId: options.queueModeId,
								runningJobs: options.getRunningJobIds(),
								freeMem: os.freemem(),
								totalMem: os.totalmem(),
								uptime: process.uptime(),
								loadAvg: os.loadavg(),
								cpus: os.cpus().map((cpu) => `${cpu.model} - speed: ${cpu.speed}`),
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
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.queueModeId,
							command: message.command,
						});
						break;
					case 'restartEventBus':
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
						await Container.get(License).reload();
						break;
					case 'stopWorker':
						// TODO: implement proper shutdown
						// await this.stopProcess();
						break;
					default:
						LoggerProxy.debug(
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Received unknown command via channel ${COMMAND_REDIS_CHANNEL}: "${message.command}"`,
						);
						break;
				}
			}
		}
	};
}
