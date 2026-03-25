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

exports.Uint8ArrayBlobAdapter = Uint8ArrayBlobAdapter;
Object.keys(ChecksumStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return ChecksumStream[k]; }
    });
});
Object.keys(createChecksumStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return createChecksumStream[k]; }
    });
});
Object.keys(createBufferedReadable).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return createBufferedReadable[k]; }
    });
});
Object.keys(getAwsChunkedEncodingStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return getAwsChunkedEncodingStream[k]; }
    });
});
Object.keys(headStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return headStream[k]; }
    });
});
Object.keys(sdkStreamMixin).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return sdkStreamMixin[k]; }
    });
});
Object.keys(splitStream).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return splitStream[k]; }
    });
});
Object.keys(streamTypeCheck).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return streamTypeCheck[k]; }
    });
});
