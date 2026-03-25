'use strict';

const {pathToFileURL} = require('url');

module.exports = async filename => {
	const mod = await import(pathToFileURL(filename));
	if ('default' in mod === false) {
		throw new Error(`${filename} has no default export`);
	}

	return mod.default;
};
