"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asstControlOperationsBuilder = void 0;
const assistant_control_1 = require("../../pinecone-generated-ts-fetch/assistant_control");
const utils_1 = require("../../utils");
const middleware_1 = require("../../utils/middleware");
const asstControlOperationsBuilder = (config) => {
    const { apiKey } = config;
    const controllerPath = (0, utils_1.normalizeUrl)(config.controllerHostUrl) ||
        'https://api.pinecone.io/assistant';
    const headers = config.additionalHeaders || null;
    const apiConfig = {
        basePath: controllerPath,
        apiKey,
        queryParamsStringify: utils_1.queryParamsStringify,
        headers: {
            'User-Agent': (0, utils_1.buildUserAgent)(config),
            'X-Pinecone-Api-Version': assistant_control_1.X_PINECONE_API_VERSION,
            ...headers,
        },
        fetchApi: (0, utils_1.getFetch)(config),
        middleware: middleware_1.middleware,
    };
    return new assistant_control_1.ManageAssistantsApi(new assistant_control_1.Configuration(apiConfig));
};
exports.asstControlOperationsBuilder = asstControlOperationsBuilder;
//# sourceMappingURL=asstControlOperationsBuilder.js.map