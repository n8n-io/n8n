"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationsScheduler = exports.ClassificationsGetter = void 0;
const getter_js_1 = __importDefault(require("./getter.js"));
const scheduler_js_1 = __importDefault(require("./scheduler.js"));
const data = (client) => {
    return {
        scheduler: () => new scheduler_js_1.default(client),
        getter: () => new getter_js_1.default(client),
    };
};
exports.default = data;
var getter_js_2 = require("./getter.js");
Object.defineProperty(exports, "ClassificationsGetter", { enumerable: true, get: function () { return __importDefault(getter_js_2).default; } });
var scheduler_js_2 = require("./scheduler.js");
Object.defineProperty(exports, "ClassificationsScheduler", { enumerable: true, get: function () { return __importDefault(scheduler_js_2).default; } });
