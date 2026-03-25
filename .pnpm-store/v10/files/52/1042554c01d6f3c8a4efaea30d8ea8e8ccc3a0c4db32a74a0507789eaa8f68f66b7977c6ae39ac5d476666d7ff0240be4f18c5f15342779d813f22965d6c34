'use strict';

const path = require('path');

const needsPathRegExp = /[\\ "]/;

const needsPathEnv = dir => needsPathRegExp.test(dir);

function generateRequire(filename) {
	if (needsPathEnv(filename)) {
		return `--require ${path.basename(filename)}`;
	}

	return `--require ${filename}`;
}

function processNodePath(value) {
	const dir = path.dirname(require.resolve('./preload-path/node-preload.js'));
	const existing = value === '' ? [] : value.split(path.delimiter);
	if (existing.includes(dir)) {
		return value;
	}

	return existing.concat(dir).join(path.delimiter);
}

module.exports = {
	generateRequire,
	processNodePath,
	needsPathEnv
};
