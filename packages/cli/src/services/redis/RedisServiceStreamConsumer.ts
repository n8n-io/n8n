import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger, LoggerProxy } from 'n8n-workflow';
import { getDefaultRedisClient } from './RedisServiceHelper';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

type LastId = string;

type StreamName = string;

@Service()
export class RedisServiceStreamConsumer extends RedisServiceBaseReceiver {
	// while actively listening, the stream name and last id are stored here
	// removing the entry will stop the listener
	static listeningState: Map<StreamName, LastId> = new Map();

	async init(): Promise<Redis | Cluster> {
		if (RedisServiceStreamConsumer.redisClient && RedisServiceStreamConsumer.isInitialized) {
			return RedisServiceStreamConsumer.redisClient;
		}
		RedisServiceStreamConsumer.redisClient = await getDefaultRedisClient(undefined, 'consumer');
		RedisServiceStreamConsumer.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceStreamConsumer.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServiceStreamConsumer.redisClient;
	}

	async listenToStream(stream: StreamName, lastId = '$'): Promise<void> {
		if (!RedisServiceStreamConsumer.redisClient) {
			await this.init();
		}
		LoggerProxy.debug(`Redis client now listening to stream ${stream} starting with id ${lastId}`);
		RedisServiceStreamConsumer.listeningState.set(stream, lastId);
		let failedRuns = 0;
		while (RedisServiceStreamConsumer.listeningState.has(stream)) {
			const results = await RedisServiceStreamConsumer.redisClient?.xread(
				'BLOCK',
				0,
				'STREAMS',
				stream,
				lastId,
			);
			if (results) {
				const [_key, messages] = results[0];
				messages.forEach(([id, message]) => {
					RedisServiceStreamConsumer.messageHandlers.forEach((handler) =>
						handler(stream, id, message),
					);
				});
				// Pass the last id of the results to the next round.
				lastId = messages[messages.length - 1][0];
				RedisServiceStreamConsumer.listeningState.set(stream, lastId);
			} else {
				failedRuns++;
			}
			if (failedRuns > 10) {
				LoggerProxy.warn(
					`Redis stream ${stream} is not available (failed ${failedRuns} times). Stopping listening.`,
				);
				RedisServiceStreamConsumer.listeningState.delete(stream);
			}
		}
	}

	stopListening(stream: StreamName): void {
		LoggerProxy.debug(`Redis client stopped listening to stream ${stream}`);
		RedisServiceStreamConsumer.listeningState.delete(stream);
	}
}
