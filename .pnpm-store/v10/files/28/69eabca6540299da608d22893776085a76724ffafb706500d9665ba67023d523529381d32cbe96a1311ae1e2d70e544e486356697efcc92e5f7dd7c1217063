import { g as getWorkerState } from './utils.CgTj3MsC.js';

const filesCount = new Map();
const cache = new Map();
/**
* This utils allows computational intensive tasks to only be ran once
* across test reruns to improve the watch mode performance.
*
* Currently only works with `poolOptions.<pool>.isolate: false`
*
* @experimental
*/
function runOnce(fn, key) {
	const filepath = getWorkerState().filepath || "__unknown_files__";
	if (!key) {
		filesCount.set(filepath, (filesCount.get(filepath) || 0) + 1);
		key = String(filesCount.get(filepath));
	}
	const id = `${filepath}:${key}`;
	if (!cache.has(id)) {
		cache.set(id, fn());
	}
	return cache.get(id);
}
/**
* Get a boolean indicates whether the task is running in the first time.
* Could only be `false` in watch mode.
*
* Currently only works with `isolate: false`
*
* @experimental
*/
function isFirstRun() {
	let firstRun = false;
	runOnce(() => {
		firstRun = true;
	}, "__vitest_first_run__");
	return firstRun;
}
/**
* @internal
*/
function resetRunOnceCounter() {
	filesCount.clear();
}

export { runOnce as a, isFirstRun as i, resetRunOnceCounter as r };
