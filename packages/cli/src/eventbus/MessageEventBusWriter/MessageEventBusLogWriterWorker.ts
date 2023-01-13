/* eslint-disable @typescript-eslint/no-explicit-any */
import { appendFileSync, existsSync, rmSync, renameSync, openSync, closeSync } from 'fs';
import { appendFile, stat } from 'fs/promises';
import { expose, isWorkerRuntime } from 'threads/worker';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

// all references to and imports from classes have been remove to keep memory usage low

let logFileBasePath = '';
let loggingPaused = true;
let syncFileAccess = false;
let keepFiles = 10;
let fileStatTimer: NodeJS.Timer;
let maxLogFileSizeInKB = 102400;

function setLogFileBasePath(basePath: string) {
	logFileBasePath = basePath;
}

function setUseSyncFileAccess(useSync: boolean) {
	syncFileAccess = useSync;
}

function setMaxLogFileSizeInKB(maxSizeInKB: number) {
	maxLogFileSizeInKB = maxSizeInKB;
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

async function appendMessage(msg: any) {
	if (loggingPaused) {
		return;
	}
	await appendFile(buildLogFileNameWithCounter(), JSON.stringify(msg) + '\n');
}

const messageEventBusLogWriterWorker = {
	async appendMessageToLog(msg: any) {
		if (syncFileAccess) {
			appendMessageSync(msg);
		} else {
			await appendMessage(msg);
		}
	},
	async confirmMessageSent(confirm: unknown) {
		if (syncFileAccess) {
			appendMessageSync(confirm);
		} else {
			await appendMessage(confirm);
		}
	},
	pauseLogging() {
		loggingPaused = true;
		clearInterval(fileStatTimer);
	},
	initialize(
		basePath: string,
		useSyncFileAccess = false,
		keepNumberOfFiles = 10,
		maxSizeInKB = 102400,
	) {
		setLogFileBasePath(basePath);
		setUseSyncFileAccess(useSyncFileAccess);
		setKeepFiles(keepNumberOfFiles);
		setMaxLogFileSizeInKB(maxSizeInKB);
	},
	startLogging() {
		if (logFileBasePath) {
			renameAndCreateLogs();
			loggingPaused = false;
			fileStatTimer = setInterval(async () => {
				await checkFileSize(buildLogFileNameWithCounter());
			}, 5000);
		}
	},
	getLogFileName(counter?: number) {
		if (logFileBasePath) {
			return buildLogFileNameWithCounter(counter);
		} else {
			return undefined;
		}
	},
	cleanLogs() {
		cleanAllLogs();
	},
};
if (isWorkerRuntime()) {
	// Register the serializer on the worker thread
	expose(messageEventBusLogWriterWorker);
}
export type MessageEventBusLogWriterWorker = typeof messageEventBusLogWriterWorker;
