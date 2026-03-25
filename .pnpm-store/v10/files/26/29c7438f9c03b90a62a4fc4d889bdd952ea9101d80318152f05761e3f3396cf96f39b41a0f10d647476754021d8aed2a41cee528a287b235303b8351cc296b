"use strict";

const htmlparser = require("htmlparser2");
const jsTokens = require("js-tokens");

const OPEN_BRACE = "{".charCodeAt(0);

module.exports = class JsxLikeTokenizer extends htmlparser.Tokenizer {
	stateBeforeAttributeValue(c) {
		if (c === OPEN_BRACE) {
			const startIndex = this.index;
			const endIndex = getIndexOfExpressionEnd(this.buffer, startIndex + 1);
			if (endIndex != null) {
				this.sectionStart = startIndex;
				this.index = endIndex + 1;

				this.cbs.onattribdata(this.sectionStart, this.index);
				this.sectionStart = -1;
				this.cbs.onattribend(1 /* QuoteType.Unquoted */, this.index);
				this.state = 8 /* BeforeAttributeName */;
				this.stateBeforeAttributeName(this.buffer.charCodeAt(this.index));
				return;
			}
		}
		super.stateBeforeAttributeValue(c);
	}
};

function getIndexOfExpressionEnd(source, startIndex) {
	let index = startIndex;
	let braceStack = 0;
	for (const token of jsTokens(source.slice(startIndex))) {
		if (token.value === "}") {
			if (braceStack === 0) {
				return index;
			}
			braceStack--;
		} else if (token.value === "{") {
			braceStack++;
		}
		index += token.value.length;
	}
	return null;
}
