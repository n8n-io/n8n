"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsstDataOperationsProvider = void 0;
const assistant_data_1 = require("../../pinecone-generated-ts-fetch/assistant_data");
const utils_1 = require("../../utils");
const middleware_1 = require("../../utils/middleware");
const assistantHostSingleton_1 = require("../assistantHostSingleton");
class AsstDataOperationsProvider {
    constructor(config, asstName, asstHostUrl, additionalHeaders) {
        this.config = config;
        this.asstName = asstName;
        this.asstHostUrl = (0, utils_1.normalizeUrl)(asstHostUrl);
        this.additionalHeaders = additionalHeaders;
    }
    async provideData() {
        if (this.asstDataOperations) {
            return this.asstDataOperations;
        }
        else {
            this.asstHostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(this.config, this.asstName);
            this.asstDataOperations = this.buildAsstDataOperationsConfig();
        }
        return this.asstDataOperations;
    }
    async provideHostUrl() {
        if (this.asstHostUrl) {
            return this.asstHostUrl;
        }
        else {
            this.asstHostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(this.config, this.asstName);
        }
        return this.asstHostUrl;
    }
    buildAsstDataOperationsConfig() {
        const { apiKey } = this.config;
        const hostUrl = this.asstHostUrl;
        const headers = this.additionalHeaders || null;
        const apiConfig = {
            basePath: hostUrl,
            apiKey,
            queryParamsStringify: utils_1.queryParamsStringify,
            headers: {
                'User-Agent': (0, utils_1.buildUserAgent)(this.config),
                'X-Pinecone-Api-Version': assistant_data_1.X_PINECONE_API_VERSION,
                ...headers,
            },
            fetchApi: (0, utils_1.getFetch)(this.config),
            middleware: middleware_1.middleware,
        };
        return new assistant_data_1.ManageAssistantsApi(new assistant_data_1.Configuration(apiConfig));
    }
}
exports.AsstDataOperationsProvider = AsstDataOperationsProvider;
//# sourceMappingURL=asstDataOperationsProvider.js.map