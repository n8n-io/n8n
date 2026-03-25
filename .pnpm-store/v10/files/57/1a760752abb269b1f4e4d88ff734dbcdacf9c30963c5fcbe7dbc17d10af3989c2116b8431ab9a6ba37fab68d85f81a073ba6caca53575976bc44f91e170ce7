"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const v3_1 = require("zod/v3");
const SUITE_NAME = "z.string";
const suite = new benchmark_1.default.Suite(SUITE_NAME);
const empty = "";
const short = "short";
const long = "long".repeat(256);
const manual = (str) => {
    if (typeof str !== "string") {
        throw new Error("Not a string");
    }
    return str;
};
const stringSchema = v3_1.z.string();
const optionalStringSchema = v3_1.z.string().optional();
const optionalNullableStringSchema = v3_1.z.string().optional().nullable();
suite
    .add("empty string", () => {
    stringSchema.parse(empty);
})
    .add("short string", () => {
    stringSchema.parse(short);
})
    .add("long string", () => {
    stringSchema.parse(long);
})
    .add("optional string", () => {
    optionalStringSchema.parse(long);
})
    .add("nullable string", () => {
    optionalNullableStringSchema.parse(long);
})
    .add("nullable (null) string", () => {
    optionalNullableStringSchema.parse(null);
})
    .add("invalid: null", () => {
    try {
        stringSchema.parse(null);
    }
    catch (_err) { }
})
    .add("manual parser: long", () => {
    manual(long);
})
    .on("cycle", (e) => {
    console.log(`${SUITE_NAME}: ${e.target}`);
});
exports.default = {
    suites: [suite],
};
