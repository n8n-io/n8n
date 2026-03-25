"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MQTTJS_VERSION = exports.nextTick = exports.applyMixin = exports.ErrorWithReasonCode = void 0;
class ErrorWithReasonCode extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, ErrorWithReasonCode.prototype);
        Object.getPrototypeOf(this).name = 'ErrorWithReasonCode';
    }
}
exports.ErrorWithReasonCode = ErrorWithReasonCode;
function applyMixin(target, mixin, includeConstructor = false) {
    var _a;
    const inheritanceChain = [mixin];
    while (true) {
        const current = inheritanceChain[0];
        const base = Object.getPrototypeOf(current);
        if (base === null || base === void 0 ? void 0 : base.prototype) {
            inheritanceChain.unshift(base);
        }
        else {
            break;
        }
    }
    for (const ctor of inheritanceChain) {
        for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
            if (includeConstructor || prop !== 'constructor') {
                Object.defineProperty(target.prototype, prop, (_a = Object.getOwnPropertyDescriptor(ctor.prototype, prop)) !== null && _a !== void 0 ? _a : Object.create(null));
            }
        }
    }
}
exports.applyMixin = applyMixin;
exports.nextTick = typeof (process === null || process === void 0 ? void 0 : process.nextTick) === 'function'
    ? process.nextTick
    : (callback) => {
        setTimeout(callback, 0);
    };
exports.MQTTJS_VERSION = require('../../package.json').version;
//# sourceMappingURL=shared.js.map