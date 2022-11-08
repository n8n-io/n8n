// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { DateTime } from 'luxon';
// import { EventMessage } from '../EventMessage/EventMessage';
// import { MessageEventBusWriter } from './MessageEventBusWriter';
// import { UserSettings } from 'n8n-core';
// import path from 'path';
// import { Low } from 'lowdb';
// import { JSONFile } from 'lowdb/lib/node';

// // TODO: make configurable
// const KEEP_MESSAGE_BUFFER_FOR_SECONDS = 10;
// const KEEP_SENT_MESSAGES = true;

// interface LowdbMessageStore {
// 	[key: string]: EventMessage;
// }

// /**
//  * MessageEventBusWriter for lowdb
//  * CURRENTLY NON FUNCTIONAL DUE TO ESM IMPORT
//  */
// export class MessageEventBusLowdbWriter implements MessageEventBusWriter {
// 	#db: Low<LowdbMessageStore>;

// 	#dbSent: Low<LowdbMessageStore>;

// 	constructor(dbName = 'events.json', dbNameSent = 'events_sent.json') {
// 		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
// 		const n8nFolder = UserSettings.getUserN8nFolderPath();
// 		const dbPath = path.join(n8nFolder, dbName);
// 		const adapter = new JSONFile<LowdbMessageStore>(dbPath);
// 		this.#db = new Low<LowdbMessageStore>(adapter);
// 		// check db read works and initialize db.data
// 		this.#db.read().catch((error) => console.log(error));

// 		if (KEEP_SENT_MESSAGES) {
// 			const dbPathSent = path.join(n8nFolder, dbNameSent);
// 			const adapterSent = new JSONFile<LowdbMessageStore>(dbPathSent);
// 			this.#dbSent = new Low<LowdbMessageStore>(adapterSent);
// 			this.#dbSent.read().catch((error) => console.log(error));
// 		}

// 		setInterval(async () => {
// 			console.log('Cleaning up lowdb...');
// 			await this.flushSentMessages();
// 		}, 5000);
// 	}

// 	close(): void {}

// 	async putMessage(msg: EventMessage): Promise<void> {
// 		if (this.#db.data) {
// 			this.#db.data[msg.getKey()] = msg;
// 			await this.#db.write();
// 		}
// 	}

// 	async confirmMessageSent(key: string): Promise<void> {
// 		if (this.#db.data) {
// 			if (KEEP_SENT_MESSAGES && this.#dbSent?.data) {
// 				this.#dbSent.data[key] = this.#db.data[key];
// 			}
// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// 			delete this.#db.data[key];
// 			await this.#db.write();
// 		}
// 	}

// 	getMessages(): EventMessage[] {
// 		if (this.#db?.data) {
// 			return Object.keys(this.#db.data).map(function (key) {
// 				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
// 				return this.#db.data[key] as EventMessage;
// 			}, this);
// 		}
// 		return [];
// 	}

// 	getMessagesSent(): EventMessage[] {
// 		if (KEEP_SENT_MESSAGES && this.#dbSent?.data) {
// 			return Object.keys(this.#dbSent.data).map(function (key) {
// 				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
// 				return this.#db.data[key] as EventMessage;
// 			}, this);
// 		}
// 		return [];
// 	}

// 	async getMessagesUnsent(): Promise<EventMessage[]> {
// 		return this.getMessages();
// 	}

// 	// async recoverUnsentMessages(): Promise<void> {
// 	// 	if (this.#db?.data) {
// 	// 		return Object.keys(this.#dbSent.data);
// 	// 	}
// 	// 	return [];
// 	// }

// 	async flushSentMessages(
// 		ageLimitSeconds: number = KEEP_MESSAGE_BUFFER_FOR_SECONDS,
// 	): Promise<void> {
// 		if (KEEP_SENT_MESSAGES && this.#dbSent?.data) {
// 			const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds });
// 			Object.keys(this.#dbSent.data).map(function (key) {
// 				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
// 				if ((this.#dbSent.data[key] as EventMessage).ts < clearDate) {
// 					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
// 					delete this.#dbSent.data[key];
// 				}
// 			}, this);
// 			await this.#dbSent.write();
// 		}
// 	}
// }
