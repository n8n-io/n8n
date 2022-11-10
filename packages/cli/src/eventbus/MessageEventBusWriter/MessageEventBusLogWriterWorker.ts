import { appendFileSync, existsSync, rmSync, renameSync, openSync, closeSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { expose, isWorkerRuntime, registerSerializer } from 'threads/worker';
import { EventMessage, messageEventSerializer } from '../EventMessageClasses/EventMessage';
import {
	EventMessageConfirm,
	eventMessageConfirmSerializer,
} from '../EventMessageClasses/EventMessageConfirm';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

let logFileBasePath = '';
let loggingPaused = true;
let syncFileAccess = false;
let keepFiles = 10;

function setLogFileBasePath(basePath: string) {
	logFileBasePath = basePath;
}

function setUseSyncFileAccess(useSync: boolean) {
	syncFileAccess = useSync;
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

function appendMessageSync(msg: EventMessage | EventMessageConfirm) {
	if (loggingPaused) {
		return;
	}
	appendFileSync(buildLogFileNameWithCounter(), JSON.stringify(msg) + '\n');
}

async function appendMessage(msg: EventMessage | EventMessageConfirm) {
	if (loggingPaused) {
		return;
	}
	await appendFile(buildLogFileNameWithCounter(), JSON.stringify(msg) + '\n');
}

const messageEventBusLogWriterWorker = {
	async appendMessageToLog(msg: EventMessage) {
		if (syncFileAccess) {
			appendMessageSync(msg);
		} else {
			await appendMessage(msg);
		}
	},
	async confirmMessageSent(confirm: EventMessageConfirm) {
		if (syncFileAccess) {
			appendMessageSync(confirm);
		} else {
			await appendMessage(confirm);
		}
	},
	pauseLogging() {
		loggingPaused = true;
	},
	initialize(basePath: string, useSyncFileAccess = false, keepNumberOfFiles = 10) {
		setLogFileBasePath(basePath);
		setUseSyncFileAccess(useSyncFileAccess);
		setKeepFiles(keepNumberOfFiles);
	},
	startLogging() {
		if (logFileBasePath) {
			renameAndCreateLogs();
			loggingPaused = false;
		}
	},
	getLogFileName() {
		if (logFileBasePath) {
			return buildLogFileNameWithCounter();
		} else {
			return undefined;
		}
	},
};
if (isWorkerRuntime()) {
	// Register the serializer on the worker thread
	registerSerializer(messageEventSerializer);
	registerSerializer(eventMessageConfirmSerializer);
	expose(messageEventBusLogWriterWorker);
}
export type MessageEventBusLogWriterWorker = typeof messageEventBusLogWriterWorker;
