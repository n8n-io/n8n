"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const v3_1 = require("zod/v3");
const emptySuite = new benchmark_1.default.Suite("z.object: empty");
const shortSuite = new benchmark_1.default.Suite("z.object: short");
const longSuite = new benchmark_1.default.Suite("z.object: long");
const empty = v3_1.z.object({});
const short = v3_1.z.object({
    string: v3_1.z.string(),
});
const long = v3_1.z.object({
    string: v3_1.z.string(),
    number: v3_1.z.number(),
    boolean: v3_1.z.boolean(),
});
emptySuite
    .add("valid", () => {
    empty.parse({});
})
    .add("valid: extra keys", () => {
    empty.parse({ string: "string" });
})
    .add("invalid: null", () => {
    try {
        empty.parse(null);
    }
    catch (_err) { }
})
    .on("cycle", (e) => {
    console.log(`${emptySuite.name}: ${e.target}`);
});
shortSuite
    .add("valid", () => {
    short.parse({ string: "string" });
})
    .add("valid: extra keys", () => {
    short.parse({ string: "string", number: 42 });
})
    .add("invalid: null", () => {
    try {
        short.parse(null);
    }
    catch (_err) { }
})
    .on("cycle", (e) => {
    console.log(`${shortSuite.name}: ${e.target}`);
});
longSuite
    .add("valid", () => {
    long.parse({ string: "string", number: 42, boolean: true });
})
    .add("valid: extra keys", () => {
    long.parse({ string: "string", number: 42, boolean: true, list: [] });
})
    .add("invalid: null", () => {
    try {
        long.parse(null);
    }
    catch (_err) { }
})
    .on("cycle", (e) => {
    console.log(`${longSuite.name}: ${e.target}`);
});
exports.default = {
    suites: [emptySuite, shortSuite, longSuite],
};
