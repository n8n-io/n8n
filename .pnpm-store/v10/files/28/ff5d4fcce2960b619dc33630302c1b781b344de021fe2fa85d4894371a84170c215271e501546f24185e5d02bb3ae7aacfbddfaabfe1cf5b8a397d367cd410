"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCommand = void 0;
const errors_1 = require("../../errors");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const QueryOptionsProperties = [
    'id',
    'vector',
    'sparseVector',
    'includeValues',
    'includeMetadata',
    'filter',
    'topK',
];
class QueryCommand {
    constructor(apiProvider, namespace) {
        this.validator = (options) => {
            if (options) {
                (0, validateObjectProperties_1.ValidateObjectProperties)(options, QueryOptionsProperties);
            }
            if (!options) {
                throw new errors_1.PineconeArgumentError('You must enter a query configuration object to query the index.');
            }
            if (options && !options.topK) {
                throw new errors_1.PineconeArgumentError('You must enter an integer for the `topK` search results to be returned.');
            }
            if (options && options.topK && options.topK < 1) {
                throw new errors_1.PineconeArgumentError('`topK` property must be greater than 0.');
            }
            if (options && options.filter) {
                const keys = Object.keys(options.filter);
                if (keys.length === 0) {
                    throw new errors_1.PineconeArgumentError('You must enter a `filter` object with at least one key-value pair.');
                }
            }
            if ('id' in options) {
                if (!options.id) {
                    throw new errors_1.PineconeArgumentError('You must enter non-empty string for `id` to query by record ID.');
                }
            }
            if ('vector' in options) {
                if (options.vector.length === 0) {
                    throw new errors_1.PineconeArgumentError('You must enter an array of `RecordValues` in order to query by vector values.');
                }
            }
            if ('sparseVector' in options) {
                if (options.sparseVector?.indices.length === 0 ||
                    options.sparseVector?.values.length === 0) {
                    throw new errors_1.PineconeArgumentError('You must enter a `RecordSparseValues` object with `indices` and `values` properties in order to query by' +
                        ' sparse vector values.');
                }
            }
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(query) {
        this.validator(query);
        const api = await this.apiProvider.provide();
        const results = await api.queryVectors({
            queryRequest: { ...query, namespace: this.namespace },
        });
        const matches = results.matches ? results.matches : [];
        return {
            matches: matches,
            namespace: this.namespace,
            ...(results.usage && { usage: results.usage }),
        };
    }
}
exports.QueryCommand = QueryCommand;
//# sourceMappingURL=query.js.map