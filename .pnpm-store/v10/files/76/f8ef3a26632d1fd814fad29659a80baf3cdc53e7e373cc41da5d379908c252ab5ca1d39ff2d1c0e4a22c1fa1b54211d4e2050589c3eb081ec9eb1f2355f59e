'use strict';
const Gauge = require('../gauge');
const { updateMetrics } = require('./helpers/processMetricsHelpers');

const NODEJS_ACTIVE_RESOURCES = 'nodejs_active_resources';
const NODEJS_ACTIVE_RESOURCES_TOTAL = 'nodejs_active_resources_total';

module.exports = (registry, config = {}) => {
	// Don't do anything if the function does not exist in previous nodes (exists in node@17.3.0)
	if (typeof process.getActiveResourcesInfo !== 'function') {
		return;
	}

	const namePrefix = config.prefix ? config.prefix : '';
	const labels = config.labels ? config.labels : {};
	const labelNames = Object.keys(labels);

	new Gauge({
		name: namePrefix + NODEJS_ACTIVE_RESOURCES,
		help: 'Number of active resources that are currently keeping the event loop alive, grouped by async resource type.',
		labelNames: ['type', ...labelNames],
		registers: registry ? [registry] : undefined,
		collect() {
			const resources = process.getActiveResourcesInfo();

			const data = {};

			for (let i = 0; i < resources.length; i++) {
				const resource = resources[i];

				if (Object.hasOwn(data, resource)) {
					data[resource] += 1;
				} else {
					data[resource] = 1;
				}
			}

			updateMetrics(this, data, labels);
		},
	});

	new Gauge({
		name: namePrefix + NODEJS_ACTIVE_RESOURCES_TOTAL,
		help: 'Total number of active resources.',
		registers: registry ? [registry] : undefined,
		labelNames,
		collect() {
			const resources = process.getActiveResourcesInfo();
			this.set(labels, resources.length);
		},
	});
};

module.exports.metricNames = [
	NODEJS_ACTIVE_RESOURCES,
	NODEJS_ACTIVE_RESOURCES_TOTAL,
];
