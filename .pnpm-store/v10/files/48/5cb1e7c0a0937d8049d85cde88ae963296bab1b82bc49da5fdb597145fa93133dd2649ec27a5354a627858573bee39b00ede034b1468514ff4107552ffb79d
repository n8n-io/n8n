"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseMimeType = void 0;
const utils_1 = require("../../utils");
const ResponseMimeType = ({ allowedValues }) => {
    return {
        Paths: {
            Response: {
                leave(response, ctx) {
                    (0, utils_1.validateMimeTypeOAS3)({ type: 'produces', value: response }, ctx, allowedValues);
                },
            },
            Callback: {
                Response() { },
                RequestBody: {
                    leave(requestBody, ctx) {
                        (0, utils_1.validateMimeTypeOAS3)({ type: 'produces', value: requestBody }, ctx, allowedValues);
                    },
                },
            },
        },
        WebhooksMap: {
            RequestBody: {
                leave(requestBody, ctx) {
                    (0, utils_1.validateMimeTypeOAS3)({ type: 'produces', value: requestBody }, ctx, allowedValues);
                },
            },
        },
    };
};
exports.ResponseMimeType = ResponseMimeType;
