'use strict';

const path = require('path');
const {promisify} = require('util');
const readFile = promisify(require('fs').readFile);

const isNodeModules = require('./is-node-modules.cjs');
const resultsCache = require('./cache.cjs');

const promiseCache = new Map();

async function getDirectoryTypeActual(directory) {
	if (isNodeModules(directory)) {
		return 'commonjs';
	}

	try {
		return JSON.parse(await readFile(path.resolve(directory, 'package.json'))).type || 'commonjs';
	} catch (_) {
	}

	const parent = path.dirname(directory);
	if (parent === directory) {
		return 'commonjs';
	}

	return getDirectoryType(parent);
}

async function getDirectoryType(directory) {
	if (resultsCache.has(directory)) {
		return resultsCache.get(directory);
	}

	if (promiseCache.has(directory)) {
		return promiseCache.get(directory);
	}

	const promise = getDirectoryTypeActual(directory);
	promiseCache.set(directory, promise);
	const result = await promise;
	resultsCache.set(directory, result);
	promiseCache.delete(directory);

	return result;
}

function getPackageType(filename) {
	return getDirectoryType(path.resolve(path.dirname(filename)));
}

module.exports = getPackageType;
