/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEventMessageSerialized } from '../EventMessageClasses/AbstractEventMessage';
import { UserSettings } from 'n8n-core';
import path, { parse } from 'path';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { MessageEventBusLogWriterWorker } from './MessageEventBusLogWriterWorker';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import events from 'events';
import { jsonParse, JsonValue } from 'n8n-workflow';
import remove from 'lodash.remove';
import config from '../../config';
import { getEventMessageByType } from '../EventMessageClasses/Helpers';
import { EventMessageReturnMode } from '../MessageEventBus/MessageEventBus';
import { EventMessageTypeNames, EventMessageTypes } from '../EventMessageClasses';
import { DateTime } from 'luxon';

interface MessageEventBusLogWriterOptions {
	syncFileAccess?: boolean;
	logBaseName?: string;
	logBasePath?: string;
	keepLogCount?: number;
	maxFileSizeInKB?: number;
}

class EventMessageConfirm {
	readonly __type = EventMessageTypeNames.eventMessageConfirm;

	readonly confirm: string;

	readonly ts: DateTime;

	constructor(confirm: string) {
		this.confirm = confirm;
		this.ts = DateTime.now();
	}

	serialize(): JsonValue {
		// TODO: filter payload for sensitive info here?
		return {
			__type: this.__type,
			confirm: this.confirm,
			ts: this.ts.toISO(),
		};
	}
}

const isEventMessageConfirm = (candidate: unknown): candidate is EventMessageConfirm => {
	const o = candidate as EventMessageConfirm;
	if (!o) return false;
	return o.confirm !== undefined && o.ts !== undefined;
};

/**
 * MessageEventBusWriter for Files
 */
export class MessageEventBusLogWriter {
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

	async putMessage(msg: EventMessageTypes): Promise<void> {
		if (this.#worker) {
			await this.#worker.appendMessageToLog(msg.serialize());
		}
	}

	async confirmMessageSent(msgId: string): Promise<void> {
		if (this.#worker) {
			await this.#worker.confirmMessageSent(new EventMessageConfirm(msgId).serialize());
		}
	}

	async getMessages(
		mode: EventMessageReturnMode = 'all',
		includePreviousLog = true,
	): Promise<EventMessageTypes[]> {
		const logFileName0 = await MessageEventBusLogWriter.#instance.getThread()?.getLogFileName();
		const logFileName1 = includePreviousLog
			? await MessageEventBusLogWriter.#instance.getThread()?.getLogFileName(1)
			: undefined;
		const results: {
			loggedMessages: EventMessageTypes[];
			sentMessages: EventMessageTypes[];
		} = {
			loggedMessages: [],
			sentMessages: [],
		};
		if (logFileName0) {
			await this.readLoggedMessagesFromFile(results, mode, logFileName0);
		}
		if (logFileName1) {
			await this.readLoggedMessagesFromFile(results, mode, logFileName1);
		}
		switch (mode) {
			case 'all':
			case 'unsent':
				return results.loggedMessages;
			case 'sent':
				return results.sentMessages;
		}
		return [];
	}

	async readLoggedMessagesFromFile(
		results: {
			loggedMessages: EventMessageTypes[];
			sentMessages: EventMessageTypes[];
		},
		mode: EventMessageReturnMode,
		logFileName: string,
	): Promise<{
		loggedMessages: EventMessageTypes[];
		sentMessages: EventMessageTypes[];
	}> {
		if (logFileName && existsSync(logFileName)) {
			try {
				const rl = readline.createInterface({
					input: createReadStream(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					const json = jsonParse(line);
					if (isEventMessageSerialized(json)) {
						const msg = getEventMessageByType(json);
						if (msg !== null) results.loggedMessages.push(msg);
					}
					if (isEventMessageConfirm(json) && mode !== 'all') {
						const removedMessage = remove(results.loggedMessages, (e) => e.id === json.confirm);
						if (mode === 'sent') {
							results.sentMessages.push(...removedMessage);
						}
					}
				});
				// wait for stream to finish before continue
				await events.once(rl, 'close');
			} catch (error) {
				console.log(error);
			}
		}
		return results;
	}

	async getMessagesSent(): Promise<EventMessageTypes[]> {
		return this.getMessages('sent');
	}

	async getMessagesUnsent(): Promise<EventMessageTypes[]> {
		return this.getMessages('unsent');
	}
}
