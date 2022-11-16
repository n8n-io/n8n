/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessage, isEventMessageSerialized } from '../EventMessageClasses/EventMessage';
import { UserSettings } from 'n8n-core';
import path, { parse } from 'path';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { MessageEventBusLogWriterWorker } from './MessageEventBusLogWriterWorker';
import { MessageEventBusWriter } from '../EventMessageClasses/MessageEventBusWriter';
import {
	EventMessageConfirm,
	isEventMessageConfirmSerialized,
} from '../EventMessageClasses/EventMessageConfirm';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import events from 'events';
import { jsonParse } from 'n8n-workflow';
import remove from 'lodash.remove';
import config from '../../config';

interface MessageEventBusLogWriterOptions {
	syncFileAccess?: boolean;
	logBaseName?: string;
	logBasePath?: string;
	keepLogCount?: number;
	maxFileSizeInKB?: number;
}

/**
 * MessageEventBusWriter for Files
 */
export class MessageEventBusLogWriter implements MessageEventBusWriter {
	static #instance: MessageEventBusLogWriter;

	static options: Required<MessageEventBusLogWriterOptions>;

	#worker: ModuleThread<MessageEventBusLogWriterWorker> | null;

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
			MessageEventBusLogWriter.options = {
				logBaseName: options?.logBaseName ?? config.getEnv('eventBus.logWriter.logBaseName'),
				logBasePath: options?.logBasePath ?? UserSettings.getUserN8nFolderPath(),
				syncFileAccess:
					options?.syncFileAccess ?? config.getEnv('eventBus.logWriter.syncFileAccess'),
				keepLogCount: options?.keepLogCount ?? config.getEnv('eventBus.logWriter.keepLogCount'),
				maxFileSizeInKB:
					options?.maxFileSizeInKB ?? config.getEnv('eventBus.logWriter.maxFileSizeInKB'),
			};
			await MessageEventBusLogWriter.#instance.#startThread();
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

	async #startThread() {
		if (this.#worker) {
			await this.close();
		}
		await MessageEventBusLogWriter.#instance.#spawnThread();
		await MessageEventBusLogWriter.#instance
			.getThread()
			?.initialize(
				path.join(
					MessageEventBusLogWriter.options.logBasePath,
					MessageEventBusLogWriter.options.logBaseName,
				),
				MessageEventBusLogWriter.options.syncFileAccess,
				MessageEventBusLogWriter.options.keepLogCount,
				MessageEventBusLogWriter.options.maxFileSizeInKB,
			);
	}

	async #spawnThread(): Promise<boolean> {
		this.#worker = await spawn<MessageEventBusLogWriterWorker>(
			new Worker(`${parse(__filename).name}Worker`),
		);
		if (this.#worker) {
			// Thread.events(this.#worker).subscribe((event) => {});
			Thread.errors(this.#worker).subscribe(async (error) => {
				console.debug('Thread errors:', error);
				await MessageEventBusLogWriter.#instance.#startThread();
			});
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
			this.#worker = null;
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
}
