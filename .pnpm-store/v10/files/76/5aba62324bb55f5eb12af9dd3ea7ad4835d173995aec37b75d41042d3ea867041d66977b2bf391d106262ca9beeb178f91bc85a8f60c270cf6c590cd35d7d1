/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");
const splitIntoLines = require("./splitIntoLines");

const streamChunksOfCombinedSourceMap = (
	source,
	sourceMap,
	innerSourceName,
	innerSource,
	innerSourceMap,
	removeInnerSource,
	onChunk,
	onSource,
	onName,
	finalSource,
	columns
) => {
	let sourceMapping = new Map();
	let nameMapping = new Map();
	const sourceIndexMapping = [];
	const nameIndexMapping = [];
	const nameIndexValueMapping = [];
	let innerSourceIndex = -2;
	const innerSourceIndexMapping = [];
	const innerSourceIndexValueMapping = [];
	const innerSourceContents = [];
	const innerSourceContentLines = [];
	const innerNameIndexMapping = [];
	const innerNameIndexValueMapping = [];
	const innerSourceMapLineData = [];
	const findInnerMapping = (line, column) => {
		if (line > innerSourceMapLineData.length) return -1;
		const { mappingsData } = innerSourceMapLineData[line - 1];
		let l = 0;
		let r = mappingsData.length / 5;
		while (l < r) {
			let m = (l + r) >> 1;
			if (mappingsData[m * 5] <= column) {
				l = m + 1;
			} else {
				r = m;
			}
		}
		if (l === 0) return -1;
		return l - 1;
	};
	return streamChunksOfSourceMap(
		source,
		sourceMap,
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			// Check if this is a mapping to the inner source
			if (sourceIndex === innerSourceIndex) {
				// Check if there is a mapping in the inner source
				const idx = findInnerMapping(originalLine, originalColumn);
				if (idx !== -1) {
					const { chunks, mappingsData } = innerSourceMapLineData[
						originalLine - 1
					];
					const mi = idx * 5;
					const innerSourceIndex = mappingsData[mi + 1];
					const innerOriginalLine = mappingsData[mi + 2];
					let innerOriginalColumn = mappingsData[mi + 3];
					let innerNameIndex = mappingsData[mi + 4];
					if (innerSourceIndex >= 0) {
						// Check for an identity mapping
						// where we are allowed to adjust the original column
						const innerChunk = chunks[idx];
						const innerGeneratedColumn = mappingsData[mi];
						const locationInChunk = originalColumn - innerGeneratedColumn;
						if (locationInChunk > 0) {
							let originalSourceLines =
								innerSourceIndex < innerSourceContentLines.length
									? innerSourceContentLines[innerSourceIndex]
									: null;
							if (originalSourceLines === undefined) {
								const originalSource = innerSourceContents[innerSourceIndex];
								originalSourceLines = originalSource
									? splitIntoLines(originalSource)
									: null;
								innerSourceContentLines[innerSourceIndex] = originalSourceLines;
							}
							if (originalSourceLines !== null) {
								const originalChunk =
									innerOriginalLine <= originalSourceLines.length
										? originalSourceLines[innerOriginalLine - 1].slice(
												innerOriginalColumn,
												innerOriginalColumn + locationInChunk
										  )
										: "";
								if (innerChunk.slice(0, locationInChunk) === originalChunk) {
									innerOriginalColumn += locationInChunk;
									innerNameIndex = -1;
								}
							}
						}

						// We have a inner mapping to original source

						// emit source when needed and compute global source index
						let sourceIndex =
							innerSourceIndex < innerSourceIndexMapping.length
								? innerSourceIndexMapping[innerSourceIndex]
								: -2;
						if (sourceIndex === -2) {
							const [source, sourceContent] =
								innerSourceIndex < innerSourceIndexValueMapping.length
									? innerSourceIndexValueMapping[innerSourceIndex]
									: [null, undefined];
							let globalIndex = sourceMapping.get(source);
							if (globalIndex === undefined) {
								sourceMapping.set(source, (globalIndex = sourceMapping.size));
								onSource(globalIndex, source, sourceContent);
							}
							sourceIndex = globalIndex;
							innerSourceIndexMapping[innerSourceIndex] = sourceIndex;
						}

						// emit name when needed and compute global name index
						let finalNameIndex = -1;
						if (innerNameIndex >= 0) {
							// when we have a inner name
							finalNameIndex =
								innerNameIndex < innerNameIndexMapping.length
									? innerNameIndexMapping[innerNameIndex]
									: -2;
							if (finalNameIndex === -2) {
								const name =
									innerNameIndex < innerNameIndexValueMapping.length
										? innerNameIndexValueMapping[innerNameIndex]
										: undefined;
								if (name) {
									let globalIndex = nameMapping.get(name);
									if (globalIndex === undefined) {
										nameMapping.set(name, (globalIndex = nameMapping.size));
										onName(globalIndex, name);
									}
									finalNameIndex = globalIndex;
								} else {
									finalNameIndex = -1;
								}
								innerNameIndexMapping[innerNameIndex] = finalNameIndex;
							}
						} else if (nameIndex >= 0) {
							// when we don't have an inner name,
							// but we have an outer name
							// it can be used when inner original code equals to the name
							let originalSourceLines =
								innerSourceContentLines[innerSourceIndex];
							if (originalSourceLines === undefined) {
								const originalSource = innerSourceContents[innerSourceIndex];
								originalSourceLines = originalSource
									? splitIntoLines(originalSource)
									: null;
								innerSourceContentLines[innerSourceIndex] = originalSourceLines;
							}
							if (originalSourceLines !== null) {
								const name = nameIndexValueMapping[nameIndex];
								const originalName =
									innerOriginalLine <= originalSourceLines.length
										? originalSourceLines[innerOriginalLine - 1].slice(
												innerOriginalColumn,
												innerOriginalColumn + name.length
										  )
										: "";
								if (name === originalName) {
									finalNameIndex =
										nameIndex < nameIndexMapping.length
											? nameIndexMapping[nameIndex]
											: -2;
									if (finalNameIndex === -2) {
										const name = nameIndexValueMapping[nameIndex];
										if (name) {
											let globalIndex = nameMapping.get(name);
											if (globalIndex === undefined) {
												nameMapping.set(name, (globalIndex = nameMapping.size));
												onName(globalIndex, name);
											}
											finalNameIndex = globalIndex;
										} else {
											finalNameIndex = -1;
										}
										nameIndexMapping[nameIndex] = finalNameIndex;
									}
								}
							}
						}
						onChunk(
							chunk,
							generatedLine,
							generatedColumn,
							sourceIndex,
							innerOriginalLine,
							innerOriginalColumn,
							finalNameIndex
						);
						return;
					}
				}

				// We have a mapping to the inner source, but no inner mapping
				if (removeInnerSource) {
					onChunk(chunk, generatedLine, generatedColumn, -1, -1, -1, -1);
					return;
				} else {
					if (sourceIndexMapping[sourceIndex] === -2) {
						let globalIndex = sourceMapping.get(innerSourceName);
						if (globalIndex === undefined) {
							sourceMapping.set(source, (globalIndex = sourceMapping.size));
							onSource(globalIndex, innerSourceName, innerSource);
						}
						sourceIndexMapping[sourceIndex] = globalIndex;
					}
				}
			}

			const finalSourceIndex =
				sourceIndex < 0 || sourceIndex >= sourceIndexMapping.length
					? -1
					: sourceIndexMapping[sourceIndex];
			if (finalSourceIndex < 0) {
				// no source, so we make it a generated chunk
				onChunk(chunk, generatedLine, generatedColumn, -1, -1, -1, -1);
			} else {
				// Pass through the chunk with mapping
				let finalNameIndex = -1;
				if (nameIndex >= 0 && nameIndex < nameIndexMapping.length) {
					finalNameIndex = nameIndexMapping[nameIndex];
					if (finalNameIndex === -2) {
						const name = nameIndexValueMapping[nameIndex];
						let globalIndex = nameMapping.get(name);
						if (globalIndex === undefined) {
							nameMapping.set(name, (globalIndex = nameMapping.size));
							onName(globalIndex, name);
						}
						finalNameIndex = globalIndex;
						nameIndexMapping[nameIndex] = finalNameIndex;
					}
				}
				onChunk(
					chunk,
					generatedLine,
					generatedColumn,
					finalSourceIndex,
					originalLine,
					originalColumn,
					finalNameIndex
				);
			}
		},
		(i, source, sourceContent) => {
			if (source === innerSourceName) {
				innerSourceIndex = i;
				if (innerSource !== undefined) sourceContent = innerSource;
				else innerSource = sourceContent;
				sourceIndexMapping[i] = -2;
				streamChunksOfSourceMap(
					sourceContent,
					innerSourceMap,
					(
						chunk,
						generatedLine,
						generatedColumn,
						sourceIndex,
						originalLine,
						originalColumn,
						nameIndex
					) => {
						while (innerSourceMapLineData.length < generatedLine) {
							innerSourceMapLineData.push({
								mappingsData: [],
								chunks: []
							});
						}
						const data = innerSourceMapLineData[generatedLine - 1];
						data.mappingsData.push(
							generatedColumn,
							sourceIndex,
							originalLine,
							originalColumn,
							nameIndex
						);
						data.chunks.push(chunk);
					},
					(i, source, sourceContent) => {
						innerSourceContents[i] = sourceContent;
						innerSourceContentLines[i] = undefined;
						innerSourceIndexMapping[i] = -2;
						innerSourceIndexValueMapping[i] = [source, sourceContent];
					},
					(i, name) => {
						innerNameIndexMapping[i] = -2;
						innerNameIndexValueMapping[i] = name;
					},
					false,
					columns
				);
			} else {
				let globalIndex = sourceMapping.get(source);
				if (globalIndex === undefined) {
					sourceMapping.set(source, (globalIndex = sourceMapping.size));
					onSource(globalIndex, source, sourceContent);
				}
				sourceIndexMapping[i] = globalIndex;
			}
		},
		(i, name) => {
			nameIndexMapping[i] = -2;
			nameIndexValueMapping[i] = name;
		},
		finalSource,
		columns
	);
};

module.exports = streamChunksOfCombinedSourceMap;
