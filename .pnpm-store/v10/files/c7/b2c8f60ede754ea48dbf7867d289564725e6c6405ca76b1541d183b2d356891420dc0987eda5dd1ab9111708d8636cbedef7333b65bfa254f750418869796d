"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const datetime_js_1 = __importDefault(require("./datetime.js"));
const discriminatedUnion_js_1 = __importDefault(require("./discriminatedUnion.js"));
const ipv4_js_1 = __importDefault(require("./ipv4.js"));
const object_js_1 = __importDefault(require("./object.js"));
const primitives_js_1 = __importDefault(require("./primitives.js"));
const realworld_js_1 = __importDefault(require("./realworld.js"));
const string_js_1 = __importDefault(require("./string.js"));
const union_js_1 = __importDefault(require("./union.js"));
const argv = process.argv.slice(2);
let suites = [];
if (!argv.length) {
    suites = [
        ...realworld_js_1.default.suites,
        ...primitives_js_1.default.suites,
        ...string_js_1.default.suites,
        ...object_js_1.default.suites,
        ...union_js_1.default.suites,
        ...discriminatedUnion_js_1.default.suites,
    ];
}
else {
    if (argv.includes("--realworld")) {
        suites.push(...realworld_js_1.default.suites);
    }
    if (argv.includes("--primitives")) {
        suites.push(...primitives_js_1.default.suites);
    }
    if (argv.includes("--string")) {
        suites.push(...string_js_1.default.suites);
    }
    if (argv.includes("--object")) {
        suites.push(...object_js_1.default.suites);
    }
    if (argv.includes("--union")) {
        suites.push(...union_js_1.default.suites);
    }
    if (argv.includes("--discriminatedUnion")) {
        suites.push(...datetime_js_1.default.suites);
    }
    if (argv.includes("--datetime")) {
        suites.push(...datetime_js_1.default.suites);
    }
    if (argv.includes("--ipv4")) {
        suites.push(...ipv4_js_1.default.suites);
    }
}
for (const suite of suites) {
    suite.run({});
}
// exit on Ctrl-C
process.on("SIGINT", function () {
    console.log("Exiting...");
    process.exit();
});
