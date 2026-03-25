import {onAbortedSignal} from '../utils/abort-signal.js';

// Validate the `cancelSignal` option
export const validateCancelSignal = ({cancelSignal}) => {
	if (cancelSignal !== undefined && Object.prototype.toString.call(cancelSignal) !== '[object AbortSignal]') {
		throw new Error(`The \`cancelSignal\` option must be an AbortSignal: ${String(cancelSignal)}`);
	}
};

// Terminate the subprocess when aborting the `cancelSignal` option and `gracefulSignal` is `false`
export const throwOnCancel = ({subprocess, cancelSignal, gracefulCancel, context, controller}) => cancelSignal === undefined || gracefulCancel
	? []
	: [terminateOnCancel(subprocess, cancelSignal, context, controller)];

const terminateOnCancel = async (subprocess, cancelSignal, context, {signal}) => {
	await onAbortedSignal(cancelSignal, signal);
	context.terminationReason ??= 'cancel';
	subprocess.kill();
	throw cancelSignal.reason;
};
