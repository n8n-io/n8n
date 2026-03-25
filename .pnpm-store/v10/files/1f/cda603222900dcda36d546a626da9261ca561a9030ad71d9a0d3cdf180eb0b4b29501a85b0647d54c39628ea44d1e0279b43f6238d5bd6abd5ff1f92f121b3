import {setTimeout} from 'node:timers/promises';
import {isErrorInstance} from '../return/final-error.js';
import {normalizeSignalArgument} from './signal.js';

// Normalize the `forceKillAfterDelay` option
export const normalizeForceKillAfterDelay = forceKillAfterDelay => {
	if (forceKillAfterDelay === false) {
		return forceKillAfterDelay;
	}

	if (forceKillAfterDelay === true) {
		return DEFAULT_FORCE_KILL_TIMEOUT;
	}

	if (!Number.isFinite(forceKillAfterDelay) || forceKillAfterDelay < 0) {
		throw new TypeError(`Expected the \`forceKillAfterDelay\` option to be a non-negative integer, got \`${forceKillAfterDelay}\` (${typeof forceKillAfterDelay})`);
	}

	return forceKillAfterDelay;
};

const DEFAULT_FORCE_KILL_TIMEOUT = 1000 * 5;

// Monkey-patches `subprocess.kill()` to add `forceKillAfterDelay` behavior and `.kill(error)`
export const subprocessKill = (
	{kill, options: {forceKillAfterDelay, killSignal}, onInternalError, context, controller},
	signalOrError,
	errorArgument,
) => {
	const {signal, error} = parseKillArguments(signalOrError, errorArgument, killSignal);
	emitKillError(error, onInternalError);
	const killResult = kill(signal);
	setKillTimeout({
		kill,
		signal,
		forceKillAfterDelay,
		killSignal,
		killResult,
		context,
		controller,
	});
	return killResult;
};

const parseKillArguments = (signalOrError, errorArgument, killSignal) => {
	const [signal = killSignal, error] = isErrorInstance(signalOrError)
		? [undefined, signalOrError]
		: [signalOrError, errorArgument];

	if (typeof signal !== 'string' && !Number.isInteger(signal)) {
		throw new TypeError(`The first argument must be an error instance or a signal name string/integer: ${String(signal)}`);
	}

	if (error !== undefined && !isErrorInstance(error)) {
		throw new TypeError(`The second argument is optional. If specified, it must be an error instance: ${error}`);
	}

	return {signal: normalizeSignalArgument(signal), error};
};

// Fails right away when calling `subprocess.kill(error)`.
// Does not wait for actual signal termination.
// Uses a deferred promise instead of the `error` event on the subprocess, as this is less intrusive.
const emitKillError = (error, onInternalError) => {
	if (error !== undefined) {
		onInternalError.reject(error);
	}
};

const setKillTimeout = async ({kill, signal, forceKillAfterDelay, killSignal, killResult, context, controller}) => {
	if (signal === killSignal && killResult) {
		killOnTimeout({
			kill,
			forceKillAfterDelay,
			context,
			controllerSignal: controller.signal,
		});
	}
};

// Forcefully terminate a subprocess after a timeout
export const killOnTimeout = async ({kill, forceKillAfterDelay, context, controllerSignal}) => {
	if (forceKillAfterDelay === false) {
		return;
	}

	try {
		await setTimeout(forceKillAfterDelay, undefined, {signal: controllerSignal});
		if (kill('SIGKILL')) {
			context.isForcefullyTerminated ??= true;
		}
	} catch {}
};
