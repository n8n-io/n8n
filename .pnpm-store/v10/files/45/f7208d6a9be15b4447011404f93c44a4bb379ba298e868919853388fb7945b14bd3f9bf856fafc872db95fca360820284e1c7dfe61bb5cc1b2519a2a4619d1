"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const v3_1 = require("zod/v3");
const shortSuite = new benchmark_1.default.Suite("realworld");
const People = v3_1.z.array(v3_1.z.object({
    type: v3_1.z.literal("person"),
    hair: v3_1.z.enum(["blue", "brown"]),
    active: v3_1.z.boolean(),
    name: v3_1.z.string(),
    age: v3_1.z.number().int(),
    hobbies: v3_1.z.array(v3_1.z.string()),
    address: v3_1.z.object({
        street: v3_1.z.string(),
        zip: v3_1.z.string(),
        country: v3_1.z.string(),
    }),
}));
let i = 0;
function num() {
    return ++i;
}
function str() {
    return (++i % 100).toString(16);
}
function array(fn) {
    return Array.from({ length: ++i % 10 }, () => fn());
}
const people = Array.from({ length: 100 }, () => {
    return {
        type: "person",
        hair: i % 2 ? "blue" : "brown",
        active: !!(i % 2),
        name: str(),
        age: num(),
        hobbies: array(str),
        address: {
            street: str(),
            zip: str(),
            country: str(),
        },
    };
});
shortSuite
    .add("valid", () => {
    People.parse(people);
})
    .on("cycle", (e) => {
    console.log(`${shortSuite.name}: ${e.target}`);
});
exports.default = {
    suites: [shortSuite],
};
