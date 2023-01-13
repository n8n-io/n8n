/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEventMessageOptions } from '../EventMessageClasses/AbstractEventMessage';
import { UserSettings } from 'n8n-core';
import path, { parse } from 'path';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { MessageEventBusLogWriterWorker } from './MessageEventBusLogWriterWorker';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import remove from 'lodash.remove';
import config from '@/config';
import { getEventMessageObjectByType } from '../EventMessageClasses/Helpers';
import type { EventMessageReturnMode } from '../MessageEventBus/MessageEventBus';
import type { EventMessageTypes } from '../EventMessageClasses';
import {
	EventMessageConfirm,
	EventMessageConfirmSource,
	isEventMessageConfirm,
} from '../EventMessageClasses/EventMessageConfirm';
import { once as eventOnce } from 'events';

interface MessageEventBusLogWriterOptions {
	syncFileAccess?: boolean;
	logBaseName?: string;
	logBasePath?: string;
	keepLogCount?: number;
	maxFileSizeInKB?: number;
}

interface ReadMessagesFromLogFileResult {
	loggedMessages: EventMessageTypes[];
	sentMessages: EventMessageTypes[];
	unfinishedExecutions: Set<string>;
}

/**
 * MessageEventBusWriter for Files
 */
export class MessageEventBusLogWriter {
	private static instance: MessageEventBusLogWriter;

	static options: Required<MessageEventBusLogWriterOptions>;

	private worker: ModuleThread<MessageEventBusLogWriterWorker> | null;

	/**
	 * Instantiates the Writer and the corresponding worker thread.
	 * To actually start logging, call startLogging() function on the instance.
	 *
	 * **Note** that starting to log will archive existing logs, so handle unsent events first before calling startLogging()
	 */
	static async getInstance(
		options?: MessageEventBusLogWriterOptions,
	): Promise<MessageEventBusLogWriter> {
		if (!MessageEventBusLogWriter.instance) {
			MessageEventBusLogWriter.instance = new MessageEventBusLogWriter();
			MessageEventBusLogWriter.options = {
				logBaseName: options?.logBaseName ?? config.getEnv('eventBus.logWriter.logBaseName'),
				logBasePath: options?.logBasePath ?? UserSettings.getUserN8nFolderPath(),
				syncFileAccess:
					options?.syncFileAccess ?? config.getEnv('eventBus.logWriter.syncFileAccess'),
				keepLogCount: options?.keepLogCount ?? config.getEnv('eventBus.logWriter.keepLogCount'),
				maxFileSizeInKB:
					options?.maxFileSizeInKB ?? config.getEnv('eventBus.logWriter.maxFileSizeInKB'),
			};
			await MessageEventBusLogWriter.instance.startThread();
		}
		return MessageEventBusLogWriter.instance;
	}

	/**
	 *  First archives existing log files one history level upwards,
	 *  then starts logging events into a fresh event log
	 */
	async startLogging() {
		await MessageEventBusLogWriter.instance.getThread()?.startLogging();
	}

	/**
	 *  Pauses all logging. Events are still received by the worker, they just are not logged any more
	 */
	async pauseLogging() {
		await MessageEventBusLogWriter.instance.getThread()?.pauseLogging();
	}

