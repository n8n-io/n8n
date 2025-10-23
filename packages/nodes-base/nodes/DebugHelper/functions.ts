import { setImmediate } from 'timers/promises';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { isMainThread } from 'worker_threads';

export const runGarbageCollector = () => {
	try {
		setFlagsFromString('--expose_gc');
		const gc = runInNewContext('gc'); // nocommit
		gc();
	} catch (error) {
		console.error(error);
	}
};

export const generateGarbageMemory = async (sizeInMB: number, onHeap = true) => {
	if (!isMainThread) {
		console.log('RUNNING INSIDE THE WORKER');
	} else {
		console.log('RUNNING INSIDE THE MAIN THREAD');
	}
	const divider = onHeap ? 8 : 1;
	const size = Math.max(1, Math.floor((sizeInMB * 1024 * 1024) / divider));
	if (onHeap) {
		// NOTE: works
		// type Foo = Foo[];
		// const array: Foo = new Array<Foo>(size);
		// for (let i = 0; i < size; i++) {
		// 	array.push([array]);
		// }

		// NOTE: does not
		// arrays are allocated on the heap
		// size in this case is only an approximation...
		// const array = Array(size);
		// array.fill(0);

		// NOTE: does not
		const array = []; // Array(size);
		for (let i = 0; i < size; i++) {
			array[i] = 0;
			if (i % 10000 === 0) {
				await setImmediate();
			}
		}
	} else {
		const array = new Uint8Array(size);
		array.fill(0);
	}
	return { ...process.memoryUsage() };
};
