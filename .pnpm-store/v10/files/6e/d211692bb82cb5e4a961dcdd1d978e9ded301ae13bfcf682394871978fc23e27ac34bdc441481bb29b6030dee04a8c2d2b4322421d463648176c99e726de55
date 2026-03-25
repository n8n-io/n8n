/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const getGeneratedSourceInfo = require("./getGeneratedSourceInfo");
const splitIntoLines = require("./splitIntoLines");

const streamChunksOfRawSource = (source, onChunk, onSource, onName) => {
	let line = 1;
	const matches = splitIntoLines(source);
	let match;
	for (match of matches) {
		onChunk(match, line, 0, -1, -1, -1, -1);
		line++;
	}
	return matches.length === 0 || match.endsWith("\n")
		? {
				generatedLine: matches.length + 1,
				generatedColumn: 0
		  }
		: {
				generatedLine: matches.length,
				generatedColumn: match.length
		  };
};

module.exports = (source, onChunk, onSource, onName, finalSource) => {
	return finalSource
		? getGeneratedSourceInfo(source)
		: streamChunksOfRawSource(source, onChunk, onSource, onName);
};
