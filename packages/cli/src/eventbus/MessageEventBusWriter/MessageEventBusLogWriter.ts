/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessage, isEventMessageSerialized } from '../EventMessageClasses/EventMessage';
import { UserSettings } from 'n8n-core';
import path, { parse } from 'path';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { MessageEventBusLogWriterWorker } from './MessageEventBusLogWriterWorker';
import { MessageEventBusWriter } from './MessageEventBusWriter';
import {
	EventMessageConfirm,
	isEventMessageConfirmSerialized,
} from '../EventMessageClasses/EventMessageConfirm';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import events from 'events';
import { jsonParse } from 'n8n-workflow';
import remove from 'lodash.remove';

interface MessageEventBusLogWriterOptions {
	syncFileAccess?: boolean;
	logBaseName?: string;
	keepLogCount?: number;
}

/**
 * MessageEventBusWriter for Files
 */
export class MessageEventBusLogWriter implements MessageEventBusWriter {
	static #instance: MessageEventBusLogWriter;

	#worker: ModuleThread<MessageEventBusLogWriterWorker>;

	/**
	 * Instantiates the Writer and the corresponding worker thread.
	 * To actually start logging, call startLogging() function on the instance.
	 *
	 * **Note** that starting to log will archive existing logs, so handle unsent events first before calling startLogging()
	 */
	static async getInstance(
		options?: MessageEventBusLogWriterOptions,
	): Promise<MessageEventBusLogWriter> {
		if (!MessageEventBusLogWriter.#instance) {
			MessageEventBusLogWriter.#instance = new MessageEventBusLogWriter();
			await MessageEventBusLogWriter.#instance.#spawnThread();
			const n8nFolder = UserSettings.getUserN8nFolderPath();
			const logFileBasePath = path.join(n8nFolder, options?.logBaseName ?? 'n8nEventLog');
			const syncFileAccess = options?.syncFileAccess ?? false;
			await MessageEventBusLogWriter.#instance
				.getThread()
				?.initialize(logFileBasePath, syncFileAccess);
		}
		return MessageEventBusLogWriter.#instance;
	}

	/**
	 *  First archives existing log files one history level upwards,
	 *  then starts logging events into a fresh event log
	 */
	async startLogging() {
		await MessageEventBusLogWriter.#instance.getThread()?.startLogging();
	}

	/**
	 *  Pauses all logging. Events are still received by the worker, they just are not logged any more
	 */
	async pauseLogging() {
		await MessageEventBusLogWriter.#instance.getThread()?.pauseLogging();
	}

	async #spawnThread(): Promise<boolean> {
		this.#worker = await spawn(new Worker(`${parse(__filename).name}Worker`));
		if (this.#worker) {
			Thread.events(this.#worker).subscribe((event) => console.debug('Thread event:', event));
			return true;
		}
		return false;
	}

	getThread(): ModuleThread<MessageEventBusLogWriterWorker> | undefined {
		if (this.#worker) {
			return this.#worker;
		}
		return;
	}

	async close(): Promise<void> {
		if (this.#worker) {
			await Thread.terminate(this.#worker);
		}
	}

	async putMessage(msg: EventMessage): Promise<void> {
		if (this.#worker) {
			await this.#worker.appendMessageToLog(msg);
		}
	}

	async confirmMessageSent(msgId: string): Promise<void> {
		if (this.#worker) {
			await this.#worker.confirmMessageSent(new EventMessageConfirm({ confirm: msgId }));
		}
	}

	async getMessages(mode: 'sent' | 'unsent' | 'all' = 'all'): Promise<EventMessage[]> {
		const logFileName = await MessageEventBusLogWriter.#instance.getThread()?.getLogFileName();
		if (logFileName && existsSync(logFileName)) {
			const loggedMessages: EventMessage[] = [];
			const sentMessages: EventMessage[] = [];
			try {
				const rl = readline.createInterface({
					input: createReadStream(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					const json = jsonParse(line);
					if (isEventMessageSerialized(json)) {
						const msg = EventMessage.deserialize(json);
						loggedMessages.push(msg);
					}
					if (isEventMessageConfirmSerialized(json) && mode !== 'all') {
						const removedMessage = remove(loggedMessages, (e) => e.id === json.confirm);
						if (mode === 'sent') {
							sentMessages.push(...removedMessage);
						}
					}
				});
				// wait for stream to finish before continue
				await events.once(rl, 'close');
			} catch (error) {
				console.log(error);
			}
			switch (mode) {
				case 'all':
				case 'unsent':
					return loggedMessages;
				case 'sent':
					return sentMessages;
			}
		}
		return [];
	}

	async getMessagesSent(): Promise<EventMessage[]> {
		return this.getMessages('sent');
	}

	async getMessagesUnsent(): Promise<EventMessage[]> {
		return this.getMessages('unsent');
	}

	async flushSentMessages(ageLimitSeconds: number): Promise<void> {
		// 	if (this.keepSentEventsForSeconds > 0 && this.#db?.data !== undefined) {
		// 		const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds });
		// 		Object.keys(this.#dbSent.data).map(function (key) {
		// 			const eventMessage = this.#dbSent.data[key]
		// 				? EventMessage.deserialize(this.#dbSent.data[key] as EventMessageSerialized)
		// 				: undefined;
		// 			if (eventMessage)
		// 				console.log(
		// 					eventMessage.ts.toMillis(),
		// 					clearDate.toMillis(),
		// 					eventMessage.ts < clearDate,
		// 				);
		// 			if (eventMessage && eventMessage.ts < clearDate) {
		// 				delete this.#dbSent.data[key];
		// 			}
		// 		}, this);
		// 		if (this.sync) {
		// 			this.#dbSent.writeSync();
		// 		} else {
		// 			await this.#dbSent.write();
		// 		}
		// 	}
	}
}
