/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");

class CompatSource extends Source {
	static from(sourceLike) {
		return sourceLike instanceof Source
			? sourceLike
			: new CompatSource(sourceLike);
	}

	constructor(sourceLike) {
		super();
		this._sourceLike = sourceLike;
	}

	source() {
		return this._sourceLike.source();
	}

	buffer() {
		if (typeof this._sourceLike.buffer === "function") {
			return this._sourceLike.buffer();
		}
		return super.buffer();
	}

	size() {
		if (typeof this._sourceLike.size === "function") {
			return this._sourceLike.size();
		}
		return super.size();
	}

	map(options) {
		if (typeof this._sourceLike.map === "function") {
			return this._sourceLike.map(options);
		}
		return super.map(options);
	}

	sourceAndMap(options) {
		if (typeof this._sourceLike.sourceAndMap === "function") {
			return this._sourceLike.sourceAndMap(options);
		}
		return super.sourceAndMap(options);
	}

	updateHash(hash) {
		if (typeof this._sourceLike.updateHash === "function") {
			return this._sourceLike.updateHash(hash);
		}
		if (typeof this._sourceLike.map === "function") {
			throw new Error(
				"A Source-like object with a 'map' method must also provide an 'updateHash' method"
			);
		}
		hash.update(this.buffer());
	}
}

module.exports = CompatSource;
