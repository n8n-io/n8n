/**
 * Summary
 */
'use strict';

const util = require('util');
const { getLabels, hashObject, removeLabels } = require('./util');
const { validateLabel } = require('./validation');
const { Metric } = require('./metric');
const timeWindowQuantiles = require('./timeWindowQuantiles');

const DEFAULT_COMPRESS_COUNT = 1000; // every 1000 measurements

class Summary extends Metric {
	constructor(config) {
		super(config, {
			percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999],
			compressCount: DEFAULT_COMPRESS_COUNT,
			hashMap: {},
		});

		this.type = 'summary';

		for (const label of this.labelNames) {
			if (label === 'quantile')
				throw new Error('quantile is a reserved label keyword');
		}

		if (this.labelNames.length === 0) {
			this.hashMap = {
				[hashObject({})]: {
					labels: {},
					td: new timeWindowQuantiles(this.maxAgeSeconds, this.ageBuckets),
					count: 0,
					sum: 0,
				},
			};
		}
	}

	/**
	 * Observe a value
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @param {Number} value - Value to observe
	 * @returns {void}
	 */
	observe(labels, value) {
		observe.call(this, labels === 0 ? 0 : labels || {})(value);
	}

	async get() {
		if (this.collect) {
			const v = this.collect();
			if (v instanceof Promise) await v;
		}
		const hashKeys = Object.keys(this.hashMap);
		const values = [];

		hashKeys.forEach(hashKey => {
			const s = this.hashMap[hashKey];
			if (s) {
				if (this.pruneAgedBuckets && s.td.size() === 0) {
					delete this.hashMap[hashKey];
				} else {
					extractSummariesForExport(s, this.percentiles).forEach(v => {
						values.push(v);
					});
					values.push(getSumForExport(s, this));
					values.push(getCountForExport(s, this));
				}
			}
		});

		return {
			name: this.name,
			help: this.help,
			type: this.type,
			values,
			aggregator: this.aggregator,
		};
	}

	reset() {
		const data = Object.values(this.hashMap);
		data.forEach(s => {
			s.td.reset();
			s.count = 0;
			s.sum = 0;
		});
	}

	/**
	 * Start a timer that could be used to logging durations
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @returns {function} - Function to invoke when you want to stop the timer and observe the duration in seconds
	 * @example
	 * var end = summary.startTimer();
	 * makeExpensiveXHRRequest(function(err, res) {
	 *	end(); //Observe the duration of expensiveXHRRequest
	 * });
	 */
	startTimer(labels) {
		return startTimer.call(this, labels)();
	}

	labels(...args) {
		const labels = getLabels(this.labelNames, args);
		validateLabel(this.labelNames, labels);
		return {
			observe: observe.call(this, labels),
			startTimer: startTimer.call(this, labels),
		};
	}

	remove(...args) {
		const labels = getLabels(this.labelNames, args);
		validateLabel(this.labelNames, labels);
		removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
	}
}

function extractSummariesForExport(summaryOfLabels, percentiles) {
	summaryOfLabels.td.compress();

	return percentiles.map(percentile => {
		const percentileValue = summaryOfLabels.td.percentile(percentile);
		return {
			labels: Object.assign({ quantile: percentile }, summaryOfLabels.labels),
			value: percentileValue ? percentileValue : 0,
		};
	});
}

function getCountForExport(value, summary) {
	return {
		metricName: `${summary.name}_count`,
		labels: value.labels,
		value: value.count,
	};
}

function getSumForExport(value, summary) {
	return {
		metricName: `${summary.name}_sum`,
		labels: value.labels,
		value: value.sum,
	};
}

function startTimer(startLabels) {
	return () => {
		const start = process.hrtime();
		return endLabels => {
			const delta = process.hrtime(start);
			const value = delta[0] + delta[1] / 1e9;
			this.observe(Object.assign({}, startLabels, endLabels), value);
			return value;
		};
	};
}

function observe(labels) {
	return value => {
		const labelValuePair = convertLabelsAndValues(labels, value);

		validateLabel(this.labelNames, labels);
		if (!Number.isFinite(labelValuePair.value)) {
			throw new TypeError(
				`Value is not a valid number: ${util.format(labelValuePair.value)}`,
			);
		}

		const hash = hashObject(labelValuePair.labels, this.sortedLabelNames);
		let summaryOfLabel = this.hashMap[hash];
		if (!summaryOfLabel) {
			summaryOfLabel = {
				labels: labelValuePair.labels,
				td: new timeWindowQuantiles(this.maxAgeSeconds, this.ageBuckets),
				count: 0,
				sum: 0,
			};
		}

		summaryOfLabel.td.push(labelValuePair.value);
		summaryOfLabel.count++;
		if (summaryOfLabel.count % this.compressCount === 0) {
			summaryOfLabel.td.compress();
		}
		summaryOfLabel.sum += labelValuePair.value;
		this.hashMap[hash] = summaryOfLabel;
	};
}

function convertLabelsAndValues(labels, value) {
	if (value === undefined) {
		return {
			value: labels,
			labels: {},
		};
	}

	return {
		labels,
		value,
	};
}

module.exports = Summary;
