"use strict";

var GenericWorker = require("./stream/GenericWorker");

exports.STORE = {
    magic: "\x00\x00",
    compressWorker : function () {
        return new GenericWorker("STORE compression");
    },
    uncompressWorker : function () {
        return new GenericWorker("STORE decompression");
    }
};
exports.DEFLATE = require("./flate");
