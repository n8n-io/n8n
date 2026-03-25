"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const benny_1 = require("benny");
const index_1 = require("../index");
const wasm_1 = require("../wasm");
(0, wasm_1.initWebAssembly)().then(() => {
    const randomInteger = (max = Number.MAX_SAFE_INTEGER) => Math.floor(Math.random() * max);
    const options = { initCount: 100 };
    benny_1.default.suite("Histogram percentile distribution", benny_1.default.add("Int32Histogram", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: 32
        });
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        return () => {
            histogram.outputPercentileDistribution();
        };
    }, options), benny_1.default.add("WASM 32B Histogram", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: 32,
            useWebAssembly: true
        });
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        return () => {
            histogram.outputPercentileDistribution();
        };
    }, options), benny_1.default.add("Packed Histogram", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: "packed"
        });
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        return () => {
            histogram.outputPercentileDistribution();
        };
    }, options), benny_1.default.add("WASM Packed Histogram", () => {
        const histogram = (0, index_1.build)({
            bitBucketSize: "packed",
            useWebAssembly: true
        });
        for (let index = 0; index < 1024; index++) {
            histogram.recordValueWithCount(randomInteger(), randomInteger(100));
        }
        return () => {
            histogram.outputPercentileDistribution();
        };
    }, options), benny_1.default.complete(), benny_1.default.save({ file: "distribution", format: "chart.html" }));
});
//# sourceMappingURL=histogram-distribution.js.map