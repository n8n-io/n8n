/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEventMessageOptions } from '../EventMessageClasses/AbstractEventMessage';
import { UserSettings } from 'n8n-core';
import path, { parse } from 'path';
import { Worker } from 'worker_threads';
import { createReadStream, existsSync, rmSync } from 'fs';
import readline from 'readline';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import remove from 'lodash.remove';
import config from '@/config';
import { getEventMessageObjectByType } from '../EventMessageClasses/Helpers';
import type { EventMessageReturnMode } from '../MessageEventBus/MessageEventBus';
import type { EventMessageTypes } from '../EventMessageClasses';
import type { EventMessageConfirmSource } from '../EventMessageClasses/EventMessageConfirm';
import {
	EventMessageConfirm,
	isEventMessageConfirm,
} from '../EventMessageClasses/EventMessageConfirm';
import { once as eventOnce } from 'events';
import { inTest } from '../../constants';

interface MessageEventBusLogWriterConstructorOptions {
	logBaseName?: string;
	logBasePath?: string;
	keepNumberOfFiles?: number;
	maxFileSizeInKB?: number;
}

export interface MessageEventBusLogWriterOptions {
	logFullBasePath: string;
	keepNumberOfFiles: number;
	maxFileSizeInKB: number;
}

interface ReadMessagesFromLogFileResult {
	loggedMessages: EventMessageTypes[];
	sentMessages: EventMessageTypes[];
	unfinishedExecutions: Record<string, EventMessageTypes[]>;
}

/**
 * MessageEventBusWriter for Files
 */
export class MessageEventBusLogWriter {
	private static instance: MessageEventBusLogWriter;

	static options: Required<MessageEventBusLogWriterOptions>;

	private _worker: Worker | undefined;

	public get worker(): Worker | undefined {
		return this._worker;
	}

