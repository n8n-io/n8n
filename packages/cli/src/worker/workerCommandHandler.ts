import { jsonParse, LoggerProxy } from 'n8n-workflow';
import { eventBus } from '../eventbus';
import type { RedisServiceCommandObject } from '@/services/redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '@/services/redis/RedisServiceHelper';
import type { RedisServicePubSubPublisher } from '../services/redis/RedisServicePubSubPublisher';
import * as os from 'os';

export function getWorkerCommandReceivedHandler(options: {
	uniqueInstanceId: string;
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
				if (message.targets && !message.targets.includes(options.uniqueInstanceId)) {
					return; // early return if the message is not for this worker
				}
				switch (message.command) {
					case 'getStatus':
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.uniqueInstanceId,
							command: message.command,
							payload: {
								workerId: options.uniqueInstanceId,
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
							workerId: options.uniqueInstanceId,
							command: message.command,
						});
						break;
					case 'restartEventBus':
						await eventBus.restart();
						await options.redisPublisher.publishToWorkerChannel({
							workerId: options.uniqueInstanceId,
							command: message.command,
							payload: {
								result: 'success',
							},
						});
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
