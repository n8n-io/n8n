'use strict';

const { Grouper, hashObject } = require('./util');

/**
 * Returns a new function that applies the `aggregatorFn` to the values.
 * @param {Function} aggregatorFn function to apply to values.
 * @return {Function} aggregator function
 */
function AggregatorFactory(aggregatorFn) {
	return metrics => {
		if (metrics.length === 0) return;
		const result = {
			help: metrics[0].help,
			name: metrics[0].name,
			type: metrics[0].type,
			values: [],
			aggregator: metrics[0].aggregator,
		};
		// Gather metrics by metricName and labels.
		const byLabels = new Grouper();
		metrics.forEach(metric => {
			metric.values.forEach(value => {
				const key = hashObject(value.labels);
				byLabels.add(`${value.metricName}_${key}`, value);
			});
		});
		// Apply aggregator function to gathered metrics.
		byLabels.forEach(values => {
			if (values.length === 0) return;
			const valObj = {
				value: aggregatorFn(values),
				labels: values[0].labels,
			};
			if (values[0].metricName) {
				valObj.metricName = values[0].metricName;
			}
			// NB: Timestamps are omitted.
			result.values.push(valObj);
		});
		return result;
	};
}
// Export for users to define their own aggregation methods.
exports.AggregatorFactory = AggregatorFactory;

/**
 * Functions that can be used to aggregate metrics from multiple registries.
 */
exports.aggregators = {
	/**
	 * @return The sum of values.
	 */
	sum: AggregatorFactory(v => v.reduce((p, c) => p + c.value, 0)),
	/**
	 * @return The first value.
	 */
	first: AggregatorFactory(v => v[0].value),
	/**
	 * @return {undefined} Undefined; omits the metric.
	 */
	omit: () => {},
	/**
	 * @return The arithmetic mean of the values.
	 */
	average: AggregatorFactory(
		v => v.reduce((p, c) => p + c.value, 0) / v.length,
	),
	/**
	 * @return The minimum of the values.
	 */
	min: AggregatorFactory(v =>
		v.reduce((p, c) => Math.min(p, c.value), Infinity),
	),
	/**
	 * @return The maximum of the values.
	 */
	max: AggregatorFactory(v =>
		v.reduce((p, c) => Math.max(p, c.value), -Infinity),
	),
};
