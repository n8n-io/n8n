'use strict';

/**
 * Class representing an OpenMetrics exemplar.
 *
 * @property {object} labelSet
 * @property {number} value
 * @property {number} [timestamp]
 * */
class Exemplar {
	constructor(labelSet = {}, value = null) {
		this.labelSet = labelSet;
		this.value = value;
	}

	/**
	 * Validation for the label set format.
	 * https://github.com/OpenObservability/OpenMetrics/blob/d99b705f611b75fec8f450b05e344e02eea6921d/specification/OpenMetrics.md#exemplars
	 *
	 * @param {object} labelSet - Exemplar labels.
	 * @throws {RangeError}
	 * @return {void}
	 */
	validateExemplarLabelSet(labelSet) {
		let res = '';
		for (const [labelName, labelValue] of Object.entries(labelSet)) {
			res += `${labelName}${labelValue}`;
		}
		if (res.length > 128) {
			throw new RangeError(
				'Label set size must be smaller than 128 UTF-8 chars',
			);
		}
	}
}

module.exports = Exemplar;
