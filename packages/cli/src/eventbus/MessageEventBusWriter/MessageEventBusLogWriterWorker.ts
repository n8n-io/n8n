/* eslint-disable @typescript-eslint/no-explicit-any */
import { appendFileSync, existsSync, rmSync, renameSync, openSync, closeSync } from 'fs';
import { stat } from 'fs/promises';
import { isMainThread, parentPort } from 'worker_threads';
import type { MessageEventBusLogWriterOptions } from './MessageEventBusLogWriter';

let logFileBasePath = '';
let loggingPaused = true;
let keepFiles = 10;
let fileStatTimer: NodeJS.Timer;
let maxLogFileSizeInKB = 102400;

function setLogFileBasePath(basePath: string) {
	logFileBasePath = basePath;
}

function setMaxLogFileSizeInKB(maxFileSizeInKB: number) {
	maxLogFileSizeInKB = maxFileSizeInKB;
}

function setKeepFiles(keepNumberOfFiles: number) {
	if (keepNumberOfFiles < 1) {
		keepNumberOfFiles = 1;
	}
	keepFiles = keepNumberOfFiles;
}

function buildLogFileNameWithCounter(counter?: number): string {
	if (counter) {
		return `${logFileBasePath}-${counter}.log`;
	} else {
		return `${logFileBasePath}.log`;
	}
}

function cleanAllLogs() {
	for (let i = 0; i <= keepFiles; i++) {
		if (existsSync(buildLogFileNameWithCounter(i))) {
			rmSync(buildLogFileNameWithCounter(i));
		}
	}
}

/**
 * Runs synchronously and cycles through log files up to the max amount kept
 */
function renameAndCreateLogs() {
	if (existsSync(buildLogFileNameWithCounter(keepFiles))) {
		rmSync(buildLogFileNameWithCounter(keepFiles));
	}
	for (let i = keepFiles - 1; i >= 0; i--) {
		if (existsSync(buildLogFileNameWithCounter(i))) {
			renameSync(buildLogFileNameWithCounter(i), buildLogFileNameWithCounter(i + 1));
		}
	}
	const f = openSync(buildLogFileNameWithCounter(), 'a');
	closeSync(f);
}

async function checkFileSize(path: string) {
	const fileStat = await stat(path);
	if (fileStat.size / 1024 > maxLogFileSizeInKB) {
		renameAndCreateLogs();
	}
}

function appendMessageSync(msg: any) {
	if (loggingPaused) {
		return;
	}
	appendFileSync(buildLogFileNameWithCounter(), JSON.stringify(msg) + '\n');
}

if (!isMainThread) {
	// -----------------------------------------
	// * This part runs in the Worker Thread ! *
	// -----------------------------------------
	parentPort?.on('message', async (msg: { command: string; data: any }) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { command, data } = msg;
		try {
			switch (command) {
				case 'appendMessageToLog':
				case 'confirmMessageSent':
					appendMessageSync(data);
					parentPort?.postMessage({ command, data: true });
					break;
				case 'pauseLogging':
					loggingPaused = true;
					clearInterval(fileStatTimer);
					break;
				case 'initialize':
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const settings: MessageEventBusLogWriterOptions = {
						logFullBasePath: (data as MessageEventBusLogWriterOptions).logFullBasePath ?? '',
						keepNumberOfFiles: (data as MessageEventBusLogWriterOptions).keepNumberOfFiles ?? 10,
						maxFileSizeInKB: (data as MessageEventBusLogWriterOptions).maxFileSizeInKB ?? 102400,
					};
					setLogFileBasePath(settings.logFullBasePath);
					setKeepFiles(settings.keepNumberOfFiles);
					setMaxLogFileSizeInKB(settings.maxFileSizeInKB);
					break;
				case 'startLogging':
					if (logFileBasePath) {
						renameAndCreateLogs();
						loggingPaused = false;
						fileStatTimer = setInterval(async () => {
							await checkFileSize(buildLogFileNameWithCounter());
						}, 5000);
					}
					break;
				case 'cleanLogs':
					cleanAllLogs();
					parentPort?.postMessage('cleanedAllLogs');
					break;
				default:
					break;
			}
		} catch (error) {
			parentPort?.postMessage(error);
		}
	});
}
