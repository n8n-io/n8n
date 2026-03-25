"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferenceOperationsBuilder = void 0;
const inference_1 = require("../pinecone-generated-ts-fetch/inference");
const utils_1 = require("../utils");
const middleware_1 = require("../utils/middleware");
const inferenceOperationsBuilder = (config) => {
    const { apiKey } = config;
    const controllerPath = (0, utils_1.normalizeUrl)(config.controllerHostUrl) || 'https://api.pinecone.io';
    const headers = config.additionalHeaders || null;
    const apiConfig = {
        basePath: controllerPath,
        apiKey,
        queryParamsStringify: utils_1.queryParamsStringify,
        headers: {
            'User-Agent': (0, utils_1.buildUserAgent)(config),
            'X-Pinecone-Api-Version': inference_1.X_PINECONE_API_VERSION,
            ...headers,
        },
        fetchApi: (0, utils_1.getFetch)(config),
        middleware: middleware_1.middleware,
    };
    return new inference_1.InferenceApi(new inference_1.Configuration(apiConfig));
};
exports.inferenceOperationsBuilder = inferenceOperationsBuilder;
//# sourceMappingURL=inferenceOperationsBuilder.js.map