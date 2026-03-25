"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertRecordsCommand = void 0;
const errors_1 = require("../../errors");
const utils_1 = require("../../utils");
const db_data_1 = require("../../pinecone-generated-ts-fetch/db_data");
class UpsertRecordsCommand {
    constructor(apiProvider, namespace, config) {
        this.validator = (records) => {
            for (const record of records) {
                if (!record.id && !record._id) {
                    throw new errors_1.PineconeArgumentError('Every record must include an `id` or `_id` property in order to upsert.');
                }
            }
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
        this.config = config;
    }
    async run(records, maxRetries) {
        const fetch = (0, utils_1.getFetch)(this.config);
        this.validator(records);
        const hostUrl = await this.apiProvider.provideHostUrl();
        const upsertRecordsUrl = `${hostUrl}/records/namespaces/${this.namespace}/upsert`;
        const requestHeaders = {
            'Api-Key': this.config.apiKey,
            'User-Agent': (0, utils_1.buildUserAgent)(this.config),
            'X-Pinecone-Api-Version': db_data_1.X_PINECONE_API_VERSION,
        };
        const retryWrapper = new utils_1.RetryOnServerFailure(() => fetch(upsertRecordsUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: toNdJson(records),
        }), maxRetries);
        const response = await retryWrapper.execute();
        if (response.ok) {
            return;
        }
        else {
            const err = await (0, errors_1.handleApiError)(new db_data_1.ResponseError(response, 'Response returned an error'), undefined, upsertRecordsUrl);
            throw err;
        }
    }
}
exports.UpsertRecordsCommand = UpsertRecordsCommand;
function toNdJson(data) {
    return data.map((record) => JSON.stringify(record)).join('\n');
}
//# sourceMappingURL=upsertRecords.js.map