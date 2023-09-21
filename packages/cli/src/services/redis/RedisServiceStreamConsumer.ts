import { Service } from 'typedi';
import { LoggerProxy } from 'n8n-workflow';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

type LastId = string;

type StreamName = string;

type StreamDetails = {
	lastId: LastId;
	pollingInterval: number;
	waiter: NodeJS.Timer | undefined;
};

@Service()
export class RedisServiceStreamConsumer extends RedisServiceBaseReceiver {
	readonly type = 'consumer';

	// while actively listening, the stream name and last id are stored here
	// removing the entry will stop the listener
	streams: Map<StreamName, StreamDetails> = new Map();

	async listenToStream(stream: StreamName, lastId = '$'): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		LoggerProxy.debug(`Redis client now listening to stream ${stream} starting with id ${lastId}`);
		this.setLastId(stream, lastId);
		const interval = this.streams.get(stream)?.pollingInterval ?? 1000;
		const waiter = setInterval(async () => {
			const currentLastId = this.streams.get(stream)?.lastId ?? '$';
			const results = await this.redisClient?.xread(
				'BLOCK',
				interval,
				'STREAMS',
				stream,
				currentLastId,
			);
			if (results && results.length > 0) {
				const [_key, messages] = results[0];
				if (messages.length > 0) {
					messages.forEach(([id, message]) => {
						this.messageHandlers.forEach((handler) => handler(stream, id, message));
					});
					// Pass the last id of the results to the next round.
					const newLastId = messages[messages.length - 1][0];
					this.setLastId(stream, newLastId);
				}
			}
		}, interval);
		this.setWaiter(stream, waiter);
	}

	stopListeningToStream(stream: StreamName): void {
		LoggerProxy.debug(`Redis client stopped listening to stream ${stream}`);
		const existing = this.streams.get(stream);
		if (existing?.waiter) {
			clearInterval(existing.waiter);
		}
		this.streams.delete(stream);
	}

	private updateStreamDetails(stream: StreamName, details: Partial<StreamDetails>): void {
		const existing = this.streams.get(stream);
		this.streams.set(stream, {
			lastId: details.lastId ?? existing?.lastId ?? '$',
			waiter: details.waiter ?? existing?.waiter,
			pollingInterval: details.pollingInterval ?? existing?.pollingInterval ?? 1000,
		});
	}

	async setPollingInterval(stream: StreamName, pollingInterval: number): Promise<void> {
		this.updateStreamDetails(stream, { pollingInterval });
		if (this.streams.get(stream)?.waiter) {
			this.stopListeningToStream(stream);
			await this.listenToStream(stream);
		}
	}

	setLastId(stream: StreamName, lastId: string): void {
		this.updateStreamDetails(stream, { lastId });
	}

	setWaiter(stream: StreamName, waiter: NodeJS.Timeout): void {
		// only update the waiter if the stream is still being listened to
		if (this.streams.get(stream)) {
			this.updateStreamDetails(stream, { waiter });
		}
	}
}
