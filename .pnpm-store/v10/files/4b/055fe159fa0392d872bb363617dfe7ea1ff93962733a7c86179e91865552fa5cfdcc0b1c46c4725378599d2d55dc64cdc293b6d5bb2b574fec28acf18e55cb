'use strict';

const path = require('path');

function isNodeModules(directory) {
	let basename = path.basename(directory);
	/* istanbul ignore next: platform specific branch */
	if (path.sep === '\\') {
		basename = basename.toLowerCase();
	}

	return basename === 'node_modules';
}

module.exports = isNodeModules;
