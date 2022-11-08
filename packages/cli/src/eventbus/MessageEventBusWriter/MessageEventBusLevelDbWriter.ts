/* eslint-disable @typescript-eslint/no-explicit-any */
import { Level } from 'level';
import { DateTime } from 'luxon';
import { EventMessage, EventMessageSerialized } from '../EventMessage/EventMessage';
import { MessageEventBusWriter } from './MessageEventBusWriter';
import { UserSettings } from 'n8n-core';
import path from 'path';
import { LoggerProxy as Logger } from 'n8n-workflow';

interface MessageEventBusLevelDbWriterOptions {
	dbName?: string;
	keepSentEventsForSeconds?: number;
}

/**
 * MessageEventBusWriter for LevelDB
 * NOTE: really does not like it when the thread crashes and keeps on corrupting the sublevels :(
 */
export class MessageEventBusLevelDbWriter implements MessageEventBusWriter {
	// main db instance = do not write into this directly, but use sentLevel
	// and unsentLevel instead(exception: atomic batch calls)
	#db: Level<string, EventMessageSerialized>;

	// db partition holding sent messages
	#sentLevel;

	// db partition holding unsent messages
	#unsentLevel;

	#keepSentEventsForSeconds: number;

	constructor(options?: MessageEventBusLevelDbWriterOptions) {
		this.#keepSentEventsForSeconds = options?.keepSentEventsForSeconds ?? 10;
		const n8nFolder = UserSettings.getUserN8nFolderPath();
		const dbPath = path.join(n8nFolder, options?.dbName ?? 'eventsdb');
		this.#db = new Level<string, EventMessageSerialized>(dbPath, { valueEncoding: 'json' });
		this.#sentLevel = this.#db.sublevel<string, EventMessageSerialized>('sent', {
			valueEncoding: 'json',
		});
		this.#unsentLevel = this.#db.sublevel<string, EventMessageSerialized>('unsent', {
			valueEncoding: 'json',
		});
		this.getMessagesUnsent().catch((error) => console.log(error));
		this.getMessagesSent().catch((error) => console.log(error));
		setInterval(async () => {
			console.log('Cleaning up leveldb...');
			await this.flushSentMessages();
		}, 5000);
	}

	close(): void {
		this.#sentLevel.close(() => {});
		this.#unsentLevel.close(() => {});
		this.#db.close(() => {});
	}

	async putMessage(msg: EventMessage): Promise<void> {
		try {
			await this.#unsentLevel.put(EventMessage.getKey(msg), msg.serialize());
		} catch (error) {
			console.log(error);
		}
	}

	putMessageSync(msg: EventMessage): void {
		this.#unsentLevel.put(EventMessage.getKey(msg), msg.serialize()).catch((error) => {
			console.error(error);
		});
	}

	async confirmMessageSent(key: string): Promise<void> {
		try {
			const msg = await this.#unsentLevel.get(key);
			console.debug(`MessageBufferLevelDbWriter Key confirmed ${key}`);
			// run as atomic batch action
			if (msg) {
				await this.#db.batch([
					{
						type: 'del',
						sublevel: this.#unsentLevel,
						key,
					},
					{
						type: 'put',
						sublevel: this.#sentLevel,
						key,
						value: msg,
					},
				]);
			}
		} catch (error) {
			Logger.error(`LevelDbWriter: confirmMessageSent(${key})`);
		}
	}

	async getMessages(): Promise<EventMessage[]> {
		const result = await this.#db.getMany(await this.#db.keys().all());
		return result.map((e) => EventMessage.deserialize(e));
	}

	async getMessagesSent(): Promise<EventMessage[]> {
		const result = await this.#sentLevel.getMany(await this.#sentLevel.keys().all());
		return result.map((e) => EventMessage.deserialize(e));
	}

	async getMessagesUnsent(): Promise<EventMessage[]> {
		const unsentKeys: string[] = await this.#unsentLevel.keys().all();
		const unsentValues = await this.#unsentLevel.getMany(unsentKeys);
		return unsentValues.map((e) => EventMessage.deserialize(e));
	}

	async flushSentMessages(ageLimitSeconds: number = this.#keepSentEventsForSeconds): Promise<void> {
		const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds }).toMillis();
		try {
			await this.#sentLevel.clear({ lte: clearDate });
		} catch (error) {
			console.log(error);
		}
	}
}
