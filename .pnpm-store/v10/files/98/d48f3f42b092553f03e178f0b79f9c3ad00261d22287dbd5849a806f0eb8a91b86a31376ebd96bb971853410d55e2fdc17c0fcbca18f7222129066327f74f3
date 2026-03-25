"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const benny_1 = require("benny");
const index_1 = require("../index");
const wasm_1 = require("../wasm");
(0, wasm_1.initWebAssembly)().then(() => {
    const randomInteger = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const options = { initCount: 1000 };
    benny_1.default.suite("Histogram data access", benny_1.default.add("Int32Histogram", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: 32 });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("PackedHistogram", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: "packed" });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("Float64Histogram", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: 64 });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("Int32Histogram eager allocation", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: 32,
            highestTrackableValue: Number.MAX_SAFE_INTEGER
        });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("WASM Int32Histogram", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true
        });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("WASM PackedHistogram", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true
        });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.add("Float64Histogram eager allocation", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: 64,
            highestTrackableValue: Number.MAX_SAFE_INTEGER
        });
        return () => {
            histogram.recordValue(randomInteger());
        };
    }, options), benny_1.default.complete(), benny_1.default.save({ file: "data-access", format: "chart.html" }));
});
//# sourceMappingURL=histogram-data-access.js.map