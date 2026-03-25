import {addAbortListener} from 'node:events';
import {onExit} from 'signal-exit';

// If the `cleanup` option is used, call `subprocess.kill()` when the parent process exits
export const cleanupOnExit = (subprocess, {cleanup, detached}, {signal}) => {
	if (!cleanup || detached) {
		return;
	}

	const removeExitHandler = onExit(() => {
		subprocess.kill();
	});
	addAbortListener(signal, () => {
		removeExitHandler();
	});
};
