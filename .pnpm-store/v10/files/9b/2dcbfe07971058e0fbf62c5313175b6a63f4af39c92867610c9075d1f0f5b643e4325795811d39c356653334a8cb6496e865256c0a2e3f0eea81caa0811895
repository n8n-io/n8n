/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const streamChunksOfSourceMap = require("./helpers/streamChunksOfSourceMap");
const streamChunksOfCombinedSourceMap = require("./helpers/streamChunksOfCombinedSourceMap");
const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");

class SourceMapSource extends Source {
	constructor(
		value,
		name,
		sourceMap,
		originalSource,
		innerSourceMap,
		removeOriginalSource
	) {
		super();
		const valueIsBuffer = Buffer.isBuffer(value);
		this._valueAsString = valueIsBuffer ? undefined : value;
		this._valueAsBuffer = valueIsBuffer ? value : undefined;

		this._name = name;

		this._hasSourceMap = !!sourceMap;
		const sourceMapIsBuffer = Buffer.isBuffer(sourceMap);
		const sourceMapIsString = typeof sourceMap === "string";
		this._sourceMapAsObject =
			sourceMapIsBuffer || sourceMapIsString ? undefined : sourceMap;
		this._sourceMapAsString = sourceMapIsString ? sourceMap : undefined;
		this._sourceMapAsBuffer = sourceMapIsBuffer ? sourceMap : undefined;

		this._hasOriginalSource = !!originalSource;
		const originalSourceIsBuffer = Buffer.isBuffer(originalSource);
		this._originalSourceAsString = originalSourceIsBuffer
			? undefined
			: originalSource;
		this._originalSourceAsBuffer = originalSourceIsBuffer
			? originalSource
			: undefined;

		this._hasInnerSourceMap = !!innerSourceMap;
		const innerSourceMapIsBuffer = Buffer.isBuffer(innerSourceMap);
		const innerSourceMapIsString = typeof innerSourceMap === "string";
		this._innerSourceMapAsObject =
			innerSourceMapIsBuffer || innerSourceMapIsString
				? undefined
				: innerSourceMap;
		this._innerSourceMapAsString = innerSourceMapIsString
			? innerSourceMap
			: undefined;
		this._innerSourceMapAsBuffer = innerSourceMapIsBuffer
			? innerSourceMap
			: undefined;

		this._removeOriginalSource = removeOriginalSource;
	}

	_ensureValueBuffer() {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._valueAsString, "utf-8");
		}
	}

	_ensureValueString() {
		if (this._valueAsString === undefined) {
			this._valueAsString = this._valueAsBuffer.toString("utf-8");
		}
	}

	_ensureOriginalSourceBuffer() {
		if (this._originalSourceAsBuffer === undefined && this._hasOriginalSource) {
			this._originalSourceAsBuffer = Buffer.from(
				this._originalSourceAsString,
				"utf-8"
			);
		}
	}

	_ensureOriginalSourceString() {
		if (this._originalSourceAsString === undefined && this._hasOriginalSource) {
			this._originalSourceAsString = this._originalSourceAsBuffer.toString(
				"utf-8"
			);
		}
	}

	_ensureInnerSourceMapObject() {
		if (this._innerSourceMapAsObject === undefined && this._hasInnerSourceMap) {
			this._ensureInnerSourceMapString();
			this._innerSourceMapAsObject = JSON.parse(this._innerSourceMapAsString);
		}
	}

	_ensureInnerSourceMapBuffer() {
		if (this._innerSourceMapAsBuffer === undefined && this._hasInnerSourceMap) {
			this._ensureInnerSourceMapString();
			this._innerSourceMapAsBuffer = Buffer.from(
				this._innerSourceMapAsString,
				"utf-8"
			);
		}
	}

	_ensureInnerSourceMapString() {
		if (this._innerSourceMapAsString === undefined && this._hasInnerSourceMap) {
			if (this._innerSourceMapAsBuffer !== undefined) {
				this._innerSourceMapAsString = this._innerSourceMapAsBuffer.toString(
					"utf-8"
				);
			} else {
				this._innerSourceMapAsString = JSON.stringify(
					this._innerSourceMapAsObject
				);
			}
		}
	}

	_ensureSourceMapObject() {
		if (this._sourceMapAsObject === undefined) {
			this._ensureSourceMapString();
			this._sourceMapAsObject = JSON.parse(this._sourceMapAsString);
		}
	}

	_ensureSourceMapBuffer() {
		if (this._sourceMapAsBuffer === undefined) {
			this._ensureSourceMapString();
			this._sourceMapAsBuffer = Buffer.from(this._sourceMapAsString, "utf-8");
		}
	}

	_ensureSourceMapString() {
		if (this._sourceMapAsString === undefined) {
			if (this._sourceMapAsBuffer !== undefined) {
				this._sourceMapAsString = this._sourceMapAsBuffer.toString("utf-8");
			} else {
				this._sourceMapAsString = JSON.stringify(this._sourceMapAsObject);
			}
		}
	}

	getArgsAsBuffers() {
		this._ensureValueBuffer();
		this._ensureSourceMapBuffer();
		this._ensureOriginalSourceBuffer();
		this._ensureInnerSourceMapBuffer();
		return [
			this._valueAsBuffer,
			this._name,
			this._sourceMapAsBuffer,
			this._originalSourceAsBuffer,
			this._innerSourceMapAsBuffer,
			this._removeOriginalSource
		];
	}

	buffer() {
		this._ensureValueBuffer();
		return this._valueAsBuffer;
	}

	source() {
		this._ensureValueString();
		return this._valueAsString;
	}

	map(options) {
		if (!this._hasInnerSourceMap) {
			this._ensureSourceMapObject();
			return this._sourceMapAsObject;
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (!this._hasInnerSourceMap) {
			this._ensureValueString();
			this._ensureSourceMapObject();
			return {
				source: this._valueAsString,
				map: this._sourceMapAsObject
			};
		}
		return getSourceAndMap(this, options);
	}

	streamChunks(options, onChunk, onSource, onName) {
		this._ensureValueString();
		this._ensureSourceMapObject();
		this._ensureOriginalSourceString();
		if (this._hasInnerSourceMap) {
			this._ensureInnerSourceMapObject();
			return streamChunksOfCombinedSourceMap(
				this._valueAsString,
				this._sourceMapAsObject,
				this._name,
				this._originalSourceAsString,
				this._innerSourceMapAsObject,
				this._removeOriginalSource,
				onChunk,
				onSource,
				onName,
				!!(options && options.finalSource),
				!!(options && options.columns !== false)
			);
		} else {
			return streamChunksOfSourceMap(
				this._valueAsString,
				this._sourceMapAsObject,
				onChunk,
				onSource,
				onName,
				!!(options && options.finalSource),
				!!(options && options.columns !== false)
			);
		}
	}

	updateHash(hash) {
		this._ensureValueBuffer();
		this._ensureSourceMapBuffer();
		this._ensureOriginalSourceBuffer();
		this._ensureInnerSourceMapBuffer();

		hash.update("SourceMapSource");

		hash.update(this._valueAsBuffer);

		hash.update(this._sourceMapAsBuffer);

		if (this._hasOriginalSource) {
			hash.update(this._originalSourceAsBuffer);
		}

		if (this._hasInnerSourceMap) {
			hash.update(this._innerSourceMapAsBuffer);
		}

		hash.update(this._removeOriginalSource ? "true" : "false");
	}
}

module.exports = SourceMapSource;
