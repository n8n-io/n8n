"use strict";
// file for microbenchmarking
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_writer_1 = require("./buffer-writer");
const buffer_reader_1 = require("./buffer-reader");
const LOOPS = 1000;
let count = 0;
let start = Date.now();
const writer = new buffer_writer_1.Writer();
const reader = new buffer_reader_1.BufferReader();
const buffer = Buffer.from([33, 33, 33, 33, 33, 33, 33, 0]);
const run = () => {
    if (count > LOOPS) {
        console.log(Date.now() - start);
        return;
    }
    count++;
    for (let i = 0; i < LOOPS; i++) {
        reader.setBuffer(0, buffer);
        reader.cstring();
    }
    setImmediate(run);
};
run();
//# sourceMappingURL=b.js.map