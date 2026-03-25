"use strict";

const parse = require("./parse");
const stringify = require("./stringify");

function postcssHtml(config) {
	const syntax = {
		parse: (source, opts) =>
			parse(String(source), { config, syntax, ...(opts || {}) }),
		stringify,
	};
	return syntax;
}

const defaultSyntax = postcssHtml();
postcssHtml.parse = defaultSyntax.parse;
postcssHtml.stringify = defaultSyntax.stringify;

module.exports = postcssHtml;
