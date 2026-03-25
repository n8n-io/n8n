/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const RawSource = require("./RawSource");
const streamChunks = require("./helpers/streamChunks");
const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");

const stringsAsRawSources = new WeakSet();

class ConcatSource extends Source {
	constructor() {
		super();
		this._children = [];
		for (let i = 0; i < arguments.length; i++) {
			const item = arguments[i];
			if (item instanceof ConcatSource) {
				for (const child of item._children) {
					this._children.push(child);
				}
			} else {
				this._children.push(item);
			}
		}
		this._isOptimized = arguments.length === 0;
	}

	getChildren() {
		if (!this._isOptimized) this._optimize();
		return this._children;
	}

	add(item) {
		if (item instanceof ConcatSource) {
			for (const child of item._children) {
				this._children.push(child);
			}
		} else {
			this._children.push(item);
		}
		this._isOptimized = false;
	}

	addAllSkipOptimizing(items) {
		for (const item of items) {
			this._children.push(item);
		}
	}

	buffer() {
		if (!this._isOptimized) this._optimize();
		const buffers = [];
		for (const child of this._children) {
			if (typeof child.buffer === "function") {
				buffers.push(child.buffer());
			} else {
				const bufferOrString = child.source();
				if (Buffer.isBuffer(bufferOrString)) {
					buffers.push(bufferOrString);
				} else {
					// This will not happen
					buffers.push(Buffer.from(bufferOrString, "utf-8"));
				}
			}
		}
		return Buffer.concat(buffers);
	}

	source() {
		if (!this._isOptimized) this._optimize();
		let source = "";
		for (const child of this._children) {
			source += child.source();
		}
		return source;
	}

	size() {
		if (!this._isOptimized) this._optimize();
		let size = 0;
		for (const child of this._children) {
			size += child.size();
		}
		return size;
	}

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	streamChunks(options, onChunk, onSource, onName) {
		if (!this._isOptimized) this._optimize();
		if (this._children.length === 1)
			return this._children[0].streamChunks(options, onChunk, onSource, onName);
		let currentLineOffset = 0;
		let currentColumnOffset = 0;
		let sourceMapping = new Map();
		let nameMapping = new Map();
		const finalSource = !!(options && options.finalSource);
		let code = "";
		let needToCloseMapping = false;
		for (const item of this._children) {
			const sourceIndexMapping = [];
			const nameIndexMapping = [];
			let lastMappingLine = 0;
			const { generatedLine, generatedColumn, source } = streamChunks(
				item,
				options,
				// eslint-disable-next-line no-loop-func
				(
					chunk,
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumn,
					nameIndex
				) => {
					const line = generatedLine + currentLineOffset;
					const column =
						generatedLine === 1
							? generatedColumn + currentColumnOffset
							: generatedColumn;
					if (needToCloseMapping) {
						if (generatedLine !== 1 || generatedColumn !== 0) {
							onChunk(
								undefined,
								currentLineOffset + 1,
								currentColumnOffset,
								-1,
								-1,
								-1,
								-1
							);
						}
						needToCloseMapping = false;
					}
					const resultSourceIndex =
						sourceIndex < 0 || sourceIndex >= sourceIndexMapping.length
							? -1
							: sourceIndexMapping[sourceIndex];
					const resultNameIndex =
						nameIndex < 0 || nameIndex >= nameIndexMapping.length
							? -1
							: nameIndexMapping[nameIndex];
					lastMappingLine = resultSourceIndex < 0 ? 0 : generatedLine;
					if (finalSource) {
						if (chunk !== undefined) code += chunk;
						if (resultSourceIndex >= 0) {
							onChunk(
								undefined,
								line,
								column,
								resultSourceIndex,
								originalLine,
								originalColumn,
								resultNameIndex
							);
						}
					} else {
						if (resultSourceIndex < 0) {
							onChunk(chunk, line, column, -1, -1, -1, -1);
						} else {
							onChunk(
								chunk,
								line,
								column,
								resultSourceIndex,
								originalLine,
								originalColumn,
								resultNameIndex
							);
						}
					}
				},
				(i, source, sourceContent) => {
					let globalIndex = sourceMapping.get(source);
					if (globalIndex === undefined) {
						sourceMapping.set(source, (globalIndex = sourceMapping.size));
						onSource(globalIndex, source, sourceContent);
					}
					sourceIndexMapping[i] = globalIndex;
				},
				(i, name) => {
					let globalIndex = nameMapping.get(name);
					if (globalIndex === undefined) {
						nameMapping.set(name, (globalIndex = nameMapping.size));
						onName(globalIndex, name);
					}
					nameIndexMapping[i] = globalIndex;
				}
			);
			if (source !== undefined) code += source;
			if (needToCloseMapping) {
				if (generatedLine !== 1 || generatedColumn !== 0) {
					onChunk(
						undefined,
						currentLineOffset + 1,
						currentColumnOffset,
						-1,
						-1,
						-1,
						-1
					);
					needToCloseMapping = false;
				}
			}
			if (generatedLine > 1) {
				currentColumnOffset = generatedColumn;
			} else {
				currentColumnOffset += generatedColumn;
			}
			needToCloseMapping =
				needToCloseMapping ||
				(finalSource && lastMappingLine === generatedLine);
			currentLineOffset += generatedLine - 1;
		}
		return {
			generatedLine: currentLineOffset + 1,
			generatedColumn: currentColumnOffset,
			source: finalSource ? code : undefined
		};
	}

