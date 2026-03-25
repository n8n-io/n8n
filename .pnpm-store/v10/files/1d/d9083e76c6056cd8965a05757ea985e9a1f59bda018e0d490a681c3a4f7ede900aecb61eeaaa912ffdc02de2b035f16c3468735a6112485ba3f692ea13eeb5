"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantClientResourceExhaustedError = exports.QdrantClientTimeoutError = exports.QdrantClientConfigError = exports.QdrantClientUnexpectedResponseError = void 0;
const MAX_CONTENT = 200;
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
class QdrantClientUnexpectedResponseError extends CustomError {
    static forResponse(response) {
        const statusCodeStr = `${response.status}`;
        const reasonPhraseStr = !response.statusText ? '(Unrecognized Status Code)' : `(${response.statusText})`;
        const statusStr = `${statusCodeStr} ${reasonPhraseStr}`.trim();
        const dataStr = response.data ? JSON.stringify(response.data, null, 2) : null;
        let shortContent = '';
        if (dataStr) {
            shortContent = dataStr.length <= MAX_CONTENT ? dataStr : dataStr.slice(0, -4) + ' ...';
        }
        const rawContentStr = `Raw response content:\n${shortContent}`;
        return new QdrantClientUnexpectedResponseError(`Unexpected Response: ${statusStr}\n${rawContentStr}`);
    }
}
exports.QdrantClientUnexpectedResponseError = QdrantClientUnexpectedResponseError;
class QdrantClientConfigError extends CustomError {
}
exports.QdrantClientConfigError = QdrantClientConfigError;
class QdrantClientTimeoutError extends CustomError {
}
exports.QdrantClientTimeoutError = QdrantClientTimeoutError;
class QdrantClientResourceExhaustedError extends CustomError {
    constructor(message, retryAfter) {
        super(message);
        const retryAfterNumber = Number(retryAfter);
        if (isNaN(retryAfterNumber)) {
            throw new CustomError(`Invalid retryAfter value: ${retryAfter}`);
        }
        this.retry_after = retryAfterNumber;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.QdrantClientResourceExhaustedError = QdrantClientResourceExhaustedError;
