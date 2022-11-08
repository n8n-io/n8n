/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { EventMessage, EventMessageSerialized } from '../EventMessage/EventMessage';
import { MessageEventBusWriter } from './MessageEventBusWriter';
import { UserSettings } from 'n8n-core';
import path from 'path';
import { existsSync, promises, readFileSync, writeFileSync } from 'node:fs';
import { jsonParse } from 'n8n-workflow';

interface EventMessageStore {
	[key: string]: EventMessageSerialized;
}

class FileDb {
	data: EventMessageStore;

	constructor(private readonly dbPath: string) {
		if (!existsSync(this.dbPath)) {
			this.data = {};
			this.writeSync();
		} else {
			this.readSync();
		}
	}

	async write() {
		await promises.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), { encoding: 'utf8' });
	}

	writeSync() {
		writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), { encoding: 'utf8' });
	}

	async read(): Promise<EventMessageStore> {
		this.data = jsonParse<EventMessageStore>(
			await promises.readFile(this.dbPath, { encoding: 'utf8' }),
		);
		return this.data;
	}

	readSync(): EventMessageStore {
		this.data = jsonParse<EventMessageStore>(readFileSync(this.dbPath, { encoding: 'utf8' }));
		return this.data;
	}
}

interface MessageEventBusFileWriterOptions {
	dbName?: string;
	dbNameSent?: string;
	syncFileAccess?: boolean;
	keepSentEventsForSeconds?: number;
}

/**
 * MessageEventBusWriter for lowdb
 */
export class MessageEventBusFileWriter implements MessageEventBusWriter {
	#db: FileDb;

	#dbSent: FileDb;

	sync: boolean;

	keepSentEventsForSeconds: number;

	constructor(options?: MessageEventBusFileWriterOptions) {
		// @typescript-eslint/no-unsafe-call
		const n8nFolder = UserSettings.getUserN8nFolderPath();
		const dbPath = path.join(n8nFolder, options?.dbName ?? 'events.json');
		this.sync = options?.syncFileAccess ?? false;
		this.keepSentEventsForSeconds = options?.keepSentEventsForSeconds ?? 10;
		this.#db = new FileDb(dbPath);
		this.#db.readSync();

		if (this.keepSentEventsForSeconds > 0) {
			const dbPathSent = path.join(n8nFolder, options?.dbNameSent ?? 'events_sent.json');
			this.#dbSent = new FileDb(dbPathSent);
			this.#dbSent.readSync();
		}

		setInterval(async () => {
			console.log('Cleaning up FileDb...');
			await this.flushSentMessages();
		}, 5000);
	}

	close(): void {}

	async putMessage(msg: EventMessage): Promise<void> {
		if (this.#db?.data !== undefined) {
			this.#db.data[msg.getKey()] = msg.serialize();
			if (this.sync) {
				this.#db.writeSync();
			} else {
				await this.#db.write();
			}
		}
	}

	async confirmMessageSent(key: string): Promise<void> {
		if (this.#db?.data !== undefined) {
			if (this.keepSentEventsForSeconds > 0 && this.#dbSent?.data) {
				this.#dbSent.data[key] = this.#db.data[key];
			}
			delete this.#db.data[key];
			if (this.sync) {
				this.#db.writeSync();
			} else {
				await this.#db.write();
			}
		}
	}

	getMessages(): EventMessage[] {
		if (this.#db?.data !== undefined) {
			return Object.keys(this.#db.data).map(function (key) {
				return EventMessage.deserialize(this.#db.data[key] as EventMessageSerialized);
			}, this);
		}
		return [];
	}

	getMessagesSent(): EventMessage[] {
		if (this.keepSentEventsForSeconds > 0 && this.#db?.data !== undefined) {
			return Object.keys(this.#dbSent.data).map(function (key) {
				return EventMessage.deserialize(this.#dbSent.data[key] as EventMessageSerialized);
			}, this);
		}
		return [];
	}

	async getMessagesUnsent(): Promise<EventMessage[]> {
		return this.getMessages();
	}

	async flushSentMessages(ageLimitSeconds: number = this.keepSentEventsForSeconds): Promise<void> {
		if (this.keepSentEventsForSeconds > 0 && this.#db?.data !== undefined) {
			const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds });
			Object.keys(this.#dbSent.data).map(function (key) {
				const eventMessage = this.#dbSent.data[key]
					? EventMessage.deserialize(this.#dbSent.data[key] as EventMessageSerialized)
					: undefined;
				if (eventMessage)
					console.log(
						eventMessage.ts.toMillis(),
						clearDate.toMillis(),
						eventMessage.ts < clearDate,
					);
				if (eventMessage && eventMessage.ts < clearDate) {
					delete this.#dbSent.data[key];
				}
			}, this);
			if (this.sync) {
				this.#dbSent.writeSync();
			} else {
				await this.#dbSent.write();
			}
		}
	}
}
