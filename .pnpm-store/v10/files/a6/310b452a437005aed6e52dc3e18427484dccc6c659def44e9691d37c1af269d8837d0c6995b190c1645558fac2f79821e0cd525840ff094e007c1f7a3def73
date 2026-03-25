import {finished} from 'node:stream/promises';
import {isStreamAbort} from '../resolve/wait-stream.js';

export const safeWaitForSubprocessStdin = async subprocessStdin => {
	if (subprocessStdin === undefined) {
		return;
	}

	try {
		await waitForSubprocessStdin(subprocessStdin);
	} catch {}
};

export const safeWaitForSubprocessStdout = async subprocessStdout => {
	if (subprocessStdout === undefined) {
		return;
	}

	try {
		await waitForSubprocessStdout(subprocessStdout);
	} catch {}
};

export const waitForSubprocessStdin = async subprocessStdin => {
	await finished(subprocessStdin, {cleanup: true, readable: false, writable: true});
};

export const waitForSubprocessStdout = async subprocessStdout => {
	await finished(subprocessStdout, {cleanup: true, readable: true, writable: false});
};

// When `readable` or `writable` aborts/errors, awaits the subprocess, for the reason mentioned above
export const waitForSubprocess = async (subprocess, error) => {
	await subprocess;
	if (error) {
		throw error;
	}
};

export const destroyOtherStream = (stream, isOpen, error) => {
	if (error && !isStreamAbort(error)) {
		stream.destroy(error);
	} else if (isOpen) {
		stream.destroy();
	}
};
