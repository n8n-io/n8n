'use strict';
const fs = require('fs');
const stripBom = require('strip-bom');

module.exports = (module, filename) => {
	const content = fs.readFileSync(filename, 'utf8');
	module._compile(stripBom(content), filename);
};
