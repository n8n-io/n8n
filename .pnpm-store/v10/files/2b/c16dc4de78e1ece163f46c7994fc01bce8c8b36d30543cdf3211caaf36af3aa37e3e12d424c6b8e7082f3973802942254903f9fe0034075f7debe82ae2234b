'use strict';

exports.getValueAsString = function getValueString(value) {
	if (Number.isNaN(value)) {
		return 'Nan';
	} else if (!Number.isFinite(value)) {
		if (value < 0) {
			return '-Inf';
		} else {
			return '+Inf';
		}
	} else {
		return `${value}`;
	}
};

exports.removeLabels = function removeLabels(
	hashMap,
	labels,
	sortedLabelNames,
) {
	const hash = hashObject(labels, sortedLabelNames);
	delete hashMap[hash];
};

exports.setValue = function setValue(hashMap, value, labels) {
	const hash = hashObject(labels);
	hashMap[hash] = {
		value: typeof value === 'number' ? value : 0,
		labels: labels || {},
	};
	return hashMap;
};

exports.setValueDelta = function setValueDelta(
	hashMap,
	deltaValue,
	labels,
	hash = '',
) {
	const value = typeof deltaValue === 'number' ? deltaValue : 0;
	if (hashMap[hash]) {
		hashMap[hash].value += value;
	} else {
		hashMap[hash] = { value, labels };
	}
	return hashMap;
};

exports.getLabels = function (labelNames, args) {
	if (typeof args[0] === 'object') {
		return args[0];
	}

	if (labelNames.length !== args.length) {
		throw new Error(
			`Invalid number of arguments (${args.length}): "${args.join(
				', ',
			)}" for label names (${labelNames.length}): "${labelNames.join(', ')}".`,
		);
	}

	const acc = {};
	for (let i = 0; i < labelNames.length; i++) {
		acc[labelNames[i]] = args[i];
	}
	return acc;
};

function fastHashObject(keys, labels) {
	if (keys.length === 0) {
		return '';
	}

	let hash = '';

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const value = labels[key];
		if (value === undefined) continue;

		hash += `${key}:${value},`;
	}

	return hash;
}

function hashObject(labels, labelNames) {
	// We don't actually need a hash here. We just need a string that
	// is unique for each possible labels object and consistent across
	// calls with equivalent labels objects.

	if (labelNames) {
		return fastHashObject(labelNames, labels);
	}

	const keys = Object.keys(labels);
	if (keys.length > 1) {
		keys.sort(); // need consistency across calls
	}

	return fastHashObject(keys, labels);
}
exports.hashObject = hashObject;

exports.isObject = function isObject(obj) {
	return obj !== null && typeof obj === 'object';
};

exports.nowTimestamp = function nowTimestamp() {
	return Date.now() / 1000;
};

class Grouper extends Map {
	/**
	 * Adds the `value` to the `key`'s array of values.
	 * @param {*} key Key to set.
	 * @param {*} value Value to add to `key`'s array.
	 * @returns {undefined} undefined.
	 */
	add(key, value) {
		if (this.has(key)) {
			this.get(key).push(value);
		} else {
			this.set(key, [value]);
		}
	}
}

exports.Grouper = Grouper;
