'use strict';

var utilBase64 = require('@smithy/util-base64');

function blobReader(blob, onChunk, chunkSize = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onerror = reject;
        fileReader.onabort = reject;
        const size = blob.size;
        let totalBytesRead = 0;
        const read = () => {
            if (totalBytesRead >= size) {
                resolve();
                return;
            }
            fileReader.readAsDataURL(blob.slice(totalBytesRead, Math.min(size, totalBytesRead + chunkSize)));
        };
        fileReader.onload = (event) => {
            const result = event.target.result;
            const dataOffset = result.indexOf(",") + 1;
            const data = result.substring(dataOffset);
            const decoded = utilBase64.fromBase64(data);
            onChunk(decoded);
            totalBytesRead += decoded.byteLength;
            read();
        };
        read();
    });
}

exports.blobReader = blobReader;
