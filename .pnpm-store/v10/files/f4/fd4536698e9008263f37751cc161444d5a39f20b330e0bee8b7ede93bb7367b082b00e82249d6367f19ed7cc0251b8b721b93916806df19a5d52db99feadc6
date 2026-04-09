'use strict';

var chunkedBlobReader = require('@smithy/chunked-blob-reader');

const blobHasher = async function blobHasher(hashCtor, blob) {
    const hash = new hashCtor();
    await chunkedBlobReader.blobReader(blob, (chunk) => {
        hash.update(chunk);
    });
    return hash.digest();
};

exports.blobHasher = blobHasher;
