"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeNext() {
    if (typeof process === "object" && typeof process.nextTick === "function") {
        return process.nextTick;
    }
    else if (typeof setImmediate === "function") {
        return setImmediate;
    }
    else {
        return function next(f) {
            setTimeout(f, 0);
        };
    }
}
exports.default = makeNext();
