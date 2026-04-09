'use strict';

var utilBase64 = require('@smithy/util-base64');
var utilUtf8 = require('@smithy/util-utf8');
var ChecksumStream = require('./checksum/ChecksumStream');
var createChecksumStream = require('./checksum/createChecksumStream');
var createBufferedReadable = require('./createBufferedReadable');
var getAwsChunkedEncodingStream = require('./getAwsChunkedEncodingStream');
var headStream = require('./headStream');
var sdkStreamMixin = require('./sdk-stream-mixin');
var splitStream = require('./splitStream');
var streamTypeCheck = require('./stream-type-check');

class Uint8ArrayBlobAdapter extends Uint8Array {
    static fromString(source, encoding = "utf-8") {
        if (typeof source === "string") {
            if (encoding === "base64") {
                return Uint8ArrayBlobAdapter.mutate(utilBase64.fromBase64(source));
            }
            return Uint8ArrayBlobAdapter.mutate(utilUtf8.fromUtf8(source));
        }
        throw new Error(`Unsupported conversion from ${typeof source} to Uint8ArrayBlobAdapter.`);
    }
    static mutate(source) {
        Object.setPrototypeOf(source, Uint8ArrayBlobAdapter.prototype);
        return source;
    }
    transformToString(encoding = "utf-8") {
        if (encoding === "base64") {
            return utilBase64.toBase64(this);
        }
        return utilUtf8.toUtf8(this);
    }
}

exports.isBlob = streamTypeCheck.isBlob;
exports.isReadableStream = streamTypeCheck.isReadableStream;
exports.Uint8ArrayBlobAdapter = Uint8ArrayBlobAdapter;
Object.prototype.hasOwnProperty.call(ChecksumStream, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: ChecksumStream['__proto__']
    });

Object.keys(ChecksumStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = ChecksumStream[k];
});
Object.prototype.hasOwnProperty.call(createChecksumStream, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: createChecksumStream['__proto__']
    });

Object.keys(createChecksumStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = createChecksumStream[k];
});
Object.prototype.hasOwnProperty.call(createBufferedReadable, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: createBufferedReadable['__proto__']
    });

Object.keys(createBufferedReadable).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = createBufferedReadable[k];
});
Object.prototype.hasOwnProperty.call(getAwsChunkedEncodingStream, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: getAwsChunkedEncodingStream['__proto__']
    });

Object.keys(getAwsChunkedEncodingStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = getAwsChunkedEncodingStream[k];
});
Object.prototype.hasOwnProperty.call(headStream, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: headStream['__proto__']
    });

Object.keys(headStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = headStream[k];
});
Object.prototype.hasOwnProperty.call(sdkStreamMixin, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: sdkStreamMixin['__proto__']
    });

Object.keys(sdkStreamMixin).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = sdkStreamMixin[k];
});
Object.prototype.hasOwnProperty.call(splitStream, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: splitStream['__proto__']
    });

Object.keys(splitStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = splitStream[k];
});
