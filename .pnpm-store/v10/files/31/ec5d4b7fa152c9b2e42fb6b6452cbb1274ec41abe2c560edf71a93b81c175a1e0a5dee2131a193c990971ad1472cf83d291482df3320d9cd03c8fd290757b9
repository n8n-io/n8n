import {scheduler} from 'node:timers/promises';
import {sendOneMessage} from './send.js';
import {getIpcEmitter} from './forward.js';
import {validateConnection, getAbortDisconnectError, throwOnMissingParent} from './validation.js';

// Send an IPC message so the subprocess performs a graceful termination
export const sendAbort = (subprocess, message) => {
	const methodName = 'cancelSignal';
	validateConnection(methodName, false, subprocess.connected);
	return sendOneMessage({
		anyProcess: subprocess,
		methodName,
		isSubprocess: false,
		wrappedMessage: {type: GRACEFUL_CANCEL_TYPE, message},
		message,
	});
};

// When the signal is being used, start listening for incoming messages.
// Unbuffering messages takes one microtask to complete, so this must be async.
export const getCancelSignal = async ({anyProcess, channel, isSubprocess, ipc}) => {
	await startIpc({
		anyProcess,
		channel,
		isSubprocess,
		ipc,
	});
	return cancelController.signal;
};

const startIpc = async ({anyProcess, channel, isSubprocess, ipc}) => {
	if (cancelListening) {
		return;
	}

	cancelListening = true;

	if (!ipc) {
		throwOnMissingParent();
		return;
	}

	if (channel === null) {
		abortOnDisconnect();
		return;
	}

	getIpcEmitter(anyProcess, channel, isSubprocess);
	await scheduler.yield();
};

let cancelListening = false;

// Reception of IPC message to perform a graceful termination
export const handleAbort = wrappedMessage => {
	if (wrappedMessage?.type !== GRACEFUL_CANCEL_TYPE) {
		return false;
	}

	cancelController.abort(wrappedMessage.message);
	return true;
};

const GRACEFUL_CANCEL_TYPE = 'execa:ipc:cancel';

// When the current process disconnects early, the subprocess `cancelSignal` is aborted.
// Otherwise, the signal would never be able to be aborted later on.
export const abortOnDisconnect = () => {
	cancelController.abort(getAbortDisconnectError());
};

const cancelController = new AbortController();
