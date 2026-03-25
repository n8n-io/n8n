"use strict";

const postcssParse = require("postcss/lib/parse");
const TemplateParser = require("./template-parser");
const TemplateSafeParser = require("./template-safe-parser");
const Input = require("postcss/lib/input");

function templateParse(css, opts, Parser) {
	const input = new Input(css, opts);

	const parser = new Parser(input);
	parser.parse();

	return parser.root;
}

module.exports = function buildTemplateSyntax(baseSyntax) {
	return {
		parse(css, opts) {
			return templateParse(
				css,
				opts,
				baseSyntax.parse === postcssParse ? TemplateParser : TemplateSafeParser,
			);
		},
		stringify(...args) {
			return baseSyntax.stringify(...args);
		},
	};
};