	private async startThread() {
		if (this.worker) {
			await this.close();
		}
		await MessageEventBusLogWriter.instance.spawnThread();
		await MessageEventBusLogWriter.instance
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

	private async spawnThread(): Promise<boolean> {
		this.worker = await spawn<MessageEventBusLogWriterWorker>(
			new Worker(`${parse(__filename).name}Worker`),
		);
		if (this.worker) {
			Thread.errors(this.worker).subscribe(async (error) => {
				LoggerProxy.error('Event Bus Log Writer thread error', error);
				await MessageEventBusLogWriter.instance.startThread();
			});
			return true;
		}
		return false;
	}

	getThread(): ModuleThread<MessageEventBusLogWriterWorker> | undefined {
		if (this.worker) {
			return this.worker;
		}
		return;
	}

	async close(): Promise<void> {
		if (this.worker) {
			await Thread.terminate(this.worker);
			this.worker = null;
		}
	}

	async putMessage(msg: EventMessageTypes): Promise<void> {
		if (this.worker) {
			await this.worker.appendMessageToLog(msg.serialize());
		}
	}

	async confirmMessageSent(msgId: string, source?: EventMessageConfirmSource): Promise<void> {
		if (this.worker) {
			await this.worker.confirmMessageSent(new EventMessageConfirm(msgId, source).serialize());
		}
	}

	async getMessages(
		mode: EventMessageReturnMode = 'all',
		logHistory = 1,
	): Promise<ReadMessagesFromLogFileResult> {
		const results: ReadMessagesFromLogFileResult = {
			loggedMessages: [],
			sentMessages: [],
			unfinishedExecutions: new Set<string>(),
		};
		const logCount = logHistory
			? Math.min(config.get('eventBus.logWriter.keepLogCount') as number, logHistory)
			: (config.get('eventBus.logWriter.keepLogCount') as number);
		for (let i = logCount; i >= 0; i--) {
			const logFileName = await MessageEventBusLogWriter.instance.getThread()?.getLogFileName(i);
			if (logFileName) {
				await this.readLoggedMessagesFromFile(results, mode, logFileName);
			}
		}

		return results;
	}

	async readLoggedMessagesFromFile(
		results: ReadMessagesFromLogFileResult,
		mode: EventMessageReturnMode,
		logFileName: string,
	): Promise<ReadMessagesFromLogFileResult> {
		if (logFileName && existsSync(logFileName)) {
			try {
				const rl = readline.createInterface({
					input: createReadStream(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					try {
						const json = jsonParse(line);
						if (isEventMessageOptions(json) && json.__type !== undefined) {
							const msg = getEventMessageObjectByType(json);
							if (msg !== null) results.loggedMessages.push(msg);
							if (msg?.eventName === 'n8n.workflow.started' && msg?.payload?.executionId) {
								results.unfinishedExecutions.add(msg?.payload?.executionId as string);
							} else if (
								(msg?.eventName === 'n8n.workflow.success' ||
									msg?.eventName === 'n8n.workflow.failed') &&
								msg?.payload?.executionId
							) {
								results.unfinishedExecutions.delete(msg?.payload?.executionId as string);
							}
						}
						if (isEventMessageConfirm(json) && mode !== 'all') {
							const removedMessage = remove(results.loggedMessages, (e) => e.id === json.confirm);
							if (mode === 'sent') {
								results.sentMessages.push(...removedMessage);
							}
						}
					} catch {
						LoggerProxy.error(
							`Error reading line messages from file: ${logFileName}, line: ${line}`,
						);
					}
				});
				// wait for stream to finish before continue
				await eventOnce(rl, 'close');
			} catch {
				LoggerProxy.error(`Error reading logged messages from file: ${logFileName}`);
			}
		}
		return results;
	}

	async getMessagesByExecutionId(
		executionId: string,
		logHistory?: number,
	): Promise<EventMessageTypes[]> {
		const result: EventMessageTypes[] = [];
		const logCount = logHistory
			? Math.min(config.get('eventBus.logWriter.keepLogCount') as number, logHistory)
			: (config.get('eventBus.logWriter.keepLogCount') as number);
		for (let i = 0; i < logCount; i++) {
			const logFileName = await MessageEventBusLogWriter.instance.getThread()?.getLogFileName(i);
			if (logFileName) {
				result.push(...(await this.readFromFileByExecutionId(executionId, logFileName)));
			}
		}
		return result.sort((a, b) => a.ts.diff(b.ts).toMillis());
	}

	async readFromFileByExecutionId(
		executionId: string,
		logFileName: string,
	): Promise<EventMessageTypes[]> {
		const messages: EventMessageTypes[] = [];
		if (logFileName && existsSync(logFileName)) {
			try {
				const rl = readline.createInterface({
					input: createReadStream(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					try {
						const json = jsonParse(line);
						if (
							isEventMessageOptions(json) &&
							json.__type !== undefined &&
							json.payload?.executionId === executionId
						) {
							const msg = getEventMessageObjectByType(json);
							if (msg !== null) messages.push(msg);
						}
					} catch {
						LoggerProxy.error(
							`Error reading line messages from file: ${logFileName}, line: ${line}`,
						);
					}
				});
				// wait for stream to finish before continue
				await eventOnce(rl, 'close');
			} catch {
				LoggerProxy.error(`Error reading logged messages from file: ${logFileName}`);
			}
		}
		return messages;
	}

	async getMessagesAll(): Promise<EventMessageTypes[]> {
		return (await this.getMessages('all')).loggedMessages;
	}

	async getMessagesSent(): Promise<EventMessageTypes[]> {
		return (await this.getMessages('sent')).sentMessages;
	}

	async getMessagesUnsent(): Promise<EventMessageTypes[]> {
		return (await this.getMessages('unsent')).loggedMessages;
	}

	async getUnfinishedExecutions(): Promise<Set<string>> {
		return (await this.getMessages('unfinished')).unfinishedExecutions;
	}

	async getUnsentAndUnfinishedExecutions(): Promise<{
		unsentMessages: EventMessageTypes[];
		unfinishedExecutions: Set<string>;
	}> {
		const result = await this.getMessages('unsent');
		return {
			unsentMessages: result.loggedMessages,
			unfinishedExecutions: result.unfinishedExecutions,
		};
	}
}