	updateHash(hash) {
		if (!this._isOptimized) this._optimize();
		hash.update("ConcatSource");
		for (const item of this._children) {
			item.updateHash(hash);
		}
	}

	_optimize() {
		const newChildren = [];
		let currentString = undefined;
		let currentRawSources = undefined;
		const addStringToRawSources = string => {
			if (currentRawSources === undefined) {
				currentRawSources = string;
			} else if (Array.isArray(currentRawSources)) {
				currentRawSources.push(string);
			} else {
				currentRawSources = [
					typeof currentRawSources === "string"
						? currentRawSources
						: currentRawSources.source(),
					string
				];
			}
		};
		const addSourceToRawSources = source => {
			if (currentRawSources === undefined) {
				currentRawSources = source;
			} else if (Array.isArray(currentRawSources)) {
				currentRawSources.push(source.source());
			} else {
				currentRawSources = [
					typeof currentRawSources === "string"
						? currentRawSources
						: currentRawSources.source(),
					source.source()
				];
			}
		};
		const mergeRawSources = () => {
			if (Array.isArray(currentRawSources)) {
				const rawSource = new RawSource(currentRawSources.join(""));
				stringsAsRawSources.add(rawSource);
				newChildren.push(rawSource);
			} else if (typeof currentRawSources === "string") {
				const rawSource = new RawSource(currentRawSources);
				stringsAsRawSources.add(rawSource);
				newChildren.push(rawSource);
			} else {
				newChildren.push(currentRawSources);
			}
		};
		for (const child of this._children) {
			if (typeof child === "string") {
				if (currentString === undefined) {
					currentString = child;
				} else {
					currentString += child;
				}
			} else {
				if (currentString !== undefined) {
					addStringToRawSources(currentString);
					currentString = undefined;
				}
				if (stringsAsRawSources.has(child)) {
					addSourceToRawSources(child);
				} else {
					if (currentRawSources !== undefined) {
						mergeRawSources();
						currentRawSources = undefined;
					}
					newChildren.push(child);
				}
			}
		}
		if (currentString !== undefined) {
			addStringToRawSources(currentString);
		}
		if (currentRawSources !== undefined) {
			mergeRawSources();
		}
		this._children = newChildren;
		this._isOptimized = true;
	}
}

module.exports = ConcatSource;
