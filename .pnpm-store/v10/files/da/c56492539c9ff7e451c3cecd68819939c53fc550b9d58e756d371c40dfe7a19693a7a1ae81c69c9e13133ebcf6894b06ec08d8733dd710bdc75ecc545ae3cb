'use strict';

var fs = require('fs');
var utilUtf8 = require('@smithy/util-utf8');
var stream = require('stream');

class HashCalculator extends stream.Writable {
    hash;
    constructor(hash, options) {
        super(options);
        this.hash = hash;
    }
    _write(chunk, encoding, callback) {
        try {
            this.hash.update(utilUtf8.toUint8Array(chunk));
        }
        catch (err) {
            return callback(err);
        }
        callback();
    }
}

const fileStreamHasher = (hashCtor, fileStream) => new Promise((resolve, reject) => {
    if (!isReadStream(fileStream)) {
        reject(new Error("Unable to calculate hash for non-file streams."));
        return;
    }
    const fileStreamTee = fs.createReadStream(fileStream.path, {
        start: fileStream.start,
        end: fileStream.end,
    });
    const hash = new hashCtor();
    const hashCalculator = new HashCalculator(hash);
    fileStreamTee.pipe(hashCalculator);
    fileStreamTee.on("error", (err) => {
        hashCalculator.end();
        reject(err);
    });
    hashCalculator.on("error", reject);
    hashCalculator.on("finish", function () {
        hash.digest().then(resolve).catch(reject);
    });
});
const isReadStream = (stream) => typeof stream.path === "string";

const readableStreamHasher = (hashCtor, readableStream) => {
    if (readableStream.readableFlowing !== null) {
        throw new Error("Unable to calculate hash for flowing readable stream");
    }
    const hash = new hashCtor();
    const hashCalculator = new HashCalculator(hash);
    readableStream.pipe(hashCalculator);
    return new Promise((resolve, reject) => {
        readableStream.on("error", (err) => {
            hashCalculator.end();
            reject(err);
        });
        hashCalculator.on("error", reject);
        hashCalculator.on("finish", () => {
            hash.digest().then(resolve).catch(reject);
        });
    });
};

exports.fileStreamHasher = fileStreamHasher;
exports.readableStreamHasher = readableStreamHasher;
