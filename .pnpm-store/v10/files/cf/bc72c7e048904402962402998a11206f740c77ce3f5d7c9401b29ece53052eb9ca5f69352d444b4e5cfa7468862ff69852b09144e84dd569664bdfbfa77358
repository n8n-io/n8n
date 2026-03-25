"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorOperationsProvider = void 0;
const db_data_1 = require("../../pinecone-generated-ts-fetch/db_data");
const utils_1 = require("../../utils");
const indexHostSingleton_1 = require("../indexHostSingleton");
const middleware_1 = require("../../utils/middleware");
class VectorOperationsProvider {
    constructor(config, indexName, indexHostUrl, additionalHeaders) {
        this.config = config;
        this.indexName = indexName;
        this.indexHostUrl = (0, utils_1.normalizeUrl)(indexHostUrl);
        this.additionalHeaders = additionalHeaders;
    }
    async provide() {
        if (this.vectorOperations) {
            return this.vectorOperations;
        }
        // If an indexHostUrl has been manually passed we use that,
        // otherwise we rely on resolving the host from the IndexHostSingleton
        if (this.indexHostUrl) {
            this.vectorOperations = this.buildDataOperationsConfig();
        }
        else {
            this.indexHostUrl = await indexHostSingleton_1.IndexHostSingleton.getHostUrl(this.config, this.indexName);
            this.vectorOperations = this.buildDataOperationsConfig();
        }
        return this.vectorOperations;
    }
    async provideHostUrl() {
        return await indexHostSingleton_1.IndexHostSingleton.getHostUrl(this.config, this.indexName);
    }
    buildDataOperationsConfig() {
        const headers = this.additionalHeaders || null;
        const indexConfigurationParameters = {
            basePath: this.indexHostUrl,
            apiKey: this.config.apiKey,
            queryParamsStringify: utils_1.queryParamsStringify,
            headers: {
                'User-Agent': (0, utils_1.buildUserAgent)(this.config),
                'X-Pinecone-Api-Version': db_data_1.X_PINECONE_API_VERSION,
                ...headers,
            },
            fetchApi: (0, utils_1.getFetch)(this.config),
            middleware: middleware_1.middleware,
        };
        const indexConfiguration = new db_data_1.Configuration(indexConfigurationParameters);
        return new db_data_1.VectorOperationsApi(indexConfiguration);
    }
}
exports.VectorOperationsProvider = VectorOperationsProvider;
//# sourceMappingURL=vectorOperationsProvider.js.map