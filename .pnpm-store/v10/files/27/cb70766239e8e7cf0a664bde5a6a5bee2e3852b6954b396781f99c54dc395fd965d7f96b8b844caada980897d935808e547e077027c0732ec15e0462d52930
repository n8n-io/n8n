"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concat = void 0;
var concatAll_1 = require("../operators/concatAll");
var args_1 = require("../util/args");
var from_1 = require("./from");
function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return concatAll_1.concatAll()(from_1.from(args, args_1.popScheduler(args)));
}
exports.concat = concat;
//# sourceMappingURL=concat.js.map