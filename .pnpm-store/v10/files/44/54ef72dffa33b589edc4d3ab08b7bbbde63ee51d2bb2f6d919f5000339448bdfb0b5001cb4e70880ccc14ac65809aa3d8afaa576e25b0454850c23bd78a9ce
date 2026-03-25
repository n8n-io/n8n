'use strict';

const pDebounce = (fn, wait, options = {}) => {
	if (!Number.isFinite(wait)) {
		throw new TypeError('Expected `wait` to be a finite number');
	}

	let leadingValue;
	let timer;
	let resolveList = [];

	return function (...arguments_) {
		return new Promise(resolve => {
			const runImmediately = options.leading && !timer;

			clearTimeout(timer);

			timer = setTimeout(() => {
				timer = null;

				const result = options.leading ? leadingValue : fn.apply(this, arguments_);

				for (resolve of resolveList) {
					resolve(result);
				}

				resolveList = [];
			}, wait);

			if (runImmediately) {
				leadingValue = fn.apply(this, arguments_);
				resolve(leadingValue);
			} else {
				resolveList.push(resolve);
			}
		});
	};
};

module.exports = pDebounce;
// TODO: Remove this for the next major release
module.exports.default = pDebounce;
