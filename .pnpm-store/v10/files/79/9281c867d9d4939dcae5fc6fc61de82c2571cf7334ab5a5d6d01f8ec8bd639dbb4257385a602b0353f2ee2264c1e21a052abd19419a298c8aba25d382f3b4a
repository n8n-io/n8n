'use strict';

var utilBufferFrom = require('@smithy/util-buffer-from');
var utilUtf8 = require('@smithy/util-utf8');
var buffer = require('buffer');
var crypto = require('crypto');

class Hash {
    algorithmIdentifier;
    secret;
    hash;
    constructor(algorithmIdentifier, secret) {
        this.algorithmIdentifier = algorithmIdentifier;
        this.secret = secret;
        this.reset();
    }
    update(toHash, encoding) {
        this.hash.update(utilUtf8.toUint8Array(castSourceData(toHash, encoding)));
    }
    digest() {
        return Promise.resolve(this.hash.digest());
    }
    reset() {
        this.hash = this.secret
            ? crypto.createHmac(this.algorithmIdentifier, castSourceData(this.secret))
            : crypto.createHash(this.algorithmIdentifier);
    }
}
function castSourceData(toCast, encoding) {
    if (buffer.Buffer.isBuffer(toCast)) {
        return toCast;
    }
    if (typeof toCast === "string") {
        return utilBufferFrom.fromString(toCast, encoding);
    }
    if (ArrayBuffer.isView(toCast)) {
        return utilBufferFrom.fromArrayBuffer(toCast.buffer, toCast.byteOffset, toCast.byteLength);
    }
    return utilBufferFrom.fromArrayBuffer(toCast);
}

exports.Hash = Hash;
