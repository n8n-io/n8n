'use strict';

const Gauge = require('../gauge');
const version = process.version;
const versionSegments = version.slice(1).split('.').map(Number);

const NODE_VERSION_INFO = 'nodejs_version_info';

module.exports = (registry, config = {}) => {
	const namePrefix = config.prefix ? config.prefix : '';
	const labels = config.labels ? config.labels : {};
	const labelNames = Object.keys(labels);

	new Gauge({
		name: namePrefix + NODE_VERSION_INFO,
		help: 'Node.js version info.',
		labelNames: ['version', 'major', 'minor', 'patch', ...labelNames],
		registers: registry ? [registry] : undefined,
		aggregator: 'first',
		collect() {
			// Needs to be in collect() so value is present even if reg is reset
			this.labels(
				version,
				versionSegments[0],
				versionSegments[1],
				versionSegments[2],
				...Object.values(labels),
			).set(1);
		},
	});
};

module.exports.metricNames = [NODE_VERSION_INFO];
