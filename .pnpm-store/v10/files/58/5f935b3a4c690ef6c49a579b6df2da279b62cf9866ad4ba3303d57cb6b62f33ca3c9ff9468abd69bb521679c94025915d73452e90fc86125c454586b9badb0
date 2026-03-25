"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePineconeError = void 0;
class BasePineconeError extends Error {
    constructor(message, cause) {
        super(message);
        // Set the prototype explicitly to ensure instanceof works correctly
        Object.setPrototypeOf(this, new.target.prototype);
        // Maintain a proper stack trace in V8 environments (Chrome and Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, new.target);
        }
        this.name = this.constructor.name;
        this.cause = cause;
    }
}
exports.BasePineconeError = BasePineconeError;
//# sourceMappingURL=base.js.map