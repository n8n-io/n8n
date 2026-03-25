import {once} from 'node:events';

// Combines `util.aborted()` and `events.addAbortListener()`: promise-based and cleaned up with a stop signal
export const onAbortedSignal = async (mainSignal, stopSignal) => {
	if (!mainSignal.aborted) {
		await once(mainSignal, 'abort', {signal: stopSignal});
	}
};
