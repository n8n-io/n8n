"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseMimeType = void 0;
const utils_1 = require("../../utils");
const ResponseMimeType = ({ allowedValues }) => {
    return {
        Root(root, ctx) {
            (0, utils_1.validateMimeType)({ type: 'produces', value: root }, ctx, allowedValues);
        },
        Operation: {
            leave(operation, ctx) {
                (0, utils_1.validateMimeType)({ type: 'produces', value: operation }, ctx, allowedValues);
            },
        },
    };
};
exports.ResponseMimeType = ResponseMimeType;
