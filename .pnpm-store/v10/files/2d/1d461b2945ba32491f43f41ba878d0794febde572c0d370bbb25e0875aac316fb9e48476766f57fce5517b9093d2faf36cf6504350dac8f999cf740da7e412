/**
 * Gauge metric
 */
'use strict';

const util = require('util');

const {
	setValue,
	setValueDelta,
	getLabels,
	hashObject,
	isObject,
	removeLabels,
} = require('./util');
const { validateLabel } = require('./validation');
const { Metric } = require('./metric');

class Gauge extends Metric {
	constructor(config) {
		super(config);
		this.type = 'gauge';
	}

	/**
	 * Set a gauge to a value
	 * @param {object} labels - Object with labels and their values
	 * @param {Number} value - Value to set the gauge to, must be positive
	 * @returns {void}
	 */
	set(labels, value) {
		value = getValueArg(labels, value);
		labels = getLabelArg(labels);
		set(this, labels, value);
	}

	/**
	 * Reset gauge
	 * @returns {void}
	 */
	reset() {
		this.hashMap = {};
		if (this.labelNames.length === 0) {
			setValue(this.hashMap, 0, {});
		}
	}

	/**
	 * Increment a gauge value
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @param {Number} value - Value to increment - if omitted, increment with 1
	 * @returns {void}
	 */
	inc(labels, value) {
		value = getValueArg(labels, value);
		labels = getLabelArg(labels);
		if (value === undefined) value = 1;
		setDelta(this, labels, value);
	}

	/**
	 * Decrement a gauge value
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @param {Number} value - Value to decrement - if omitted, decrement with 1
	 * @returns {void}
	 */
	dec(labels, value) {
		value = getValueArg(labels, value);
		labels = getLabelArg(labels);
		if (value === undefined) value = 1;
		setDelta(this, labels, -value);
	}

	/**
	 * Set the gauge to current unix epoch
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @returns {void}
	 */
	setToCurrentTime(labels) {
		const now = Date.now() / 1000;
		if (labels === undefined) {
			this.set(now);
		} else {
			this.set(labels, now);
		}
	}

	/**
	 * Start a timer
	 * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
	 * @returns {function} - Invoke this function to set the duration in seconds since you started the timer.
	 * @example
	 * var done = gauge.startTimer();
	 * makeXHRRequest(function(err, response) {
	 *	done(); //Duration of the request will be saved
	 * });
	 */
	startTimer(labels) {
		const start = process.hrtime();
		return endLabels => {
			const delta = process.hrtime(start);
			const value = delta[0] + delta[1] / 1e9;
			this.set(Object.assign({}, labels, endLabels), value);
			return value;
		};
	}

	async get() {
		if (this.collect) {
			const v = this.collect();
			if (v instanceof Promise) await v;
		}
		return {
			help: this.help,
			name: this.name,
			type: this.type,
			values: Object.values(this.hashMap),
			aggregator: this.aggregator,
		};
	}

	_getValue(labels) {
		const hash = hashObject(labels || {}, this.sortedLabelNames);
		return this.hashMap[hash] ? this.hashMap[hash].value : 0;
	}

	labels(...args) {
		const labels = getLabels(this.labelNames, args);
		validateLabel(this.labelNames, labels);
		return {
			inc: this.inc.bind(this, labels),
			dec: this.dec.bind(this, labels),
			set: this.set.bind(this, labels),
			setToCurrentTime: this.setToCurrentTime.bind(this, labels),
			startTimer: this.startTimer.bind(this, labels),
		};
	}

	remove(...args) {
		const labels = getLabels(this.labelNames, args);
		validateLabel(this.labelNames, labels);
		removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
	}
}

function set(gauge, labels, value) {
	if (typeof value !== 'number') {
		throw new TypeError(`Value is not a valid number: ${util.format(value)}`);
	}

	validateLabel(gauge.labelNames, labels);
	setValue(gauge.hashMap, value, labels);
}

function setDelta(gauge, labels, delta) {
	if (typeof delta !== 'number') {
		throw new TypeError(`Delta is not a valid number: ${util.format(delta)}`);
	}

	validateLabel(gauge.labelNames, labels);
	const hash = hashObject(labels, gauge.sortedLabelNames);
	setValueDelta(gauge.hashMap, delta, labels, hash);
}

function getLabelArg(labels) {
	return isObject(labels) ? labels : {};
}

function getValueArg(labels, value) {
	return isObject(labels) ? value : labels;
}

module.exports = Gauge;
