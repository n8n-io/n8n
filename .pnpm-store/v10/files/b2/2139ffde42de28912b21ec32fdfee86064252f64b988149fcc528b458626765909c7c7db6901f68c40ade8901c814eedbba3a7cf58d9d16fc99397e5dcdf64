import {once} from 'node:events';
import {scheduler} from 'node:timers/promises';
import {waitForOutgoingMessages} from './outgoing.js';
import {redoAddedReferences} from './reference.js';
import {handleStrictRequest, handleStrictResponse} from './strict.js';
import {handleAbort, abortOnDisconnect} from './graceful.js';

// By default, Node.js buffers `message` events.
//  - Buffering happens when there is a `message` event is emitted but there is no handler.
//  - As soon as a `message` event handler is set, all buffered `message` events are emitted, emptying the buffer.
//  - This happens both in the current process and the subprocess.
//  - See https://github.com/nodejs/node/blob/501546e8f37059cd577041e23941b640d0d4d406/lib/internal/child_process.js#L719
// This is helpful. Notably, this allows sending messages to a subprocess that's still initializing.
// However, it has several problems.
//  - This works with `events.on()` but not `events.once()` since all buffered messages are emitted at once.
//    For example, users cannot call `await getOneMessage()`/`getEachMessage()` multiple times in a row.
//  - When a user intentionally starts listening to `message` at a specific point in time, past `message` events are replayed, which might be unexpected.
//  - Buffering is unlimited, which might lead to an out-of-memory crash.
//  - This does not work well with multiple consumers.
//    For example, Execa consumes events with both `result.ipcOutput` and manual IPC calls like `getOneMessage()`.
//    Since `result.ipcOutput` reads all incoming messages, no buffering happens for manual IPC calls.
//  - Forgetting to setup a `message` listener, or setting it up too late, is a programming mistake.
//    The default behavior does not allow users to realize they made that mistake.
// To solve those problems, instead of buffering messages, we debounce them.
// The `message` event so it is emitted at most once per macrotask.
export const onMessage = async ({anyProcess, channel, isSubprocess, ipcEmitter}, wrappedMessage) => {
	if (handleStrictResponse(wrappedMessage) || handleAbort(wrappedMessage)) {
		return;
	}

	if (!INCOMING_MESSAGES.has(anyProcess)) {
		INCOMING_MESSAGES.set(anyProcess, []);
	}

	const incomingMessages = INCOMING_MESSAGES.get(anyProcess);
	incomingMessages.push(wrappedMessage);

	if (incomingMessages.length > 1) {
		return;
	}

	while (incomingMessages.length > 0) {
		// eslint-disable-next-line no-await-in-loop
		await waitForOutgoingMessages(anyProcess, ipcEmitter, wrappedMessage);
		// eslint-disable-next-line no-await-in-loop
		await scheduler.yield();

		// eslint-disable-next-line no-await-in-loop
		const message = await handleStrictRequest({
			wrappedMessage: incomingMessages[0],
			anyProcess,
			channel,
			isSubprocess,
			ipcEmitter,
		});

		incomingMessages.shift();
		ipcEmitter.emit('message', message);
		ipcEmitter.emit('message:done');
	}
};

// If the `message` event is currently debounced, the `disconnect` event must wait for it
export const onDisconnect = async ({anyProcess, channel, isSubprocess, ipcEmitter, boundOnMessage}) => {
	abortOnDisconnect();

	const incomingMessages = INCOMING_MESSAGES.get(anyProcess);
	while (incomingMessages?.length > 0) {
		// eslint-disable-next-line no-await-in-loop
		await once(ipcEmitter, 'message:done');
	}

	anyProcess.removeListener('message', boundOnMessage);
	redoAddedReferences(channel, isSubprocess);
	ipcEmitter.connected = false;
	ipcEmitter.emit('disconnect');
};

const INCOMING_MESSAGES = new WeakMap();
