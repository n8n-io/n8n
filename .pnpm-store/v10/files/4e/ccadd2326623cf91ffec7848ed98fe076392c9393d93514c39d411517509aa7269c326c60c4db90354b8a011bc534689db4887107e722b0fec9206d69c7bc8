'use strict';

const path = require('path');
const preloadListEnv = require('./preload-list-env.js');

function getPreloadList() {
	const env = process.env[preloadListEnv];
	if (!env) {
		return [];
	}

	return env.split(path.delimiter);
}

module.exports = getPreloadList();
