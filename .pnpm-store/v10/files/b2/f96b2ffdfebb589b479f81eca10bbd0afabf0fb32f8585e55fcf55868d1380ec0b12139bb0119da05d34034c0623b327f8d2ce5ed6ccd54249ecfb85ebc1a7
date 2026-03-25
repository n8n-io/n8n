"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asstMetricsOperationsBuilder = void 0;
const assistant_evaluation_1 = require("../../pinecone-generated-ts-fetch/assistant_evaluation");
const utils_1 = require("../../utils");
const middleware_1 = require("../../utils/middleware");
const asstMetricsOperationsBuilder = (config) => {
    const { apiKey } = config;
    let hostUrl = 'https://prod-1-data.ke.pinecone.io/assistant';
    // If 'eu' is specified use that, otherwise default to 'us'
    if (config.assistantRegion && config.assistantRegion.toLowerCase() === 'eu') {
        hostUrl = 'https://prod-eu-data.ke.pinecone.io/assistant';
    }
    const headers = config.additionalHeaders || null;
    const apiConfig = {
        basePath: hostUrl,
        apiKey,
        queryParamsStringify: utils_1.queryParamsStringify,
        headers: {
            'User-Agent': (0, utils_1.buildUserAgent)(config),
            'X-Pinecone-Api-Version': assistant_evaluation_1.X_PINECONE_API_VERSION,
            ...headers,
        },
        fetchApi: (0, utils_1.getFetch)(config),
        middleware: middleware_1.middleware,
    };
    return new assistant_evaluation_1.MetricsApi(new assistant_evaluation_1.Configuration(apiConfig));
};
exports.asstMetricsOperationsBuilder = asstMetricsOperationsBuilder;
//# sourceMappingURL=asstMetricsOperationsBuilder.js.map