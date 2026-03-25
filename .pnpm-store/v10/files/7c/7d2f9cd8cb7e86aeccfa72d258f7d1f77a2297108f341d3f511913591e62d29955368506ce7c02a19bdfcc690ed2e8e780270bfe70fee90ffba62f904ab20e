"use strict";

const Parser = require("postcss/lib/parser");
const templateTokenize = require("./template-tokenize");
class TemplateParser extends Parser {
	createTokenizer() {
		this.tokenizer = templateTokenize(this.input);
	}
}
module.exports = TemplateParser;
