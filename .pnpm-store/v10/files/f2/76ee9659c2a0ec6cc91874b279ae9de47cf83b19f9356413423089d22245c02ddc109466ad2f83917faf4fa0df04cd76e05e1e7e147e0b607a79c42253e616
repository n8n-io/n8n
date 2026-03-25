"use strict";

const SafeParser = require("postcss-safe-parser/lib/safe-parser");
const templateTokenize = require("./template-tokenize");
class TemplateSafeParser extends SafeParser {
	createTokenizer() {
		this.tokenizer = templateTokenize(this.input, { ignoreErrors: true });
	}
}
module.exports = TemplateSafeParser;
