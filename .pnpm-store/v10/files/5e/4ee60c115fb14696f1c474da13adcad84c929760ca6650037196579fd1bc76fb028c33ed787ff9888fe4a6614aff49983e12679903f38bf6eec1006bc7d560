/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createMappingsSerializer = require("./createMappingsSerializer");
const streamChunks = require("./streamChunks");

const streamAndGetSourceAndMap = (
	inputSource,
	options,
	onChunk,
	onSource,
	onName
) => {
	let code = "";
	let mappings = "";
	let sources = [];
	let sourcesContent = [];
	let names = [];
	const addMapping = createMappingsSerializer(
		Object.assign({}, options, { columns: true })
	);
	const finalSource = !!(options && options.finalSource);
	const { generatedLine, generatedColumn, source } = streamChunks(
		inputSource,
		options,
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			if (chunk !== undefined) code += chunk;
			mappings += addMapping(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
			return onChunk(
				finalSource ? undefined : chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
		},
		(sourceIndex, source, sourceContent) => {
			while (sources.length < sourceIndex) {
				sources.push(null);
			}
			sources[sourceIndex] = source;
			if (sourceContent !== undefined) {
				while (sourcesContent.length < sourceIndex) {
					sourcesContent.push(null);
				}
				sourcesContent[sourceIndex] = sourceContent;
			}
			return onSource(sourceIndex, source, sourceContent);
		},
		(nameIndex, name) => {
			while (names.length < nameIndex) {
				names.push(null);
			}
			names[nameIndex] = name;
			return onName(nameIndex, name);
		}
	);
	const resultSource = source !== undefined ? source : code;
	return {
		result: {
			generatedLine,
			generatedColumn,
			source: finalSource ? resultSource : undefined
		},
		source: resultSource,
		map:
			mappings.length > 0
				? {
						version: 3,
						file: "x",
						mappings,
						sources,
						sourcesContent:
							sourcesContent.length > 0 ? sourcesContent : undefined,
						names
				  }
				: null
	};
};

module.exports = streamAndGetSourceAndMap;
