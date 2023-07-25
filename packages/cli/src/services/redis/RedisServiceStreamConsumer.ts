import { Service } from 'typedi';
import { LoggerProxy } from 'n8n-workflow';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

type LastId = string;

type StreamName = string;

type StreamDetails = {
	lastId: LastId;
	pollingInterval: number;
	waiter: NodeJS.Timeout | undefined;
};

@Service()
export class RedisServiceStreamConsumer extends RedisServiceBaseReceiver {
	// while actively listening, the stream name and last id are stored here
	// removing the entry will stop the listener
	streams: Map<StreamName, StreamDetails> = new Map();

	async init(): Promise<void> {
		await super.init('consumer');
	}

	async listenToStream(stream: StreamName, lastId = '$'): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		LoggerProxy.debug(`Redis client now listening to stream ${stream} starting with id ${lastId}`);
		this.setLastId(stream, lastId);
		let failedRuns = 0;
		while (this.streams.has(stream)) {
			const results = await this.redisClient?.xread('BLOCK', 0, 'STREAMS', stream, lastId);
			if (results) {
				const [_key, messages] = results[0];
				if (messages.length > 0) {
					messages.forEach(([id, message]) => {
						this.messageHandlers.forEach((handler) => handler(stream, id, message));
					});
					// Pass the last id of the results to the next round.
					lastId = messages[messages.length - 1][0];
					this.setLastId(stream, lastId);
				}
			} else {
				failedRuns++;
			}
			if (failedRuns > 10) {
				LoggerProxy.warn(
					`Redis stream ${stream} is not available (failed ${failedRuns} times). Stopping listening.`,
				);
				this.streams.delete(stream);
			}
			await new Promise((resolve) => {
				const waiter = setTimeout(resolve, this.streams.get(stream)?.pollingInterval ?? 1000);
				this.setWaiter(stream, waiter);
			});
		}
	}

	private updateStreamDetails(stream: StreamName, details: Partial<StreamDetails>): void {
		const existing = this.streams.get(stream);
		this.streams.set(stream, {
			lastId: details.lastId ?? existing?.lastId ?? '$',
			waiter: details.waiter ?? existing?.waiter,
			pollingInterval: details.pollingInterval ?? existing?.pollingInterval ?? 1000,
		});
	}

	setPollingInterval(stream: StreamName, pollingInterval: number): void {
		this.updateStreamDetails(stream, { pollingInterval });
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

	stopListeningToStream(stream: StreamName): void {
		LoggerProxy.debug(`Redis client stopped listening to stream ${stream}`);
		const existing = this.streams.get(stream);
		if (existing?.waiter) {
			clearTimeout(existing.waiter);
		}
		this.streams.delete(stream);
	}
}
