'use strict';

const {generateRequire} = require('./generate-require.js');

function processNodeOptions(value) {
	const requireSelf = generateRequire(require.resolve('./preload-path/node-preload.js'));

	/* istanbul ignore else */
	if (!value.includes(requireSelf)) {
		value = `${value} ${requireSelf}`;
	}

	return value;
}

module.exports = processNodeOptions;
