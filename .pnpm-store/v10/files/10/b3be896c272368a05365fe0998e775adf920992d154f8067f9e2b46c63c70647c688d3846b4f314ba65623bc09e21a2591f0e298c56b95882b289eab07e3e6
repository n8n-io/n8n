"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnOnce = warnOnce;
const warnedMessages = {};
function warnOnce(message) {
    if (!warnedMessages[message]) {
        console.warn(message);
        warnedMessages[message] = true;
    }
}
