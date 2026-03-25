"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApiError = void 0;
const utils_1 = require("./utils");
const http_1 = require("./http");
const request_1 = require("./request");
/** @internal */
const handleApiError = async (e, customMessage, url) => {
    if (e instanceof Error && e.name === 'ResponseError') {
        const responseError = e;
        const rawMessage = await (0, utils_1.extractMessage)(responseError);
        const statusCode = responseError.response.status;
        const message = customMessage
            ? await customMessage(statusCode, rawMessage)
            : rawMessage;
        return (0, http_1.mapHttpStatusError)({
            status: responseError.response.status,
            url: responseError.response.url || url,
            message: message,
        });
    }
    else if (e instanceof request_1.PineconeConnectionError) {
        // If we've already wrapped this error, just return it
        return e;
    }
    else {
        // There seem to be some situations where "e instanceof Error" is erroneously
        // false (perhaps the custom errors emitted by cross-fetch do not extend Error?)
        // but we can still cast it to an Error type because all we're going to do
        // with it is store off a reference to whatever it is under the "cause"
        const err = e;
        return new request_1.PineconeConnectionError(err);
    }
};
exports.handleApiError = handleApiError;
//# sourceMappingURL=handling.js.map