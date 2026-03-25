"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const v3_1 = require("zod/v3");
const Mocker_js_1 = require("../tests/Mocker.js");
const val = new Mocker_js_1.Mocker();
const enumSuite = new benchmark_1.default.Suite("z.enum");
const enumSchema = v3_1.z.enum(["a", "b", "c"]);
enumSuite
    .add("valid", () => {
    enumSchema.parse("a");
})
    .add("invalid", () => {
    try {
        enumSchema.parse("x");
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.enum: ${e.target}`);
});
const longEnumSuite = new benchmark_1.default.Suite("long z.enum");
const longEnumSchema = v3_1.z.enum([
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
]);
longEnumSuite
    .add("valid", () => {
    longEnumSchema.parse("five");
})
    .add("invalid", () => {
    try {
        longEnumSchema.parse("invalid");
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`long z.enum: ${e.target}`);
});
const undefinedSuite = new benchmark_1.default.Suite("z.undefined");
const undefinedSchema = v3_1.z.undefined();
undefinedSuite
    .add("valid", () => {
    undefinedSchema.parse(undefined);
})
    .add("invalid", () => {
    try {
        undefinedSchema.parse(1);
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.undefined: ${e.target}`);
});
const literalSuite = new benchmark_1.default.Suite("z.literal");
const short = "short";
const bad = "bad";
const literalSchema = v3_1.z.literal("short");
literalSuite
    .add("valid", () => {
    literalSchema.parse(short);
})
    .add("invalid", () => {
    try {
        literalSchema.parse(bad);
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.literal: ${e.target}`);
});
const numberSuite = new benchmark_1.default.Suite("z.number");
const numberSchema = v3_1.z.number().int();
numberSuite
    .add("valid", () => {
    numberSchema.parse(1);
})
    .add("invalid type", () => {
    try {
        numberSchema.parse("bad");
    }
    catch (_e) { }
})
    .add("invalid number", () => {
    try {
        numberSchema.parse(0.5);
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.number: ${e.target}`);
});
const dateSuite = new benchmark_1.default.Suite("z.date");
const plainDate = v3_1.z.date();
const minMaxDate = v3_1.z.date().min(new Date("2021-01-01")).max(new Date("2030-01-01"));
dateSuite
    .add("valid", () => {
    plainDate.parse(new Date());
})
    .add("invalid", () => {
    try {
        plainDate.parse(1);
    }
    catch (_e) { }
})
    .add("valid min and max", () => {
    minMaxDate.parse(new Date("2023-01-01"));
})
    .add("invalid min", () => {
    try {
        minMaxDate.parse(new Date("2019-01-01"));
    }
    catch (_e) { }
})
    .add("invalid max", () => {
    try {
        minMaxDate.parse(new Date("2031-01-01"));
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.date: ${e.target}`);
});
const symbolSuite = new benchmark_1.default.Suite("z.symbol");
const symbolSchema = v3_1.z.symbol();
symbolSuite
    .add("valid", () => {
    symbolSchema.parse(val.symbol);
})
    .add("invalid", () => {
    try {
        symbolSchema.parse(1);
    }
    catch (_e) { }
})
    .on("cycle", (e) => {
    console.log(`z.symbol: ${e.target}`);
});
exports.default = {
    suites: [enumSuite, longEnumSuite, undefinedSuite, literalSuite, numberSuite, dateSuite, symbolSuite],
};
