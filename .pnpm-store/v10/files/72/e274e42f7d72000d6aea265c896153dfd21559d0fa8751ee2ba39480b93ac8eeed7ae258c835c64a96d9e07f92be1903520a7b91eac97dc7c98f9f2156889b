"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultCodeError = void 0;
class ResultCodeError extends Error {
    constructor(code, message) {
        super();
        this.code = code;
        if (typeof code === 'undefined' || code === null) {
            this.message = message;
        }
        else {
            this.message = `${message} Code: 0x${code.toString(16)}`;
        }
    }
}
exports.ResultCodeError = ResultCodeError;
//# sourceMappingURL=ResultCodeError.js.map