import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';

export const runGarbageCollector = () => {
	try {
		setFlagsFromString('--expose_gc');
		const gc = runInNewContext('gc'); // nocommit
		gc();
	} catch (error) {
		console.log(error);
	}
};

export const generateGarbageMemory = (sizeInMB: number, onHeap = true) => {
	const divider = onHeap ? 8 : 1;
	const size = Math.max(1, Math.floor((sizeInMB * 1024 * 1024) / divider));
	if (onHeap) {
		// arrays are allocated on the heap
		// size in this case is only an approximation...
		const array = Array(size);
		array.fill(0);
	} else {
		const array = new Uint8Array(size);
		array.fill(0);
	}
	// const used = process.memoryUsage().heapUsed / 1024 / 1024;
	// const external = process.memoryUsage().external / 1024 / 1024;
	// console.log(`heap: ${used} MB / external: ${external} MB`);
	return { ...process.memoryUsage() };
};
