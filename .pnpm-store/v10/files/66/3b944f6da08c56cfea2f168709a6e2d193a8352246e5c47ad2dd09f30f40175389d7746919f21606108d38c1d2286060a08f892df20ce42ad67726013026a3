"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureIndex = exports.ConfigureIndexRequestProperties = void 0;
const errors_1 = require("../errors");
const validateObjectProperties_1 = require("../utils/validateObjectProperties");
const utils_1 = require("../utils");
exports.ConfigureIndexRequestProperties = [
    'deletionProtection',
    'spec',
    'tags',
    'embed',
];
const configureIndex = (api) => {
    const validator = (indexName, options) => {
        if (options) {
            (0, validateObjectProperties_1.ValidateObjectProperties)(options, exports.ConfigureIndexRequestProperties);
        }
        if (!indexName) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `indexName` to configureIndex.');
        }
        // !options.deletionProtection evaluates to false if options.deletionProtection is undefined, empty string, or
        // not provided
        if (!options.spec &&
            !options.deletionProtection &&
            !options.tags &&
            !options.embed) {
            throw new errors_1.PineconeArgumentError('You must pass either `spec`, `deletionProtection`, `tags`, or `embed` to configureIndex in order to update.');
        }
        if (options.spec) {
            if (options.spec.pod) {
                (0, validateObjectProperties_1.ValidateObjectProperties)(options.spec.pod, ['replicas', 'podType']);
            }
            if (options.spec.pod && options.spec.pod.replicas) {
                if (options.spec.pod.replicas <= 0) {
                    throw new errors_1.PineconeArgumentError('`replicas` must be a positive integer.');
                }
            }
        }
    };
    return async (indexName, options, maxRetries) => {
        validator(indexName, options);
        const retryWrapper = new utils_1.RetryOnServerFailure(api.configureIndex.bind(api), maxRetries);
        return await retryWrapper.execute({
            indexName,
            configureIndexRequest: options,
        });
    };
};
exports.configureIndex = configureIndex;
//# sourceMappingURL=configureIndex.js.map