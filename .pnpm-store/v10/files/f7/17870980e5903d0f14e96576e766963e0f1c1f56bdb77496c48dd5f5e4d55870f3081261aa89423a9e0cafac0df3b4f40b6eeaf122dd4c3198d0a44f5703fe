"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const benny_1 = require("benny");
const index_1 = require("../index");
const encoding_1 = require("../encoding");
const wasm_1 = require("../wasm");
(0, wasm_1.initWebAssembly)().then(() => {
    const randomInteger = (max = Number.MAX_SAFE_INTEGER) => Math.floor(Math.random() * max);
    const options = { initCount: 1000 };
    benny_1.default.suite("Histogram decoding", benny_1.default.add("Int32Histogram", () => {
        const histogram = (0, index_1.build)();
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        const b64 = (0, encoding_1.encodeIntoCompressedBase64)(histogram);
        return () => {
            (0, encoding_1.decodeFromCompressedBase64)(b64, 32, false).destroy();
        };
    }, options), benny_1.default.add("WASM 32B Histogram", () => {
        const histogram = (0, index_1.build)();
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        const b64 = (0, encoding_1.encodeIntoCompressedBase64)(histogram);
        histogram.destroy();
        return () => {
            (0, encoding_1.decodeFromCompressedBase64)(b64, 32, true).destroy();
        };
    }, options), benny_1.default.add("Packed Histogram", () => {
        const histogram = (0, index_1.build)();
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        const b64 = (0, encoding_1.encodeIntoCompressedBase64)(histogram);
        return () => {
            (0, encoding_1.decodeFromCompressedBase64)(b64, "packed", false).destroy();
        };
    }, options), benny_1.default.add("WASM Packed Histogram", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: "packed",
            useWebAssembly: true
        });
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        const b64 = (0, encoding_1.encodeIntoCompressedBase64)(histogram);
        histogram.destroy();
        return () => {
            (0, encoding_1.decodeFromCompressedBase64)(b64, "packed", true).destroy();
        };
    }, options), benny_1.default.complete(), benny_1.default.save({ file: "decoding", format: "chart.html" }));
});
//# sourceMappingURL=histogram-decoding.js.map