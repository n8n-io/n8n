'use strict';
const lenient = require('./lenient');

const yn = (input, options) => {
	input = String(input).trim();

	options = Object.assign({
		lenient: false,
		default: null
	}, options);

	if (options.default !== null && typeof options.default !== 'boolean') {
		throw new TypeError(`Expected the \`default\` option to be of type \`boolean\`, got \`${typeof options.default}\``);
	}

	if (/^(?:y|yes|true|1)$/i.test(input)) {
		return true;
	}

	if (/^(?:n|no|false|0)$/i.test(input)) {
		return false;
	}

	if (options.lenient === true) {
		return lenient(input, options);
	}

	return options.default;
};

module.exports = yn;
// TODO: Remove this for the next major release
module.exports.default = yn;
