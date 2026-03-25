'use strict';

const path = require('path');
const {readFileSync} = require('fs');

const isNodeModules = require('./is-node-modules.cjs');
const resultsCache = require('./cache.cjs');

function getDirectoryTypeActual(directory) {
	if (isNodeModules(directory)) {
		return 'commonjs';
	}

	try {
		return JSON.parse(readFileSync(path.resolve(directory, 'package.json'))).type || 'commonjs';
	} catch (_) {
	}

	const parent = path.dirname(directory);
	if (parent === directory) {
		return 'commonjs';
	}

	return getDirectoryType(parent);
}

function getDirectoryType(directory) {
	if (resultsCache.has(directory)) {
		return resultsCache.get(directory);
	}

	const result = getDirectoryTypeActual(directory);
	resultsCache.set(directory, result);

	return result;
}

function getPackageTypeSync(filename) {
	return getDirectoryType(path.resolve(path.dirname(filename)));
}

module.exports = getPackageTypeSync;
