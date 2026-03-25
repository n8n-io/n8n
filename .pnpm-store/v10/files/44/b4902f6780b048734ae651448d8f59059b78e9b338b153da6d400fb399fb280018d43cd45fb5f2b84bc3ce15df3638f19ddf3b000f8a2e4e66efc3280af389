'use strict';

const Gauge = require('../gauge');
const fs = require('fs');

const values = ['VmSize', 'VmRSS', 'VmData'];

const PROCESS_RESIDENT_MEMORY = 'process_resident_memory_bytes';
const PROCESS_VIRTUAL_MEMORY = 'process_virtual_memory_bytes';
const PROCESS_HEAP = 'process_heap_bytes';

function structureOutput(input) {
	return input.split('\n').reduce((acc, string) => {
		if (!values.some(value => string.startsWith(value))) {
			return acc;
		}

		const split = string.split(':');

		// Get the value
		let value = split[1].trim();
		// Remove trailing ` kb`
		value = value.substr(0, value.length - 3);
		// Make it into a number in bytes bytes
		value = Number(value) * 1024;

		acc[split[0]] = value;

		return acc;
	}, {});
}

module.exports = (registry, config = {}) => {
	const registers = registry ? [registry] : undefined;
	const namePrefix = config.prefix ? config.prefix : '';
	const labels = config.labels ? config.labels : {};
	const labelNames = Object.keys(labels);

	const residentMemGauge = new Gauge({
		name: namePrefix + PROCESS_RESIDENT_MEMORY,
		help: 'Resident memory size in bytes.',
		registers,
		labelNames,
		// Use this one metric's `collect` to set all metrics' values.
		collect() {
			try {
				// Sync I/O is often problematic, but /proc isn't really I/O, it
				// a virtual filesystem that maps directly to in-kernel data
				// structures and never blocks.
				//
				// Node.js/libuv do this already for process.memoryUsage(), see:
				// - https://github.com/libuv/libuv/blob/a629688008694ed8022269e66826d4d6ec688b83/src/unix/linux-core.c#L506-L523
				const stat = fs.readFileSync('/proc/self/status', 'utf8');
				const structuredOutput = structureOutput(stat);

				residentMemGauge.set(labels, structuredOutput.VmRSS);
				virtualMemGauge.set(labels, structuredOutput.VmSize);
				heapSizeMemGauge.set(labels, structuredOutput.VmData);
			} catch {
				// noop
			}
		},
	});
	const virtualMemGauge = new Gauge({
		name: namePrefix + PROCESS_VIRTUAL_MEMORY,
		help: 'Virtual memory size in bytes.',
		registers,
		labelNames,
	});
	const heapSizeMemGauge = new Gauge({
		name: namePrefix + PROCESS_HEAP,
		help: 'Process heap size in bytes.',
		registers,
		labelNames,
	});
};

module.exports.metricNames = [
	PROCESS_RESIDENT_MEMORY,
	PROCESS_VIRTUAL_MEMORY,
	PROCESS_HEAP,
];
