"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchRecordsCommand = void 0;
const errors_1 = require("../../errors");
const utils_1 = require("../../utils");
class SearchRecordsCommand {
    constructor(apiProvider, namespace) {
        this.validator = (options) => {
            if (!options.query) {
                throw new errors_1.PineconeArgumentError('You must pass a `query` object to search.');
            }
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(searchOptions, maxRetries) {
        this.validator(searchOptions);
        const api = await this.apiProvider.provide();
        const retryWrapper = new utils_1.RetryOnServerFailure(api.searchRecordsNamespace.bind(api), maxRetries);
        return await retryWrapper.execute({
            searchRecordsRequest: searchOptions,
            namespace: this.namespace,
        });
    }
}
exports.SearchRecordsCommand = SearchRecordsCommand;
//# sourceMappingURL=searchRecords.js.map