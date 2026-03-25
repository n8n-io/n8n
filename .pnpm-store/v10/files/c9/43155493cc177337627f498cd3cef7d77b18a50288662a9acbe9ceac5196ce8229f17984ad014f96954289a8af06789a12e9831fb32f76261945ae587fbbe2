'use strict';

const Registry = require('./registry');
const { isObject } = require('./util');
const { validateMetricName, validateLabelName } = require('./validation');

/**
 * @abstract
 */
class Metric {
	constructor(config, defaults = {}) {
		if (!isObject(config)) {
			throw new TypeError('constructor expected a config object');
		}
		Object.assign(
			this,
			{
				labelNames: [],
				registers: [Registry.globalRegistry],
				aggregator: 'sum',
				enableExemplars: false,
			},
			defaults,
			config,
		);
		if (!this.registers) {
			// in case config.registers is `undefined`
			this.registers = [Registry.globalRegistry];
		}
		if (!this.help) {
			throw new Error('Missing mandatory help parameter');
		}
		if (!this.name) {
			throw new Error('Missing mandatory name parameter');
		}
		if (!validateMetricName(this.name)) {
			throw new Error('Invalid metric name');
		}
		if (!validateLabelName(this.labelNames)) {
			throw new Error('Invalid label name');
		}

		if (this.collect && typeof this.collect !== 'function') {
			throw new Error('Optional "collect" parameter must be a function');
		}

		if (this.labelNames) {
			this.sortedLabelNames = [...this.labelNames].sort();
		} else {
			this.sortedLabelNames = [];
		}

		this.reset();

		for (const register of this.registers) {
			if (
				this.enableExemplars &&
				register.contentType === Registry.PROMETHEUS_CONTENT_TYPE
			) {
				throw new TypeError(
					'Exemplars are supported only on OpenMetrics registries',
				);
			}
			register.registerMetric(this);
		}
	}

	reset() {
		/* abstract */
	}
}

module.exports = { Metric };
