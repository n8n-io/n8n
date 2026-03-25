'use strict';

const Gauge = require('../gauge');
const safeMemoryUsage = require('./helpers/safeMemoryUsage');

const NODEJS_HEAP_SIZE_TOTAL = 'nodejs_heap_size_total_bytes';
const NODEJS_HEAP_SIZE_USED = 'nodejs_heap_size_used_bytes';
const NODEJS_EXTERNAL_MEMORY = 'nodejs_external_memory_bytes';

module.exports = (registry, config = {}) => {
	if (typeof process.memoryUsage !== 'function') {
		return;
	}
	const labels = config.labels ? config.labels : {};
	const labelNames = Object.keys(labels);

	const registers = registry ? [registry] : undefined;
	const namePrefix = config.prefix ? config.prefix : '';
	const collect = () => {
		const memUsage = safeMemoryUsage();
		if (memUsage) {
			heapSizeTotal.set(labels, memUsage.heapTotal);
			heapSizeUsed.set(labels, memUsage.heapUsed);
			if (memUsage.external !== undefined) {
				externalMemUsed.set(labels, memUsage.external);
			}
		}
	};

	const heapSizeTotal = new Gauge({
		name: namePrefix + NODEJS_HEAP_SIZE_TOTAL,
		help: 'Process heap size from Node.js in bytes.',
		registers,
		labelNames,
		// Use this one metric's `collect` to set all metrics' values.
		collect,
	});
	const heapSizeUsed = new Gauge({
		name: namePrefix + NODEJS_HEAP_SIZE_USED,
		help: 'Process heap size used from Node.js in bytes.',
		registers,
		labelNames,
	});
	const externalMemUsed = new Gauge({
		name: namePrefix + NODEJS_EXTERNAL_MEMORY,
		help: 'Node.js external memory size in bytes.',
		registers,
		labelNames,
	});
};

module.exports.metricNames = [
	NODEJS_HEAP_SIZE_TOTAL,
	NODEJS_HEAP_SIZE_USED,
	NODEJS_EXTERNAL_MEMORY,
];
