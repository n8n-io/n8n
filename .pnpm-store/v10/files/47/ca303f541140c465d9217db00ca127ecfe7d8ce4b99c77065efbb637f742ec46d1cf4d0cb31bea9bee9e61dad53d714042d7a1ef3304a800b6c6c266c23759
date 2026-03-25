"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = void 0;
class ClientError extends Error {
    constructor(response, request) {
        const message = `${ClientError.extractMessage(response)}: ${JSON.stringify({
            response,
            request,
        })}`;
        super(message);
        Object.setPrototypeOf(this, ClientError.prototype);
        this.response = response;
        this.request = request;
        // this is needed as Safari doesn't support .captureStackTrace
        if (typeof Error.captureStackTrace === `function`) {
            Error.captureStackTrace(this, ClientError);
        }
    }
    static extractMessage(response) {
        return response.errors?.[0]?.message ?? `GraphQL Error (Code: ${response.status})`;
    }
}
exports.ClientError = ClientError;
//# sourceMappingURL=types.js.map