import {createDeferred} from '../utils/deferred.js';
import {getFdSpecificValue} from '../arguments/specific.js';
import {SUBPROCESS_OPTIONS} from '../arguments/fd-options.js';
import {validateStrictDeadlock} from './strict.js';

// When `sendMessage()` is ongoing, any `message` being received waits before being emitted.
// This allows calling one or multiple `await sendMessage()` followed by `await getOneMessage()`/`await getEachMessage()`.
// Without running into a race condition when the other process sends a response too fast, before the current process set up a listener.
export const startSendMessage = (anyProcess, wrappedMessage, strict) => {
	if (!OUTGOING_MESSAGES.has(anyProcess)) {
		OUTGOING_MESSAGES.set(anyProcess, new Set());
	}

	const outgoingMessages = OUTGOING_MESSAGES.get(anyProcess);
	const onMessageSent = createDeferred();
	const id = strict ? wrappedMessage.id : undefined;
	const outgoingMessage = {onMessageSent, id};
	outgoingMessages.add(outgoingMessage);
	return {outgoingMessages, outgoingMessage};
};

export const endSendMessage = ({outgoingMessages, outgoingMessage}) => {
	outgoingMessages.delete(outgoingMessage);
	outgoingMessage.onMessageSent.resolve();
};

// Await while `sendMessage()` is ongoing, unless there is already a `message` listener
export const waitForOutgoingMessages = async (anyProcess, ipcEmitter, wrappedMessage) => {
	while (!hasMessageListeners(anyProcess, ipcEmitter) && OUTGOING_MESSAGES.get(anyProcess)?.size > 0) {
		const outgoingMessages = [...OUTGOING_MESSAGES.get(anyProcess)];
		validateStrictDeadlock(outgoingMessages, wrappedMessage);
		// eslint-disable-next-line no-await-in-loop
		await Promise.all(outgoingMessages.map(({onMessageSent}) => onMessageSent));
	}
};

const OUTGOING_MESSAGES = new WeakMap();

// Whether any `message` listener is setup
export const hasMessageListeners = (anyProcess, ipcEmitter) => ipcEmitter.listenerCount('message') > getMinListenerCount(anyProcess);

// When `buffer` is `false`, we set up a `message` listener that should be ignored.
// That listener is only meant to intercept `strict` acknowledgement responses.
const getMinListenerCount = anyProcess => SUBPROCESS_OPTIONS.has(anyProcess)
	&& !getFdSpecificValue(SUBPROCESS_OPTIONS.get(anyProcess).options.buffer, 'ipc')
	? 1
	: 0;
