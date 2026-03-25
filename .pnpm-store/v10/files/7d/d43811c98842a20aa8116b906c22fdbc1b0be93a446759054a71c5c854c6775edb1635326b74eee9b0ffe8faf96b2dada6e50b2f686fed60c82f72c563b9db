"use strict";

const JsxLikeTokenizer = require("./jsx-like-tokenizer");

const MINUS = "-".charCodeAt(0);
const LINE_FEED = "\n".charCodeAt(0);

module.exports = class AstroTokenizer extends JsxLikeTokenizer {
	constructor(...args) {
		super(...args);
		this._hasFrontmatter = false;
	}

	parse() {
		super.parse();
	}

	stateText(c) {
		if (!this._hasFrontmatter) {
			if (c === MINUS) {
				const startIndex = this.index - this.offset;
				if (
					startIndex === 0 &&
					this.buffer.slice(startIndex, startIndex + 3) === "---"
				) {
					const closeIndex = this.buffer.indexOf("\n---", startIndex + 3);
					if (closeIndex >= 0) {
						this.index = closeIndex + 3;
						this._hasFrontmatter = true;
						return;
					}
				}
			}
			if (c === LINE_FEED) {
				const startIndex = this.index - this.offset;
				if (this.buffer.slice(startIndex, startIndex + 4) === "\n---") {
					const closeIndex = this.buffer.indexOf("\n---", startIndex + 4);
					if (closeIndex >= 0) {
						this.index = closeIndex + 3;
						this._hasFrontmatter = true;
						return;
					}
				}
			}
		}
		super.stateText(c);
	}
};