	/**
	 * Instantiates the Writer and the corresponding worker thread.
	 * To actually start logging, call startLogging() function on the instance.
	 *
	 * **Note** that starting to log will archive existing logs, so handle unsent events first before calling startLogging()
	 */
	static async getInstance(
		options?: MessageEventBusLogWriterConstructorOptions,
	): Promise<MessageEventBusLogWriter> {
		if (!MessageEventBusLogWriter.instance) {
			MessageEventBusLogWriter.instance = new MessageEventBusLogWriter();
			MessageEventBusLogWriter.options = {
				logFullBasePath: path.join(
					options?.logBasePath ?? UserSettings.getUserN8nFolderPath(),
					options?.logBaseName ?? config.getEnv('eventBus.logWriter.logBaseName'),
				),
				keepNumberOfFiles:
					options?.keepNumberOfFiles ?? config.getEnv('eventBus.logWriter.keepLogCount'),
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
	startLogging() {
		if (this.worker) {
			this.worker.postMessage({ command: 'startLogging', data: {} });
		}
	}

	/**
	 *  Pauses all logging. Events are still received by the worker, they just are not logged any more
	 */
	async pauseLogging() {
		if (this.worker) {
			this.worker.postMessage({ command: 'pauseLogging', data: {} });
		}
	}

	private async startThread() {
		if (this.worker) {
			await this.close();
		}
		await MessageEventBusLogWriter.instance.spawnThread();
		if (this.worker) {
			this.worker.postMessage({ command: 'initialize', data: MessageEventBusLogWriter.options });
		}
	}

	private async spawnThread(): Promise<boolean> {
		const parsedName = parse(__filename);
		let workerFileName;
		if (inTest) {
			workerFileName = './dist/eventbus/MessageEventBusWriter/MessageEventBusLogWriterWorker.js';
		} else {
			workerFileName = path.join(parsedName.dir, `${parsedName.name}Worker${parsedName.ext}`);
		}
		this._worker = new Worker(workerFileName);
		if (this.worker) {
			this.worker.on('messageerror', async (error) => {
				LoggerProxy.error('Event Bus Log Writer thread error, attempting to restart...', error);
				await MessageEventBusLogWriter.instance.startThread();
			});
			return true;
		}
		return false;
	}

	async close(): Promise<void> {
		if (this.worker) {
			await this.worker.terminate();
			this._worker = undefined;
		}
	}

	putMessage(msg: EventMessageTypes): void {
		if (this.worker) {
			this.worker.postMessage({ command: 'appendMessageToLog', data: msg.serialize() });
		}
	}

	confirmMessageSent(msgId: string, source?: EventMessageConfirmSource): void {
		if (this.worker) {
			this.worker.postMessage({
				command: 'confirmMessageSent',
				data: new EventMessageConfirm(msgId, source).serialize(),
			});
		}
	}

	async getMessages(
		mode: EventMessageReturnMode = 'all',
		logHistory = 1,
	): Promise<ReadMessagesFromLogFileResult> {
		const results: ReadMessagesFromLogFileResult = {
			loggedMessages: [],
			sentMessages: [],
			unfinishedExecutions: {},
		};
		const configLogCount = config.get('eventBus.logWriter.keepLogCount');
		const logCount = logHistory ? Math.min(configLogCount, logHistory) : configLogCount;
		for (let i = logCount; i >= 0; i--) {
			const logFileName = this.getLogFileName(i);
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
							if (msg?.eventName && msg.payload?.executionId) {
								const executionId = msg.payload.executionId as string;
								switch (msg.eventName) {
									case 'n8n.workflow.started':
										if (!Object.keys(results.unfinishedExecutions).includes(executionId)) {
											results.unfinishedExecutions[executionId] = [];
										}
										results.unfinishedExecutions[executionId] = [msg];
										break;
									case 'n8n.workflow.success':
									case 'n8n.workflow.failed':
									case 'n8n.workflow.crashed':
										delete results.unfinishedExecutions[executionId];
										break;
									case 'n8n.node.started':
									case 'n8n.node.finished':
										if (!Object.keys(results.unfinishedExecutions).includes(executionId)) {
											results.unfinishedExecutions[executionId] = [];
										}
										results.unfinishedExecutions[executionId].push(msg);
										break;
								}
							}
						}
						if (isEventMessageConfirm(json) && mode !== 'all') {
							const removedMessage = remove(results.loggedMessages, (e) => e.id === json.confirm);
							if (mode === 'sent') {
								results.sentMessages.push(...removedMessage);
							}
						}
					} catch (error) {
						LoggerProxy.error(
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Error reading line messages from file: ${logFileName}, line: ${line}, ${error.message}}`,
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

	getLogFileName(counter?: number): string {
		if (counter) {
			return `${MessageEventBusLogWriter.options.logFullBasePath}-${counter}.log`;
		} else {
			return `${MessageEventBusLogWriter.options.logFullBasePath}.log`;
		}
	}

	cleanAllLogs() {
		for (let i = 0; i <= MessageEventBusLogWriter.options.keepNumberOfFiles; i++) {
			if (existsSync(this.getLogFileName(i))) {
				rmSync(this.getLogFileName(i));
			}
		}
	}

	async getMessagesByExecutionId(
		executionId: string,
		logHistory?: number,
	): Promise<EventMessageTypes[]> {
		const result: EventMessageTypes[] = [];
		const configLogCount = config.get('eventBus.logWriter.keepLogCount');
		const logCount = logHistory ? Math.min(configLogCount, logHistory) : configLogCount;
		for (let i = 0; i < logCount; i++) {
			const logFileName = this.getLogFileName(i);
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

	async getUnfinishedExecutions(): Promise<Record<string, EventMessageTypes[]>> {
		return (await this.getMessages('unfinished')).unfinishedExecutions;
	}

	async getUnsentAndUnfinishedExecutions(): Promise<{
		unsentMessages: EventMessageTypes[];
		unfinishedExecutions: Record<string, EventMessageTypes[]>;
	}> {
		const result = await this.getMessages('unsent');
		return {
			unsentMessages: result.loggedMessages,
			unfinishedExecutions: result.unfinishedExecutions,
		};
	}
}
