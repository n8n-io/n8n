'use strict';

var Buffer = require('safe-buffer').Buffer;
var Transform = require('stream').Transform;
var StringDecoder = require('string_decoder').StringDecoder;
var inherits = require('inherits');

function CipherBase(hashMode) {
	Transform.call(this);
	this.hashMode = typeof hashMode === 'string';
	if (this.hashMode) {
		this[hashMode] = this._finalOrDigest;
	} else {
		this['final'] = this._finalOrDigest;
	}
	if (this._final) {
		this.__final = this._final;
		this._final = null;
	}
	this._decoder = null;
	this._encoding = null;
}
inherits(CipherBase, Transform);

var useUint8Array = typeof Uint8Array !== 'undefined';
var useArrayBuffer = typeof ArrayBuffer !== 'undefined'
	&& typeof Uint8Array !== 'undefined'
	&& ArrayBuffer.isView
	&& (Buffer.prototype instanceof Uint8Array || Buffer.TYPED_ARRAY_SUPPORT);

function toBuffer(data, encoding) {
	/*
	 * No need to do anything for exact instance
	 * This is only valid when safe-buffer.Buffer === buffer.Buffer, i.e. when Buffer.from/Buffer.alloc existed
	 */
	if (data instanceof Buffer) {
		return data;
	}

	// Convert strings to Buffer
	if (typeof data === 'string') {
		return Buffer.from(data, encoding);
	}

	/*
	 * Wrap any TypedArray instances and DataViews
	 * Makes sense only on engines with full TypedArray support -- let Buffer detect that
	 */
	if (useArrayBuffer && ArrayBuffer.isView(data)) {
		// Bug in Node.js <6.3.1, which treats this as out-of-bounds
		if (data.byteLength === 0) {
			return Buffer.alloc(0);
		}

		var res = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
		/*
		 * Recheck result size, as offset/length doesn't work on Node.js <5.10
		 * We just go to Uint8Array case if this fails
		 */
		if (res.byteLength === data.byteLength) {
			return res;
		}
	}

	/*
	 * Uint8Array in engines where Buffer.from might not work with ArrayBuffer, just copy over
	 * Doesn't make sense with other TypedArray instances
	 */
	if (useUint8Array && data instanceof Uint8Array) {
		return Buffer.from(data);
	}

	/*
	 * Old Buffer polyfill on an engine that doesn't have TypedArray support
	 * Also, this is from a different Buffer polyfill implementation then we have, as instanceof check failed
	 * Convert to our current Buffer implementation
	 */
	if (
		Buffer.isBuffer(data)
			&& data.constructor
			&& typeof data.constructor.isBuffer === 'function'
			&& data.constructor.isBuffer(data)
	) {
		return Buffer.from(data);
	}

	throw new TypeError('The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView.');
}

CipherBase.prototype.update = function (data, inputEnc, outputEnc) {
	var bufferData = toBuffer(data, inputEnc); // asserts correct input type
	var outData = this._update(bufferData);
	if (this.hashMode) {
		return this;
	}

	if (outputEnc) {
		outData = this._toString(outData, outputEnc);
	}

	return outData;
};

CipherBase.prototype.setAutoPadding = function () {};
CipherBase.prototype.getAuthTag = function () {
	throw new Error('trying to get auth tag in unsupported state');
};

CipherBase.prototype.setAuthTag = function () {
	throw new Error('trying to set auth tag in unsupported state');
};

CipherBase.prototype.setAAD = function () {
	throw new Error('trying to set aad in unsupported state');
};

CipherBase.prototype._transform = function (data, _, next) {
	var err;
	try {
		if (this.hashMode) {
			this._update(data);
		} else {
			this.push(this._update(data));
		}
	} catch (e) {
		err = e;
	} finally {
		next(err);
	}
};
CipherBase.prototype._flush = function (done) {
	var err;
	try {
		this.push(this.__final());
	} catch (e) {
		err = e;
	}

	done(err);
};
CipherBase.prototype._finalOrDigest = function (outputEnc) {
	var outData = this.__final() || Buffer.alloc(0);
	if (outputEnc) {
		outData = this._toString(outData, outputEnc, true);
	}
	return outData;
};

CipherBase.prototype._toString = function (value, enc, fin) {
	if (!this._decoder) {
		this._decoder = new StringDecoder(enc);
		this._encoding = enc;
	}

	if (this._encoding !== enc) {
		throw new Error('can’t switch encodings');
	}

	var out = this._decoder.write(value);
	if (fin) {
		out += this._decoder.end();
	}

	return out;
};

module.exports = CipherBase;
