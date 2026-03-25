// Validate the IPC channel is connected before receiving/sending messages
export const validateIpcMethod = ({methodName, isSubprocess, ipc, isConnected}) => {
	validateIpcOption(methodName, isSubprocess, ipc);
	validateConnection(methodName, isSubprocess, isConnected);
};

// Better error message when forgetting to set `ipc: true` and using the IPC methods
const validateIpcOption = (methodName, isSubprocess, ipc) => {
	if (!ipc) {
		throw new Error(`${getMethodName(methodName, isSubprocess)} can only be used if the \`ipc\` option is \`true\`.`);
	}
};

// Better error message when one process does not send/receive messages once the other process has disconnected.
// This also makes it clear that any buffered messages are lost once either process has disconnected.
// Also when aborting `cancelSignal` after disconnecting the IPC.
export const validateConnection = (methodName, isSubprocess, isConnected) => {
	if (!isConnected) {
		throw new Error(`${getMethodName(methodName, isSubprocess)} cannot be used: the ${getOtherProcessName(isSubprocess)} has already exited or disconnected.`);
	}
};

// When `getOneMessage()` could not complete due to an early disconnection
export const throwOnEarlyDisconnect = isSubprocess => {
	throw new Error(`${getMethodName('getOneMessage', isSubprocess)} could not complete: the ${getOtherProcessName(isSubprocess)} exited or disconnected.`);
};

// When both processes use `sendMessage()` with `strict` at the same time
export const throwOnStrictDeadlockError = isSubprocess => {
	throw new Error(`${getMethodName('sendMessage', isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} is sending a message too, instead of listening to incoming messages.
This can be fixed by both sending a message and listening to incoming messages at the same time:

const [receivedMessage] = await Promise.all([
	${getMethodName('getOneMessage', isSubprocess)},
	${getMethodName('sendMessage', isSubprocess, 'message, {strict: true}')},
]);`);
};

// When the other process used `strict` but the current process had I/O error calling `sendMessage()` for the response
export const getStrictResponseError = (error, isSubprocess) => new Error(`${getMethodName('sendMessage', isSubprocess)} failed when sending an acknowledgment response to the ${getOtherProcessName(isSubprocess)}.`, {cause: error});

// When using `strict` but the other process was not listening for messages
export const throwOnMissingStrict = isSubprocess => {
	throw new Error(`${getMethodName('sendMessage', isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} is not listening to incoming messages.`);
};

// When using `strict` but the other process disconnected before receiving the message
export const throwOnStrictDisconnect = isSubprocess => {
	throw new Error(`${getMethodName('sendMessage', isSubprocess)} failed: the ${getOtherProcessName(isSubprocess)} exited without listening to incoming messages.`);
};

// When the current process disconnects while the subprocess is listening to `cancelSignal`
export const getAbortDisconnectError = () => new Error(`\`cancelSignal\` aborted: the ${getOtherProcessName(true)} disconnected.`);

// When the subprocess uses `cancelSignal` but not the current process
export const throwOnMissingParent = () => {
	throw new Error('`getCancelSignal()` cannot be used without setting the `cancelSignal` subprocess option.');
};

// EPIPE can happen when sending a message to a subprocess that is closing but has not disconnected yet
export const handleEpipeError = ({error, methodName, isSubprocess}) => {
	if (error.code === 'EPIPE') {
		throw new Error(`${getMethodName(methodName, isSubprocess)} cannot be used: the ${getOtherProcessName(isSubprocess)} is disconnecting.`, {cause: error});
	}
};

// Better error message when sending messages which cannot be serialized.
// Works with both `serialization: 'advanced'` and `serialization: 'json'`.
export const handleSerializationError = ({error, methodName, isSubprocess, message}) => {
	if (isSerializationError(error)) {
		throw new Error(`${getMethodName(methodName, isSubprocess)}'s argument type is invalid: the message cannot be serialized: ${String(message)}.`, {cause: error});
	}
};

const isSerializationError = ({code, message}) => SERIALIZATION_ERROR_CODES.has(code)
	|| SERIALIZATION_ERROR_MESSAGES.some(serializationErrorMessage => message.includes(serializationErrorMessage));

// `error.code` set by Node.js when it failed to serialize the message
const SERIALIZATION_ERROR_CODES = new Set([
	// Message is `undefined`
	'ERR_MISSING_ARGS',
	// Message is a function, a bigint, a symbol
	'ERR_INVALID_ARG_TYPE',
]);

// `error.message` set by Node.js when it failed to serialize the message
const SERIALIZATION_ERROR_MESSAGES = [
	// Message is a promise or a proxy, with `serialization: 'advanced'`
	'could not be cloned',
	// Message has cycles, with `serialization: 'json'`
	'circular structure',
	// Message has cycles inside toJSON(), with `serialization: 'json'`
	'call stack size exceeded',
];

const getMethodName = (methodName, isSubprocess, parameters = '') => methodName === 'cancelSignal'
	? '`cancelSignal`\'s `controller.abort()`'
	: `${getNamespaceName(isSubprocess)}${methodName}(${parameters})`;

const getNamespaceName = isSubprocess => isSubprocess ? '' : 'subprocess.';

const getOtherProcessName = isSubprocess => isSubprocess ? 'parent process' : 'subprocess';

// When any error arises, we disconnect the IPC.
// Otherwise, it is likely that one of the processes will stop sending/receiving messages.
// This would leave the other process hanging.
export const disconnect = anyProcess => {
	if (anyProcess.connected) {
		anyProcess.disconnect();
	}
};
