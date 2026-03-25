'use strict';

const util = require('util');

// These are from https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
const metricRegexp = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const labelRegexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

exports.validateMetricName = function (name) {
	return metricRegexp.test(name);
};

exports.validateLabelName = function (names = []) {
	return names.every(name => labelRegexp.test(name));
};

exports.validateLabel = function validateLabel(savedLabels, labels) {
	for (const label in labels) {
		if (!savedLabels.includes(label)) {
			throw new Error(
				`Added label "${label}" is not included in initial labelset: ${util.inspect(
					savedLabels,
				)}`,
			);
		}
	}
};
