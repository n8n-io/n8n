import {inspect} from 'node:util';
import stripFinalNewline from 'strip-final-newline';
import {isUint8Array, uint8ArrayToString} from '../utils/uint-array.js';
import {fixCwdError} from '../arguments/cwd.js';
import {escapeLines} from '../arguments/escape.js';
import {getMaxBufferMessage} from '../io/max-buffer.js';
import {getSignalDescription} from '../terminate/signal.js';
import {DiscardedError, isExecaError} from './final-error.js';

// Computes `error.message`, `error.shortMessage` and `error.originalMessage`
export const createMessages = ({
	stdio,
	all,
	ipcOutput,
	originalError,
	signal,
	signalDescription,
	exitCode,
	escapedCommand,
	timedOut,
	isCanceled,
	isGracefullyCanceled,
	isMaxBuffer,
	isForcefullyTerminated,
	forceKillAfterDelay,
	killSignal,
	maxBuffer,
	timeout,
	cwd,
}) => {
	const errorCode = originalError?.code;
	const prefix = getErrorPrefix({
		originalError,
		timedOut,
		timeout,
		isMaxBuffer,
		maxBuffer,
		errorCode,
		signal,
		signalDescription,
		exitCode,
		isCanceled,
		isGracefullyCanceled,
		isForcefullyTerminated,
		forceKillAfterDelay,
		killSignal,
	});
	const originalMessage = getOriginalMessage(originalError, cwd);
	const suffix = originalMessage === undefined ? '' : `\n${originalMessage}`;
	const shortMessage = `${prefix}: ${escapedCommand}${suffix}`;
	const messageStdio = all === undefined ? [stdio[2], stdio[1]] : [all];
	const message = [
		shortMessage,
		...messageStdio,
		...stdio.slice(3),
		ipcOutput.map(ipcMessage => serializeIpcMessage(ipcMessage)).join('\n'),
	]
		.map(messagePart => escapeLines(stripFinalNewline(serializeMessagePart(messagePart))))
		.filter(Boolean)
		.join('\n\n');
	return {originalMessage, shortMessage, message};
};

const getErrorPrefix = ({
	originalError,
	timedOut,
	timeout,
	isMaxBuffer,
	maxBuffer,
	errorCode,
	signal,
	signalDescription,
	exitCode,
	isCanceled,
	isGracefullyCanceled,
	isForcefullyTerminated,
	forceKillAfterDelay,
	killSignal,
}) => {
	const forcefulSuffix = getForcefulSuffix(isForcefullyTerminated, forceKillAfterDelay);

	if (timedOut) {
		return `Command timed out after ${timeout} milliseconds${forcefulSuffix}`;
	}

	if (isGracefullyCanceled) {
		if (signal === undefined) {
			return `Command was gracefully canceled with exit code ${exitCode}`;
		}

		return isForcefullyTerminated
			? `Command was gracefully canceled${forcefulSuffix}`
			: `Command was gracefully canceled with ${signal} (${signalDescription})`;
	}

	if (isCanceled) {
		return `Command was canceled${forcefulSuffix}`;
	}

	if (isMaxBuffer) {
		return `${getMaxBufferMessage(originalError, maxBuffer)}${forcefulSuffix}`;
	}

	if (errorCode !== undefined) {
		return `Command failed with ${errorCode}${forcefulSuffix}`;
	}

	if (isForcefullyTerminated) {
		return `Command was killed with ${killSignal} (${getSignalDescription(killSignal)})${forcefulSuffix}`;
	}

	if (signal !== undefined) {
		return `Command was killed with ${signal} (${signalDescription})`;
	}

	if (exitCode !== undefined) {
		return `Command failed with exit code ${exitCode}`;
	}

	return 'Command failed';
};

const getForcefulSuffix = (isForcefullyTerminated, forceKillAfterDelay) => isForcefullyTerminated
	? ` and was forcefully terminated after ${forceKillAfterDelay} milliseconds`
	: '';

const getOriginalMessage = (originalError, cwd) => {
	if (originalError instanceof DiscardedError) {
		return;
	}

	const originalMessage = isExecaError(originalError)
		? originalError.originalMessage
		: String(originalError?.message ?? originalError);
	const escapedOriginalMessage = escapeLines(fixCwdError(originalMessage, cwd));
	return escapedOriginalMessage === '' ? undefined : escapedOriginalMessage;
};

const serializeIpcMessage = ipcMessage => typeof ipcMessage === 'string'
	? ipcMessage
	: inspect(ipcMessage);

const serializeMessagePart = messagePart => Array.isArray(messagePart)
	? messagePart.map(messageItem => stripFinalNewline(serializeMessageItem(messageItem))).filter(Boolean).join('\n')
	: serializeMessageItem(messagePart);

const serializeMessageItem = messageItem => {
	if (typeof messageItem === 'string') {
		return messageItem;
	}

	if (isUint8Array(messageItem)) {
		return uint8ArrayToString(messageItem);
	}

	return '';
};
