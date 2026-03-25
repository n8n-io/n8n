/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");
const streamChunks = require("./helpers/streamChunks");
const Source = require("./Source");
const splitIntoLines = require("./helpers/splitIntoLines");

// since v8 7.0, Array.prototype.sort is stable
const hasStableSort =
	typeof process === "object" &&
	process.versions &&
	typeof process.versions.v8 === "string" &&
	!/^[0-6]\./.test(process.versions.v8);

// This is larger than max string length
const MAX_SOURCE_POSITION = 0x20000000;

class Replacement {
	constructor(start, end, content, name) {
		this.start = start;
		this.end = end;
		this.content = content;
		this.name = name;
		if (!hasStableSort) {
			this.index = -1;
		}
	}
}

class ReplaceSource extends Source {
	constructor(source, name) {
		super();
		this._source = source;
		this._name = name;
		/** @type {Replacement[]} */
		this._replacements = [];
		this._isSorted = true;
	}

	getName() {
		return this._name;
	}

	getReplacements() {
		this._sortReplacements();
		return this._replacements;
	}

	replace(start, end, newValue, name) {
		if (typeof newValue !== "string")
			throw new Error(
				"insertion must be a string, but is a " + typeof newValue
			);
		this._replacements.push(new Replacement(start, end, newValue, name));
		this._isSorted = false;
	}

	insert(pos, newValue, name) {
		if (typeof newValue !== "string")
			throw new Error(
				"insertion must be a string, but is a " +
					typeof newValue +
					": " +
					newValue
			);
		this._replacements.push(new Replacement(pos, pos - 1, newValue, name));
		this._isSorted = false;
	}

	source() {
		if (this._replacements.length === 0) {
			return this._source.source();
		}
		let current = this._source.source();
		let pos = 0;
		const result = [];

		this._sortReplacements();
		for (const replacement of this._replacements) {
			const start = Math.floor(replacement.start);
			const end = Math.floor(replacement.end + 1);
			if (pos < start) {
				const offset = start - pos;
				result.push(current.slice(0, offset));
				current = current.slice(offset);
				pos = start;
			}
			result.push(replacement.content);
			if (pos < end) {
				const offset = end - pos;
				current = current.slice(offset);
				pos = end;
			}
		}
		result.push(current);
		return result.join("");
	}

