'use strict';

const { TDigest } = require('tdigest');

class TimeWindowQuantiles {
	constructor(maxAgeSeconds, ageBuckets) {
		this.maxAgeSeconds = maxAgeSeconds || 0;
		this.ageBuckets = ageBuckets || 0;

		this.shouldRotate = maxAgeSeconds && ageBuckets;

		this.ringBuffer = Array(ageBuckets).fill(new TDigest());
		this.currentBuffer = 0;

		this.lastRotateTimestampMillis = Date.now();
		this.durationBetweenRotatesMillis =
			(maxAgeSeconds * 1000) / ageBuckets || Infinity;
	}

	size() {
		const bucket = rotate.call(this);
		return bucket.size();
	}

	percentile(quantile) {
		const bucket = rotate.call(this);
		return bucket.percentile(quantile);
	}

	push(value) {
		rotate.call(this);
		this.ringBuffer.forEach(bucket => {
			bucket.push(value);
		});
	}

	reset() {
		this.ringBuffer.forEach(bucket => {
			bucket.reset();
		});
	}

	compress() {
		this.ringBuffer.forEach(bucket => {
			bucket.compress();
		});
	}
}

function rotate() {
	let timeSinceLastRotateMillis = Date.now() - this.lastRotateTimestampMillis;
	while (
		timeSinceLastRotateMillis > this.durationBetweenRotatesMillis &&
		this.shouldRotate
	) {
		this.ringBuffer[this.currentBuffer] = new TDigest();

		if (++this.currentBuffer >= this.ringBuffer.length) {
			this.currentBuffer = 0;
		}
		timeSinceLastRotateMillis -= this.durationBetweenRotatesMillis;
		this.lastRotateTimestampMillis += this.durationBetweenRotatesMillis;
	}
	return this.ringBuffer[this.currentBuffer];
}

module.exports = TimeWindowQuantiles;
