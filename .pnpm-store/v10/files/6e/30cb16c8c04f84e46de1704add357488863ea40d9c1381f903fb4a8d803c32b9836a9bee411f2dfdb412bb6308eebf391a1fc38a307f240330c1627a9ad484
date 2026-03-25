"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const benny_1 = require("benny");
const index_1 = require("../index");
const wasm_1 = require("../wasm");
(0, wasm_1.initWebAssembly)().then(() => {
    const randomInteger = () => Math.floor(Math.random() * 1000000);
    const randomSmallInteger = () => Math.floor(Math.random() * 1000);
    const options = { initCount: 1000 };
    benny_1.default.suite("Histogram data access with coordinated ommissions", benny_1.default.add("Int32Histogram", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: 32 });
        return () => {
            histogram.recordValueWithExpectedInterval(randomInteger(), 100000);
        };
    }, options), benny_1.default.add("Int32Histogram no correction needed", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: 32 });
        return () => {
            histogram.recordValueWithExpectedInterval(randomSmallInteger(), 100000);
        };
    }, options), benny_1.default.add("PackedHistogram", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: "packed" });
        return () => {
            histogram.recordValueWithExpectedInterval(randomInteger(), 100000);
        };
    }, options), benny_1.default.add("PackedHistogram no correction needed", () => {
        const histogram = (0, index_1.build)({ bitBucketSize: "packed" });
        return () => {
            histogram.recordValueWithExpectedInterval(randomSmallInteger(), 100000);
        };
    }, options), benny_1.default.add("WASM Int32Histogram", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true
        });
        return () => {
            histogram.recordValueWithExpectedInterval(randomInteger(), 100000);
        };
    }, options), benny_1.default.add("WASM Int32Histogram no correction needed", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true
        });
        return () => {
            histogram.recordValueWithExpectedInterval(randomSmallInteger(), 100000);
        };
    }, options), benny_1.default.add("WASM PackedHistogram", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true,
            bitBucketSize: "packed"
        });
        return () => {
            histogram.recordValueWithExpectedInterval(randomInteger(), 100000);
        };
    }, options), benny_1.default.add("WASM PackedHistogram no correction needed", () => {
        const histogram = (0, index_1.build)({
            useWebAssembly: true,
            bitBucketSize: "packed"
        });
        return () => {
            histogram.recordValueWithExpectedInterval(randomSmallInteger(), 100000);
        };
    }, options), benny_1.default.complete(), benny_1.default.save({ file: "data-access-co", format: "chart.html" }));
});
//# sourceMappingURL=histogram-data-access-co.js.map