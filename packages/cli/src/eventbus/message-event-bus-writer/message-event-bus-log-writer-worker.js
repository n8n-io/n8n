'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const promises_1 = require('fs/promises');
const worker_threads_1 = require('worker_threads');
let logFileBasePath = '';
let loggingPaused = true;
let keepFiles = 10;
let maxLogFileSizeInKB = 102400;
function setLogFileBasePath(basePath) {
	logFileBasePath = basePath;
}
function setMaxLogFileSizeInKB(maxFileSizeInKB) {
	maxLogFileSizeInKB = maxFileSizeInKB;
}
function setKeepFiles(keepNumberOfFiles) {
	if (keepNumberOfFiles < 1) {
		keepNumberOfFiles = 1;
	}
	keepFiles = keepNumberOfFiles;
}
function buildRecoveryInProgressFileName() {
	return `${logFileBasePath}.recoveryInProgress`;
}
function startRecoveryProcess() {
	if ((0, fs_1.existsSync)(buildRecoveryInProgressFileName())) {
		return false;
	}
	const fileHandle = (0, fs_1.openSync)(buildRecoveryInProgressFileName(), 'a');
	(0, fs_1.closeSync)(fileHandle);
	return true;
}
function endRecoveryProcess() {
	if ((0, fs_1.existsSync)(buildRecoveryInProgressFileName())) {
		(0, fs_1.rmSync)(buildRecoveryInProgressFileName());
	}
}
function buildLogFileNameWithCounter(counter) {
	if (counter) {
		return `${logFileBasePath}-${counter}.log`;
	} else {
		return `${logFileBasePath}.log`;
	}
}
function cleanAllLogs() {
	for (let i = 0; i <= keepFiles; i++) {
		if ((0, fs_1.existsSync)(buildLogFileNameWithCounter(i))) {
			(0, fs_1.rmSync)(buildLogFileNameWithCounter(i));
		}
	}
}
function renameAndCreateLogs() {
	if ((0, fs_1.existsSync)(buildLogFileNameWithCounter(keepFiles))) {
		(0, fs_1.rmSync)(buildLogFileNameWithCounter(keepFiles));
	}
	for (let i = keepFiles - 1; i >= 0; i--) {
		if ((0, fs_1.existsSync)(buildLogFileNameWithCounter(i))) {
			(0, fs_1.renameSync)(buildLogFileNameWithCounter(i), buildLogFileNameWithCounter(i + 1));
		}
	}
	const f = (0, fs_1.openSync)(buildLogFileNameWithCounter(), 'a');
	(0, fs_1.closeSync)(f);
}
async function checkFileSize(path) {
	const fileStat = await (0, promises_1.stat)(path);
	if (fileStat.size / 1024 > maxLogFileSizeInKB) {
		renameAndCreateLogs();
	}
}
function appendMessageSync(msg) {
	if (loggingPaused) {
		return;
	}
	(0, fs_1.appendFileSync)(buildLogFileNameWithCounter(), JSON.stringify(msg) + '\n');
}
if (!worker_threads_1.isMainThread) {
	worker_threads_1.parentPort?.on('message', async (msg) => {
		const { command, data } = msg;
		try {
			switch (command) {
				case 'appendMessageToLog':
				case 'confirmMessageSent':
					appendMessageSync(data);
					worker_threads_1.parentPort?.postMessage({ command, data: true });
					break;
				case 'initialize':
					const settings = {
						logFullBasePath: data.logFullBasePath ?? '',
						keepNumberOfFiles: data.keepNumberOfFiles ?? 10,
						maxFileSizeInKB: data.maxFileSizeInKB ?? 102400,
					};
					setLogFileBasePath(settings.logFullBasePath);
					setKeepFiles(settings.keepNumberOfFiles);
					setMaxLogFileSizeInKB(settings.maxFileSizeInKB);
					break;
				case 'startLogging':
					if (logFileBasePath) {
						renameAndCreateLogs();
						loggingPaused = false;
						setInterval(async () => {
							await checkFileSize(buildLogFileNameWithCounter());
						}, 5000);
					}
					break;
				case 'cleanLogs':
					cleanAllLogs();
					worker_threads_1.parentPort?.postMessage('cleanedAllLogs');
					break;
				case 'startRecoveryProcess':
					const recoveryStarted = startRecoveryProcess();
					worker_threads_1.parentPort?.postMessage({ command, data: recoveryStarted });
					break;
				case 'endRecoveryProcess':
					endRecoveryProcess();
					worker_threads_1.parentPort?.postMessage({ command, data: true });
					break;
				default:
					break;
			}
		} catch (error) {
			worker_threads_1.parentPort?.postMessage(error);
		}
	});
}
//# sourceMappingURL=message-event-bus-log-writer-worker.js.map
