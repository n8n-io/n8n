/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");

class SizeOnlySource extends Source {
	constructor(size) {
		super();
		this._size = size;
	}

	_error() {
		return new Error(
			"Content and Map of this Source is not available (only size() is supported)"
		);
	}

	size() {
		return this._size;
	}

	source() {
		throw this._error();
	}

	buffer() {
		throw this._error();
	}

	map(options) {
		throw this._error();
	}

	updateHash() {
		throw this._error();
	}
}

module.exports = SizeOnlySource;
