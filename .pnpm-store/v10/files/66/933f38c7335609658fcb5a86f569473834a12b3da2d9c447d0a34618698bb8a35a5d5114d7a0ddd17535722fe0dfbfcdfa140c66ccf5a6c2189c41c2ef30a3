"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkOperationsProvider = void 0;
const db_data_1 = require("../../pinecone-generated-ts-fetch/db_data");
const utils_1 = require("../../utils");
const indexHostSingleton_1 = require("../indexHostSingleton");
const middleware_1 = require("../../utils/middleware");
class BulkOperationsProvider {
    constructor(config, indexName, indexHostUrl, additionalHeaders) {
        this.config = config;
        this.indexName = indexName;
        this.indexHostUrl = (0, utils_1.normalizeUrl)(indexHostUrl);
        this.additionalHeaders = additionalHeaders;
    }
    async provide() {
        if (this.bulkOperations) {
            return this.bulkOperations;
        }
        // If an indexHostUrl has been manually passed we use that,
        // otherwise we rely on resolving the host from the IndexHostSingleton
        if (this.indexHostUrl) {
            this.bulkOperations = this.buildBulkOperationsConfig();
        }
        else {
            this.indexHostUrl = await indexHostSingleton_1.IndexHostSingleton.getHostUrl(this.config, this.indexName);
            this.bulkOperations = this.buildBulkOperationsConfig();
        }
        return this.bulkOperations;
    }
    buildBulkOperationsConfig() {
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
        return new db_data_1.BulkOperationsApi(indexConfiguration);
    }
}
exports.BulkOperationsProvider = BulkOperationsProvider;
//# sourceMappingURL=bulkOperationsProvider.js.map