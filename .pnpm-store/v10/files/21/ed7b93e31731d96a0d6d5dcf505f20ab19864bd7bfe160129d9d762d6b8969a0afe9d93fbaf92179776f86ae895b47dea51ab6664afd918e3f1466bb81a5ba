"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const v3_1 = require("zod/v3");
const doubleSuite = new benchmark_1.default.Suite("z.discriminatedUnion: double");
const manySuite = new benchmark_1.default.Suite("z.discriminatedUnion: many");
const aSchema = v3_1.z.object({
    type: v3_1.z.literal("a"),
});
const objA = {
    type: "a",
};
const bSchema = v3_1.z.object({
    type: v3_1.z.literal("b"),
});
const objB = {
    type: "b",
};
const cSchema = v3_1.z.object({
    type: v3_1.z.literal("c"),
});
const objC = {
    type: "c",
};
const dSchema = v3_1.z.object({
    type: v3_1.z.literal("d"),
});
const double = v3_1.z.discriminatedUnion("type", [aSchema, bSchema]);
const many = v3_1.z.discriminatedUnion("type", [aSchema, bSchema, cSchema, dSchema]);
doubleSuite
    .add("valid: a", () => {
    double.parse(objA);
})
    .add("valid: b", () => {
    double.parse(objB);
})
    .add("invalid: null", () => {
    try {
        double.parse(null);
    }
    catch (_err) { }
})
    .add("invalid: wrong shape", () => {
    try {
        double.parse(objC);
    }
    catch (_err) { }
})
    .on("cycle", (e) => {
    console.log(`${doubleSuite.name}: ${e.target}`);
});
manySuite
    .add("valid: a", () => {
    many.parse(objA);
})
    .add("valid: c", () => {
    many.parse(objC);
})
    .add("invalid: null", () => {
    try {
        many.parse(null);
    }
    catch (_err) { }
})
    .add("invalid: wrong shape", () => {
    try {
        many.parse({ type: "unknown" });
    }
    catch (_err) { }
})
    .on("cycle", (e) => {
    console.log(`${manySuite.name}: ${e.target}`);
});
exports.default = {
    suites: [doubleSuite, manySuite],
};
