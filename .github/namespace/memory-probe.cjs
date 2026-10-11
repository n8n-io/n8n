// Keep the probe outside the test fixtures so both providers run the same tests.
const { appendFileSync } = require('node:fs');
const { basename, join } = require('node:path');
const { getHeapStatistics, writeHeapSnapshot } = require('node:v8');

const directory = process.env.MEMORY_PROBE_DIR;
const script = basename(process.argv[1] ?? 'node');
// Snapshots show which objects hold the off-heap buffers.
const snapshotThresholds = script === 'workerProcessEntry.js' ? [0.5, 2] : [];

if (directory) {
	const file = join(directory, `node-${process.pid}.jsonl`);
	let cpu = process.cpuUsage();
	let last = Date.now();
	const sample = () => {
		const memory = process.memoryUsage();
		const now = Date.now();
		const used = process.cpuUsage(cpu);
		cpu = process.cpuUsage();
		appendFileSync(
			file,
			`${JSON.stringify({
				time: new Date(now).toISOString(),
				pid: process.pid,
				ppid: process.ppid,
				script,
				heapLimit: getHeapStatistics().heap_size_limit,
				cpuPercent: Math.round(((used.user + used.system) / 1000 / Math.max(now - last, 1)) * 100),
				...memory,
			})}\n`,
		);
		last = now;
		const threshold = snapshotThresholds[0];
		if (threshold !== undefined && memory.arrayBuffers > threshold * 2 ** 30) {
			snapshotThresholds.shift();
			writeHeapSnapshot(join(directory, `worker-${process.pid}-${threshold}gib.heapsnapshot`));
		}
	};
	sample();
	setInterval(sample, 2000).unref();
	process.once('exit', sample);
}
