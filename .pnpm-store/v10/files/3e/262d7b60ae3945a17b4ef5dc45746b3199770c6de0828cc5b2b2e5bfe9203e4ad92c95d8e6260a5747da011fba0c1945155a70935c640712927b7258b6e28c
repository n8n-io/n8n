import {DiscardedError} from '../return/final-error.js';
import {isMaxBufferSync} from '../io/max-buffer.js';
import {isFailedExit} from './exit-async.js';

// Retrieve exit code, signal name and error information, with synchronous methods
export const getExitResultSync = ({error, status: exitCode, signal, output}, {maxBuffer}) => {
	const resultError = getResultError(error, exitCode, signal);
	const timedOut = resultError?.code === 'ETIMEDOUT';
	const isMaxBuffer = isMaxBufferSync(resultError, output, maxBuffer);
	return {
		resultError,
		exitCode,
		signal,
		timedOut,
		isMaxBuffer,
	};
};

const getResultError = (error, exitCode, signal) => {
	if (error !== undefined) {
		return error;
	}

	return isFailedExit(exitCode, signal) ? new DiscardedError() : undefined;
};
