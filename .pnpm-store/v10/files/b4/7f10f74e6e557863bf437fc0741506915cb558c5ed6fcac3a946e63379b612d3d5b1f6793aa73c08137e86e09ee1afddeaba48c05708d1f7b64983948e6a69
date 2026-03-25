"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operation2xxResponse = void 0;
const utils_1 = require("../utils");
const Operation2xxResponse = ({ validateWebhooks }) => {
    return {
        Paths: {
            Responses(responses, { report }) {
                const codes = Object.keys(responses || {});
                (0, utils_1.validateResponseCodes)(codes, '2XX', { report });
            },
        },
        WebhooksMap: {
            Responses(responses, { report }) {
                if (!validateWebhooks)
                    return;
                const codes = Object.keys(responses || {});
                (0, utils_1.validateResponseCodes)(codes, '2XX', { report });
            },
        },
    };
};
exports.Operation2xxResponse = Operation2xxResponse;
