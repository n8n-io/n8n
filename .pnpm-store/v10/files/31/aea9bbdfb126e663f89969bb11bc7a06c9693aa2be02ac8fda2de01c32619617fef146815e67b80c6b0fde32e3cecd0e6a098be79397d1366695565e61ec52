"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const REQUEST_HEADERS = {
    'Content-Type': 'application/vnd.schemaregistry.v1+json',
};
const updateContentType = (response) => response.enhance({
    headers: {
        'content-type': 'application/json',
    },
});
const confluentEncoderMiddleware = () => ({
    request: req => {
        try {
            if (req.body()) {
                return req.enhance({
                    headers: REQUEST_HEADERS,
                    body: JSON.stringify(req.body()),
                });
            }
        }
        catch (_) { }
        return req.enhance({ headers: REQUEST_HEADERS });
    },
    response: next => next()
        .then(updateContentType)
        .catch((response) => {
        throw updateContentType(response);
    }),
});
exports.default = confluentEncoderMiddleware;
//# sourceMappingURL=confluentEncoderMiddleware.js.map