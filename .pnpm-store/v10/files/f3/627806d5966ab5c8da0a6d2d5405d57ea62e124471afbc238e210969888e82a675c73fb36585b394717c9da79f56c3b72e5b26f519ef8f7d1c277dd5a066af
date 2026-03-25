"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const product = '@kafkajs/confluent-schema-registry';
const userAgentMiddleware = ({ clientId }) => {
    const comment = clientId !== constants_1.DEFAULT_API_CLIENT_ID ? clientId : undefined;
    const userAgent = comment ? `${product} (${comment})` : product;
    const headers = {
        'User-Agent': userAgent,
    };
    return {
        prepareRequest: next => {
            return next().then(req => req.enhance({ headers }));
        },
    };
};
exports.default = userAgentMiddleware;
//# sourceMappingURL=userAgent.js.map