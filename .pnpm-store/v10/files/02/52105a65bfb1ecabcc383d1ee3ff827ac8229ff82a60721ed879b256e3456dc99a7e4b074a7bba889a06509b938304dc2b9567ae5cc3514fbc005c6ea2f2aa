/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");
const splitIntoLines = require("./helpers/splitIntoLines");
const getGeneratedSourceInfo = require("./helpers/getGeneratedSourceInfo");
const Source = require("./Source");
const splitIntoPotentialTokens = require("./helpers/splitIntoPotentialTokens");

class OriginalSource extends Source {
	constructor(value, name) {
		super();
		const isBuffer = Buffer.isBuffer(value);
		this._value = isBuffer ? undefined : value;
		this._valueAsBuffer = isBuffer ? value : undefined;
		this._name = name;
	}

	getName() {
		return this._name;
	}

	source() {
		if (this._value === undefined) {
			this._value = this._valueAsBuffer.toString("utf-8");
		}
		return this._value;
	}

	buffer() {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._value, "utf-8");
		}
		return this._valueAsBuffer;
	}

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	/**
	 * @param {object} options options
	 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
	 * @param {function(number, string, string)} onSource called for each source
	 * @param {function(number, string)} onName called for each name
	 * @returns {void}
	 */
	streamChunks(options, onChunk, onSource, onName) {
		if (this._value === undefined) {
			this._value = this._valueAsBuffer.toString("utf-8");
		}
		onSource(0, this._name, this._value);
		const finalSource = !!(options && options.finalSource);
		if (!options || options.columns !== false) {
			// With column info we need to read all lines and split them
			const matches = splitIntoPotentialTokens(this._value);
			let line = 1;
			let column = 0;
			if (matches !== null) {
				for (const match of matches) {
					const isEndOfLine = match.endsWith("\n");
					if (isEndOfLine && match.length === 1) {
						if (!finalSource) onChunk(match, line, column, -1, -1, -1, -1);
					} else {
						const chunk = finalSource ? undefined : match;
						onChunk(chunk, line, column, 0, line, column, -1);
					}
					if (isEndOfLine) {
						line++;
						column = 0;
					} else {
						column += match.length;
					}
				}
			}
			return {
				generatedLine: line,
				generatedColumn: column,
				source: finalSource ? this._value : undefined
			};
		} else if (finalSource) {
			// Without column info and with final source we only
			// need meta info to generate mapping
			const result = getGeneratedSourceInfo(this._value);
			const { generatedLine, generatedColumn } = result;
			if (generatedColumn === 0) {
				for (let line = 1; line < generatedLine; line++)
					onChunk(undefined, line, 0, 0, line, 0, -1);
			} else {
				for (let line = 1; line <= generatedLine; line++)
					onChunk(undefined, line, 0, 0, line, 0, -1);
			}
			return result;
		} else {
			// Without column info, but also without final source
			// we need to split source by lines
			let line = 1;
			const matches = splitIntoLines(this._value);
			let match;
			for (match of matches) {
				onChunk(finalSource ? undefined : match, line, 0, 0, line, 0, -1);
				line++;
			}
			return matches.length === 0 || match.endsWith("\n")
				? {
						generatedLine: matches.length + 1,
						generatedColumn: 0,
						source: finalSource ? this._value : undefined
				  }
				: {
						generatedLine: matches.length,
						generatedColumn: match.length,
						source: finalSource ? this._value : undefined
				  };
		}
	}

	updateHash(hash) {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._value, "utf-8");
		}
		hash.update("OriginalSource");
		hash.update(this._valueAsBuffer);
		hash.update(this._name || "");
	}
}

module.exports = OriginalSource;
