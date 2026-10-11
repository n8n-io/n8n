// Keep the probe outside the test fixtures so both providers run the same tests.
const { appendFileSync } = require('node:fs');
const { basename, join } = require('node:path');
const { getHeapStatistics } = require('node:v8');

const directory = process.env.MEMORY_PROBE_DIR;
if (directory) {
	const file = join(directory, `node-${process.pid}.jsonl`);
	const sample = () => {
		appendFileSync(
			file,
			`${JSON.stringify({
				time: new Date().toISOString(),
				pid: process.pid,
				ppid: process.ppid,
				script: basename(process.argv[1] ?? 'node'),
				worker: process.env.TEST_WORKER_INDEX,
				heapLimit: getHeapStatistics().heap_size_limit,
				...process.memoryUsage(),
			})}\n`,
		);
	};
	sample();
	setInterval(sample, 5000).unref();
	process.once('exit', sample);
}
