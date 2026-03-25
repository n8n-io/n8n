"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderPropagation = void 0;
/**
 * A class that implements the HeaderPropagationCollection interface.
 * It filters the incoming request headers based on the definition provided and loads them into the outgoing headers collection.
 */
class HeaderPropagation {
    get incoming() {
        return this._incomingRequests;
    }
    get outgoing() {
        return this._outgoingHeaders;
    }
    constructor(headers) {
        this._outgoingHeaders = {};
        this._headersToPropagate = ['x-ms-correlation-id'];
        if (!headers) {
            throw new Error('Headers must be provided.');
        }
        this._incomingRequests = this.normalizeHeaders(headers);
        this.propagate(this._headersToPropagate);
    }
    propagate(headers) {
        for (const key of headers !== null && headers !== void 0 ? headers : []) {
            const lowerKey = key.toLowerCase();
            if (this._incomingRequests[lowerKey] && !this._outgoingHeaders[lowerKey]) {
                this._outgoingHeaders[lowerKey] = this._incomingRequests[lowerKey];
            }
        }
    }
    add(headers) {
        for (const [key, value] of Object.entries(headers !== null && headers !== void 0 ? headers : {})) {
            const lowerKey = key.toLowerCase();
            if (!this._incomingRequests[lowerKey] && !this._outgoingHeaders[lowerKey]) {
                this._outgoingHeaders[lowerKey] = value;
            }
        }
    }
    concat(headers) {
        var _a;
        for (const [key, value] of Object.entries(headers !== null && headers !== void 0 ? headers : {})) {
            const lowerKey = key.toLowerCase();
            if (this._incomingRequests[lowerKey] && !this._headersToPropagate.includes(lowerKey)) {
                this._outgoingHeaders[lowerKey] = `${(_a = this._outgoingHeaders[lowerKey]) !== null && _a !== void 0 ? _a : this._incomingRequests[lowerKey]} ${value}`.trim();
            }
        }
    }
    override(headers) {
        for (const [key, value] of Object.entries(headers !== null && headers !== void 0 ? headers : {})) {
            const lowerKey = key.toLowerCase();
            if (!this._headersToPropagate.includes(lowerKey)) {
                this._outgoingHeaders[lowerKey] = value;
            }
        }
    }
    /**
     * Normalizes the headers by lowercasing the keys and ensuring the values are strings.
     * @param headers The headers to normalize.
     * @returns A new object with normalized headers.
     */
    normalizeHeaders(headers) {
        return Object.entries(headers).reduce((acc, [key, value]) => {
            if (value) {
                acc[key.toLowerCase()] = Array.isArray(value) ? value.join(' ') : value;
            }
            return acc;
        }, {});
    }
}
exports.HeaderPropagation = HeaderPropagation;
//# sourceMappingURL=headerPropagation.js.map