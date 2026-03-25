/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const streamChunksOfSourceMap = require("./helpers/streamChunksOfSourceMap");
const streamChunksOfRawSource = require("./helpers/streamChunksOfRawSource");
const streamAndGetSourceAndMap = require("./helpers/streamAndGetSourceAndMap");

const mapToBufferedMap = map => {
	if (typeof map !== "object" || !map) return map;
	const bufferedMap = Object.assign({}, map);
	if (map.mappings) {
		bufferedMap.mappings = Buffer.from(map.mappings, "utf-8");
	}
	if (map.sourcesContent) {
		bufferedMap.sourcesContent = map.sourcesContent.map(
			str => str && Buffer.from(str, "utf-8")
		);
	}
	return bufferedMap;
};

const bufferedMapToMap = bufferedMap => {
	if (typeof bufferedMap !== "object" || !bufferedMap) return bufferedMap;
	const map = Object.assign({}, bufferedMap);
	if (bufferedMap.mappings) {
		map.mappings = bufferedMap.mappings.toString("utf-8");
	}
	if (bufferedMap.sourcesContent) {
		map.sourcesContent = bufferedMap.sourcesContent.map(
			buffer => buffer && buffer.toString("utf-8")
		);
	}
	return map;
};

class CachedSource extends Source {
	constructor(source, cachedData) {
		super();
		this._source = source;
		this._cachedSourceType = cachedData ? cachedData.source : undefined;
		this._cachedSource = undefined;
		this._cachedBuffer = cachedData ? cachedData.buffer : undefined;
		this._cachedSize = cachedData ? cachedData.size : undefined;
		this._cachedMaps = cachedData ? cachedData.maps : new Map();
		this._cachedHashUpdate = cachedData ? cachedData.hash : undefined;
	}

	getCachedData() {
		const bufferedMaps = new Map();
		for (const pair of this._cachedMaps) {
			let cacheEntry = pair[1];
			if (cacheEntry.bufferedMap === undefined) {
				cacheEntry.bufferedMap = mapToBufferedMap(
					this._getMapFromCacheEntry(cacheEntry)
				);
			}
			bufferedMaps.set(pair[0], {
				map: undefined,
				bufferedMap: cacheEntry.bufferedMap
			});
		}
		// We don't want to cache strings
		// So if we have a caches sources
		// create a buffer from it and only store
		// if it was a Buffer or string
		if (this._cachedSource) {
			this.buffer();
		}
		return {
			buffer: this._cachedBuffer,
			source:
				this._cachedSourceType !== undefined
					? this._cachedSourceType
					: typeof this._cachedSource === "string"
					? true
					: Buffer.isBuffer(this._cachedSource)
					? false
					: undefined,
			size: this._cachedSize,
			maps: bufferedMaps,
			hash: this._cachedHashUpdate
		};
	}

	originalLazy() {
		return this._source;
	}

	original() {
		if (typeof this._source === "function") this._source = this._source();
		return this._source;
	}

	source() {
		const source = this._getCachedSource();
		if (source !== undefined) return source;
		return (this._cachedSource = this.original().source());
	}

	_getMapFromCacheEntry(cacheEntry) {
		if (cacheEntry.map !== undefined) {
			return cacheEntry.map;
		} else if (cacheEntry.bufferedMap !== undefined) {
			return (cacheEntry.map = bufferedMapToMap(cacheEntry.bufferedMap));
		}
	}

	_getCachedSource() {
		if (this._cachedSource !== undefined) return this._cachedSource;
		if (this._cachedBuffer && this._cachedSourceType !== undefined) {
			return (this._cachedSource = this._cachedSourceType
				? this._cachedBuffer.toString("utf-8")
				: this._cachedBuffer);
		}
	}

