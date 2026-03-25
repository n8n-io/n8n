"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PromiseInspection {
    constructor(args) {
        this._value = args.value;
        this._error = args.error;
    }
    value() {
        return this._value;
    }
    reason() {
        return this._error;
    }
    isRejected() {
        return !!this._error;
    }
    isFulfilled() {
        return !!this._value;
    }
}
exports.PromiseInspection = PromiseInspection;
