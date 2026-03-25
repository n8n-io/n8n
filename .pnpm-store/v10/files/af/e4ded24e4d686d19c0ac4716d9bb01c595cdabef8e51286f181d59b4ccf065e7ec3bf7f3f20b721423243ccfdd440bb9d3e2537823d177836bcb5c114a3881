"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
const never = Symbol();
class ApiError extends Error {
    constructor(response) {
        super(response.statusText);
        Object.setPrototypeOf(this, new.target.prototype);
        this.headers = response.headers;
        this.url = response.url;
        this.status = response.status;
        this.statusText = response.statusText;
        this.data = response.data;
    }
}
exports.ApiError = ApiError;
