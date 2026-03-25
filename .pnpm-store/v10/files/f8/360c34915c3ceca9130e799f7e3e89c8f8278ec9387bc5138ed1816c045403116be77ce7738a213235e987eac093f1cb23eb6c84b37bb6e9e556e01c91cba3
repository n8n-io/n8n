'use strict';

const Gauge = require('../gauge');
const v8 = require('v8');

const METRICS = ['total', 'used', 'available'];
const NODEJS_HEAP_SIZE = {};

METRICS.forEach(metricType => {
	NODEJS_HEAP_SIZE[metricType] = `nodejs_heap_space_size_${metricType}_bytes`;
});

module.exports = (registry, config = {}) => {
	try {
		v8.getHeapSpaceStatistics();
	} catch (e) {
		if (e.code === 'ERR_NOT_IMPLEMENTED') {
			return; // Bun
		}
		throw e;
	}
	const registers = registry ? [registry] : undefined;
	const namePrefix = config.prefix ? config.prefix : '';

	const labels = config.labels ? config.labels : {};
	const labelNames = ['space', ...Object.keys(labels)];

	const gauges = {};

	METRICS.forEach(metricType => {
		gauges[metricType] = new Gauge({
			name: namePrefix + NODEJS_HEAP_SIZE[metricType],
			help: `Process heap space size ${metricType} from Node.js in bytes.`,
			labelNames,
			registers,
		});
	});

	// Use this one metric's `collect` to set all metrics' values.
	gauges.total.collect = () => {
		for (const space of v8.getHeapSpaceStatistics()) {
			const spaceName = space.space_name.substr(
				0,
				space.space_name.indexOf('_space'),
			);

			gauges.total.set({ space: spaceName, ...labels }, space.space_size);
			gauges.used.set({ space: spaceName, ...labels }, space.space_used_size);
			gauges.available.set(
				{ space: spaceName, ...labels },
				space.space_available_size,
			);
		}
	};
};

module.exports.metricNames = Object.values(NODEJS_HEAP_SIZE);
