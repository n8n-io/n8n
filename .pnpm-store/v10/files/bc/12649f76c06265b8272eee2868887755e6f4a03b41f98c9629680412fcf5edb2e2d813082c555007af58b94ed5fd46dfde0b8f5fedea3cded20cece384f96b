"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operation4xxResponse = void 0;
const utils_1 = require("../utils");
const Operation4xxResponse = ({ validateWebhooks }) => {
    return {
        Paths: {
            Responses(responses, { report }) {
                const codes = Object.keys(responses || {});
                (0, utils_1.validateResponseCodes)(codes, '4XX', { report });
            },
        },
        WebhooksMap: {
            Responses(responses, { report }) {
                if (!validateWebhooks)
                    return;
                const codes = Object.keys(responses || {});
                (0, utils_1.validateResponseCodes)(codes, '4XX', { report });
            },
        },
    };
};
exports.Operation4xxResponse = Operation4xxResponse;