	map(options) {
		if (this._replacements.length === 0) {
			return this._source.map(options);
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (this._replacements.length === 0) {
			return this._source.sourceAndMap(options);
		}
		return getSourceAndMap(this, options);
	}

	original() {
		return this._source;
	}

	_sortReplacements() {
		if (this._isSorted) return;
		if (hasStableSort) {
			this._replacements.sort(function (a, b) {
				const diff1 = a.start - b.start;
				if (diff1 !== 0) return diff1;
				const diff2 = a.end - b.end;
				if (diff2 !== 0) return diff2;
				return 0;
			});
		} else {
			this._replacements.forEach((repl, i) => (repl.index = i));
			this._replacements.sort(function (a, b) {
				const diff1 = a.start - b.start;
				if (diff1 !== 0) return diff1;
				const diff2 = a.end - b.end;
				if (diff2 !== 0) return diff2;
				return a.index - b.index;
			});
		}
		this._isSorted = true;
	}

	streamChunks(options, onChunk, onSource, onName) {
		this._sortReplacements();
		const repls = this._replacements;
		let pos = 0;
		let i = 0;
		let replacmentEnd = -1;
		let nextReplacement =
			i < repls.length ? Math.floor(repls[i].start) : MAX_SOURCE_POSITION;
		let generatedLineOffset = 0;
		let generatedColumnOffset = 0;
		let generatedColumnOffsetLine = 0;
		const sourceContents = [];
		const nameMapping = new Map();
		const nameIndexMapping = [];
		const checkOriginalContent = (sourceIndex, line, column, expectedChunk) => {
			let content =
				sourceIndex < sourceContents.length
					? sourceContents[sourceIndex]
					: undefined;
			if (content === undefined) return false;
			if (typeof content === "string") {
				content = splitIntoLines(content);
				sourceContents[sourceIndex] = content;
			}
			const contentLine = line <= content.length ? content[line - 1] : null;
			if (contentLine === null) return false;
			return (
				contentLine.slice(column, column + expectedChunk.length) ===
				expectedChunk
			);
		};
		let { generatedLine, generatedColumn } = streamChunks(
			this._source,
			Object.assign({}, options, { finalSource: false }),
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			) => {
				let chunkPos = 0;
				let endPos = pos + chunk.length;

				// Skip over when it has been replaced
				if (replacmentEnd > pos) {
					// Skip over the whole chunk
					if (replacmentEnd >= endPos) {
						const line = generatedLine + generatedLineOffset;
						if (chunk.endsWith("\n")) {
							generatedLineOffset--;
							if (generatedColumnOffsetLine === line) {
								// undo exiting corrections form the current line
								generatedColumnOffset += generatedColumn;
							}
						} else if (generatedColumnOffsetLine === line) {
							generatedColumnOffset -= chunk.length;
						} else {
							generatedColumnOffset = -chunk.length;
							generatedColumnOffsetLine = line;
						}
						pos = endPos;
						return;
					}

					// Partially skip over chunk
					chunkPos = replacmentEnd - pos;
					if (
						checkOriginalContent(
							sourceIndex,
							originalLine,
							originalColumn,
							chunk.slice(0, chunkPos)
						)
					) {
						originalColumn += chunkPos;
					}
					pos += chunkPos;
					const line = generatedLine + generatedLineOffset;
					if (generatedColumnOffsetLine === line) {
						generatedColumnOffset -= chunkPos;
					} else {
						generatedColumnOffset = -chunkPos;
						generatedColumnOffsetLine = line;
					}
					generatedColumn += chunkPos;
				}

				// Is a replacement in the chunk?
				if (nextReplacement < endPos) {
					do {
						let line = generatedLine + generatedLineOffset;
						if (nextReplacement > pos) {
							// Emit chunk until replacement
							const offset = nextReplacement - pos;
							const chunkSlice = chunk.slice(chunkPos, chunkPos + offset);
							onChunk(
								chunkSlice,
								line,
								generatedColumn +
									(line === generatedColumnOffsetLine
										? generatedColumnOffset
										: 0),
								sourceIndex,
								originalLine,
								originalColumn,
								nameIndex < 0 || nameIndex >= nameIndexMapping.length
									? -1
									: nameIndexMapping[nameIndex]
							);
							generatedColumn += offset;
							chunkPos += offset;
							pos = nextReplacement;
							if (
								checkOriginalContent(
									sourceIndex,
									originalLine,
									originalColumn,
									chunkSlice
								)
							) {
								originalColumn += chunkSlice.length;
							}
						}

						// Insert replacement content splitted into chunks by lines
						const { content, name } = repls[i];
						let matches = splitIntoLines(content);
						let replacementNameIndex = nameIndex;
						if (sourceIndex >= 0 && name) {
							let globalIndex = nameMapping.get(name);
							if (globalIndex === undefined) {
								globalIndex = nameMapping.size;
								nameMapping.set(name, globalIndex);
								onName(globalIndex, name);
							}
							replacementNameIndex = globalIndex;
						}
						for (let m = 0; m < matches.length; m++) {
							const contentLine = matches[m];
							onChunk(
								contentLine,
								line,
								generatedColumn +
									(line === generatedColumnOffsetLine
										? generatedColumnOffset
										: 0),
								sourceIndex,
								originalLine,
								originalColumn,
								replacementNameIndex
							);

							// Only the first chunk has name assigned
							replacementNameIndex = -1;

							if (m === matches.length - 1 && !contentLine.endsWith("\n")) {
								if (generatedColumnOffsetLine === line) {
									generatedColumnOffset += contentLine.length;
								} else {
									generatedColumnOffset = contentLine.length;
									generatedColumnOffsetLine = line;
								}
							} else {
								generatedLineOffset++;
								line++;
								generatedColumnOffset = -generatedColumn;
								generatedColumnOffsetLine = line;
							}
						}

						// Remove replaced content by settings this variable
						replacmentEnd = Math.max(
							replacmentEnd,
							Math.floor(repls[i].end + 1)
						);

						// Move to next replacment
						i++;
						nextReplacement =
							i < repls.length
								? Math.floor(repls[i].start)
								: MAX_SOURCE_POSITION;

						// Skip over when it has been replaced
						const offset = chunk.length - endPos + replacmentEnd - chunkPos;
						if (offset > 0) {
							// Skip over whole chunk
							if (replacmentEnd >= endPos) {
								let line = generatedLine + generatedLineOffset;
								if (chunk.endsWith("\n")) {
									generatedLineOffset--;
									if (generatedColumnOffsetLine === line) {
										// undo exiting corrections form the current line
										generatedColumnOffset += generatedColumn;
									}
								} else if (generatedColumnOffsetLine === line) {
									generatedColumnOffset -= chunk.length - chunkPos;
								} else {
									generatedColumnOffset = chunkPos - chunk.length;
									generatedColumnOffsetLine = line;
								}
								pos = endPos;
								return;
							}

							// Partially skip over chunk
							const line = generatedLine + generatedLineOffset;
							if (
								checkOriginalContent(
									sourceIndex,
									originalLine,
									originalColumn,
									chunk.slice(chunkPos, chunkPos + offset)
								)
							) {
								originalColumn += offset;
							}
							chunkPos += offset;
							pos += offset;
							if (generatedColumnOffsetLine === line) {
								generatedColumnOffset -= offset;
							} else {
								generatedColumnOffset = -offset;
								generatedColumnOffsetLine = line;
							}
							generatedColumn += offset;
						}
					} while (nextReplacement < endPos);
				}

				// Emit remaining chunk
				if (chunkPos < chunk.length) {
					const chunkSlice = chunkPos === 0 ? chunk : chunk.slice(chunkPos);
					const line = generatedLine + generatedLineOffset;
					onChunk(
						chunkSlice,
						line,
						generatedColumn +
							(line === generatedColumnOffsetLine ? generatedColumnOffset : 0),
						sourceIndex,
						originalLine,
						originalColumn,
						nameIndex < 0 ? -1 : nameIndexMapping[nameIndex]
					);
				}
				pos = endPos;
			},
			(sourceIndex, source, sourceContent) => {
				while (sourceContents.length < sourceIndex)
					sourceContents.push(undefined);
				sourceContents[sourceIndex] = sourceContent;
				onSource(sourceIndex, source, sourceContent);
			},
			(nameIndex, name) => {
				let globalIndex = nameMapping.get(name);
				if (globalIndex === undefined) {
					globalIndex = nameMapping.size;
					nameMapping.set(name, globalIndex);
					onName(globalIndex, name);
				}
				nameIndexMapping[nameIndex] = globalIndex;
			}
		);

		// Handle remaining replacements
		let remainer = "";
		for (; i < repls.length; i++) {
			remainer += repls[i].content;
		}

		// Insert remaining replacements content splitted into chunks by lines
		let line = generatedLine + generatedLineOffset;
		let matches = splitIntoLines(remainer);
		for (let m = 0; m < matches.length; m++) {
			const contentLine = matches[m];
			onChunk(
				contentLine,
				line,
				generatedColumn +
					(line === generatedColumnOffsetLine ? generatedColumnOffset : 0),
				-1,
				-1,
				-1,
				-1
			);

			if (m === matches.length - 1 && !contentLine.endsWith("\n")) {
				if (generatedColumnOffsetLine === line) {
					generatedColumnOffset += contentLine.length;
				} else {
					generatedColumnOffset = contentLine.length;
					generatedColumnOffsetLine = line;
				}
			} else {
				generatedLineOffset++;
				line++;
				generatedColumnOffset = -generatedColumn;
				generatedColumnOffsetLine = line;
			}
		}

		return {
			generatedLine: line,
			generatedColumn:
				generatedColumn +
				(line === generatedColumnOffsetLine ? generatedColumnOffset : 0)
		};
	}

	updateHash(hash) {
		this._sortReplacements();
		hash.update("ReplaceSource");
		this._source.updateHash(hash);
		hash.update(this._name || "");
		for (const repl of this._replacements) {
			hash.update(`${repl.start}${repl.end}${repl.content}${repl.name}`);
		}
	}
}

module.exports = ReplaceSource;
