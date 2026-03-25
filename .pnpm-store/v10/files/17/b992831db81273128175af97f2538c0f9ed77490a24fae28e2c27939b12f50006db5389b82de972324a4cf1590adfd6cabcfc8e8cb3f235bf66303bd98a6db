import {onAbortedSignal} from '../utils/abort-signal.js';
import {sendAbort} from '../ipc/graceful.js';
import {killOnTimeout} from './kill.js';

// Validate the `gracefulCancel` option
export const validateGracefulCancel = ({gracefulCancel, cancelSignal, ipc, serialization}) => {
	if (!gracefulCancel) {
		return;
	}

	if (cancelSignal === undefined) {
		throw new Error('The `cancelSignal` option must be defined when setting the `gracefulCancel` option.');
	}

	if (!ipc) {
		throw new Error('The `ipc` option cannot be false when setting the `gracefulCancel` option.');
	}

	if (serialization === 'json') {
		throw new Error('The `serialization` option cannot be \'json\' when setting the `gracefulCancel` option.');
	}
};

// Send abort reason to the subprocess when aborting the `cancelSignal` option and `gracefulCancel` is `true`
export const throwOnGracefulCancel = ({
	subprocess,
	cancelSignal,
	gracefulCancel,
	forceKillAfterDelay,
	context,
	controller,
}) => gracefulCancel
	? [sendOnAbort({
		subprocess,
		cancelSignal,
		forceKillAfterDelay,
		context,
		controller,
	})]
	: [];

const sendOnAbort = async ({subprocess, cancelSignal, forceKillAfterDelay, context, controller: {signal}}) => {
	await onAbortedSignal(cancelSignal, signal);
	const reason = getReason(cancelSignal);
	await sendAbort(subprocess, reason);
	killOnTimeout({
		kill: subprocess.kill,
		forceKillAfterDelay,
		context,
		controllerSignal: signal,
	});
	context.terminationReason ??= 'gracefulCancel';
	throw cancelSignal.reason;
};

// The default `reason` is a DOMException, which is not serializable with V8
// See https://github.com/nodejs/node/issues/53225
const getReason = ({reason}) => {
	if (!(reason instanceof DOMException)) {
		return reason;
	}

	const error = new Error(reason.message);
	Object.defineProperty(error, 'stack', {
		value: reason.stack,
		enumerable: false,
		configurable: true,
		writable: true,
	});
	return error;
};
