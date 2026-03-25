'use strict';
const fs = require('fs');
const stripBom = require('strip-bom');

module.exports = (module, filename) => {
	const content = fs.readFileSync(filename, 'utf8');

	try {
		module.exports = JSON.parse(stripBom(content));
	} catch (error) {
		error.message = `${filename}: ${error.message}`;
		throw error;
	}
};