	buffer() {
		if (this._cachedBuffer !== undefined) return this._cachedBuffer;
		if (this._cachedSource !== undefined) {
			if (Buffer.isBuffer(this._cachedSource)) {
				return (this._cachedBuffer = this._cachedSource);
			}
			return (this._cachedBuffer = Buffer.from(this._cachedSource, "utf-8"));
		}
		if (typeof this.original().buffer === "function") {
			return (this._cachedBuffer = this.original().buffer());
		}
		const bufferOrString = this.source();
		if (Buffer.isBuffer(bufferOrString)) {
			return (this._cachedBuffer = bufferOrString);
		}
		return (this._cachedBuffer = Buffer.from(bufferOrString, "utf-8"));
	}

	size() {
		if (this._cachedSize !== undefined) return this._cachedSize;
		if (this._cachedBuffer !== undefined) {
			return (this._cachedSize = this._cachedBuffer.length);
		}
		const source = this._getCachedSource();
		if (source !== undefined) {
			return (this._cachedSize = Buffer.byteLength(source));
		}
		return (this._cachedSize = this.original().size());
	}

	sourceAndMap(options) {
		const key = options ? JSON.stringify(options) : "{}";
		const cacheEntry = this._cachedMaps.get(key);
		// Look for a cached map
		if (cacheEntry !== undefined) {
			// We have a cached map in some representation
			const map = this._getMapFromCacheEntry(cacheEntry);
			// Either get the cached source or compute it
			return { source: this.source(), map };
		}
		// Look for a cached source
		let source = this._getCachedSource();
		// Compute the map
		let map;
		if (source !== undefined) {
			map = this.original().map(options);
		} else {
			// Compute the source and map together.
			const sourceAndMap = this.original().sourceAndMap(options);
			source = sourceAndMap.source;
			map = sourceAndMap.map;
			this._cachedSource = source;
		}
		this._cachedMaps.set(key, {
			map,
			bufferedMap: undefined
		});
		return { source, map };
	}

	streamChunks(options, onChunk, onSource, onName) {
		const key = options ? JSON.stringify(options) : "{}";
		if (
			this._cachedMaps.has(key) &&
			(this._cachedBuffer !== undefined || this._cachedSource !== undefined)
		) {
			const { source, map } = this.sourceAndMap(options);
			if (map) {
				return streamChunksOfSourceMap(
					source,
					map,
					onChunk,
					onSource,
					onName,
					!!(options && options.finalSource),
					true
				);
			} else {
				return streamChunksOfRawSource(
					source,
					onChunk,
					onSource,
					onName,
					!!(options && options.finalSource)
				);
			}
		}
		const { result, source, map } = streamAndGetSourceAndMap(
			this.original(),
			options,
			onChunk,
			onSource,
			onName
		);
		this._cachedSource = source;
		this._cachedMaps.set(key, {
			map,
			bufferedMap: undefined
		});
		return result;
	}

	map(options) {
		const key = options ? JSON.stringify(options) : "{}";
		const cacheEntry = this._cachedMaps.get(key);
		if (cacheEntry !== undefined) {
			return this._getMapFromCacheEntry(cacheEntry);
		}
		const map = this.original().map(options);
		this._cachedMaps.set(key, {
			map,
			bufferedMap: undefined
		});
		return map;
	}

	updateHash(hash) {
		if (this._cachedHashUpdate !== undefined) {
			for (const item of this._cachedHashUpdate) hash.update(item);
			return;
		}
		const update = [];
		let currentString = undefined;
		const tracker = {
			update: item => {
				if (typeof item === "string" && item.length < 10240) {
					if (currentString === undefined) {
						currentString = item;
					} else {
						currentString += item;
						if (currentString.length > 102400) {
							update.push(Buffer.from(currentString));
							currentString = undefined;
						}
					}
				} else {
					if (currentString !== undefined) {
						update.push(Buffer.from(currentString));
						currentString = undefined;
					}
					update.push(item);
				}
			}
		};
		this.original().updateHash(tracker);
		if (currentString !== undefined) {
			update.push(Buffer.from(currentString));
		}
		for (const item of update) hash.update(item);
		this._cachedHashUpdate = update;
	}
}

module.exports = CachedSource;
