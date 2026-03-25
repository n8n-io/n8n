"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertCommand = void 0;
const types_1 = require("./types");
const errors_1 = require("../../errors");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const utils_1 = require("../../utils");
class UpsertCommand {
    constructor(apiProvider, namespace) {
        this.validator = (records) => {
            for (const record of records) {
                (0, validateObjectProperties_1.ValidateObjectProperties)(record, types_1.PineconeRecordsProperties);
            }
            if (records.length === 0) {
                throw new errors_1.PineconeArgumentError('Must pass in at least 1 record to upsert.');
            }
            records.forEach((record) => {
                if (!record.id) {
                    throw new errors_1.PineconeArgumentError('Every record must include an `id` property in order to upsert.');
                }
                if (!record.values && !record.sparseValues) {
                    throw new errors_1.PineconeArgumentError('Every record must include either `values` or `sparseValues` in order to upsert.');
                }
            });
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(records, maxRetries) {
        this.validator(records);
        const api = await this.apiProvider.provide();
        const retryWrapper = new utils_1.RetryOnServerFailure(api.upsertVectors.bind(api), maxRetries);
        await retryWrapper.execute({
            upsertRequest: {
                vectors: records,
                namespace: this.namespace,
            },
        });
    }
}
exports.UpsertCommand = UpsertCommand;
//# sourceMappingURL=upsert.js.map