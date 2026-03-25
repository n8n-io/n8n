"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitUntilIndexIsReady = exports.createIndex = void 0;
const db_control_1 = require("../pinecone-generated-ts-fetch/db_control");
const utils_1 = require("../utils");
const types_1 = require("./types");
const errors_1 = require("../errors");
const validateObjectProperties_1 = require("../utils/validateObjectProperties");
const CreateIndexOptionsProperties = [
    'spec',
    'name',
    'dimension',
    'metric',
    'deletionProtection',
    'waitUntilReady',
    'suppressConflicts',
    'tags',
    'vectorType',
];
const CreateIndexSpecProperties = ['serverless', 'pod'];
const CreateIndexServerlessSpecProperties = [
    'cloud',
    'region',
];
const CreateIndexPodSpecProperties = [
    'environment',
    'replicas',
    'shards',
    'podType',
    'pods',
    'metadataConfig',
    'sourceCollection',
];
const createIndex = (api) => {
    return async (options) => {
        if (!options) {
            throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`name`, `dimension`, `spec`) to create an index.');
        }
        // If metric is not specified for a sparse index, default to dotproduct
        if (options.vectorType && options.vectorType.toLowerCase() === 'sparse') {
            if (!options.metric) {
                options.metric = db_control_1.IndexModelMetricEnum.Dotproduct;
            }
        }
        else {
            // If metric is not specified for a dense index, default to cosine
            if (!options.metric) {
                options.metric = db_control_1.IndexModelMetricEnum.Cosine;
            }
        }
        validateCreateIndexRequest(options);
        try {
            const createResponse = await api.createIndex({
                createIndexRequest: options,
            });
            if (options.waitUntilReady) {
                return await (0, exports.waitUntilIndexIsReady)(api, options.name);
            }
            return createResponse;
        }
        catch (e) {
            if (!(options.suppressConflicts &&
                e instanceof Error &&
                e.name === 'PineconeConflictError')) {
                throw e;
            }
        }
    };
};
exports.createIndex = createIndex;
const waitUntilIndexIsReady = async (api, indexName, seconds = 0) => {
    try {
        const indexDescription = await api.describeIndex({ indexName });
        if (!indexDescription.status?.ready) {
            await new Promise((r) => setTimeout(r, 1000));
            return await (0, exports.waitUntilIndexIsReady)(api, indexName, seconds + 1);
        }
        else {
            (0, utils_1.debugLog)(`Index ${indexName} is ready after ${seconds}`);
            return indexDescription;
        }
    }
    catch (e) {
        const err = await (0, errors_1.handleApiError)(e, async (_, rawMessageText) => `Error creating index ${indexName}: ${rawMessageText}`);
        throw err;
    }
};
exports.waitUntilIndexIsReady = waitUntilIndexIsReady;
const validateCreateIndexRequest = (options) => {
    // validate options properties
    if (options) {
        (0, validateObjectProperties_1.ValidateObjectProperties)(options, CreateIndexOptionsProperties);
    }
    if (!options.name) {
        throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `name` in order to create an index.');
    }
    if (options.dimension && options.dimension <= 0) {
        throw new errors_1.PineconeArgumentError('You must pass a positive integer for `dimension` in order to create an index.');
    }
    // validate options.spec properties
    if (!options.spec) {
        throw new errors_1.PineconeArgumentError('You must pass a `pods` or `serverless` `spec` object in order to create an index.');
    }
    if (options.spec) {
        (0, validateObjectProperties_1.ValidateObjectProperties)(options.spec, CreateIndexSpecProperties);
    }
    // validate options.metric
    if (options.metric &&
        !Object.values(db_control_1.IndexModelMetricEnum).includes(options.metric)) {
        {
            throw new errors_1.PineconeArgumentError(`Invalid metric value: ${options.metric}. Valid values are: 'cosine', 'euclidean', or 'dotproduct.'`);
        }
    }
    // validate options.spec.serverless properties if serverless spec is passed
    if (options.spec.serverless) {
        (0, validateObjectProperties_1.ValidateObjectProperties)(options.spec.serverless, CreateIndexServerlessSpecProperties);
        // extract and default vectorType to 'dense' if not specified
        const vectorType = options.vectorType
            ? options.vectorType.toLowerCase()
            : 'dense';
        if (vectorType !== 'dense' && vectorType !== 'sparse') {
            throw new errors_1.PineconeArgumentError('Invalid `vectorType` value. Valid values are `dense` or `sparse`.');
        }
        // sparse indexes must have a metric of 'dotproduct' and no dimension
        if (vectorType == 'sparse') {
            if (options.dimension && options.dimension > 0) {
                throw new errors_1.PineconeArgumentError('Sparse indexes cannot have a `dimension`.');
            }
            if (options.metric && options.metric !== 'dotproduct') {
                throw new errors_1.PineconeArgumentError('Sparse indexes must have a `metric` of `dotproduct`.');
            }
        }
        else if (vectorType == 'dense') {
            // dense indexes must have a dimension
            if (!options.dimension || options.dimension <= 0) {
                throw new errors_1.PineconeArgumentError('You must pass a positive `dimension` when creating a dense index.');
            }
        }
        // validate serverless cloud & region
        if (!options.spec.serverless.cloud) {
            throw new errors_1.PineconeArgumentError('You must pass a `cloud` for the serverless `spec` object in order to create an index.');
        }
        if (options.spec.serverless.cloud &&
            !Object.values(db_control_1.ServerlessSpecCloudEnum).includes(options.spec.serverless.cloud)) {
            throw new errors_1.PineconeArgumentError(`Invalid cloud value: ${options.spec.serverless.cloud}. Valid values are: ${Object.values(db_control_1.ServerlessSpecCloudEnum).join(', ')}.`);
        }
        if (!options.spec.serverless.region) {
            throw new errors_1.PineconeArgumentError('You must pass a `region` for the serverless `spec` object in order to create an index.');
        }
    }
    else if (options.spec.pod) {
        // validate options.spec.pod properties if pod spec is passed
        (0, validateObjectProperties_1.ValidateObjectProperties)(options.spec.pod, CreateIndexPodSpecProperties);
        if (!options.spec.pod.environment) {
            throw new errors_1.PineconeArgumentError('You must pass an `environment` for the pod `spec` object in order to create an index.');
        }
        // pod indexes must have a dimension
        if (!options.dimension || options.dimension <= 0) {
            throw new errors_1.PineconeArgumentError('You must pass a positive `dimension` when creating a dense index.');
        }
        // pod indexes must be dense
        const vectorType = 'dense';
        if (options.vectorType && options.vectorType.toLowerCase() !== vectorType) {
            throw new errors_1.PineconeArgumentError('Pod indexes must have a `vectorType` of `dense`.');
        }
        if (!options.spec.pod.podType) {
            throw new errors_1.PineconeArgumentError('You must pass a `podType` for the pod `spec` object in order to create an index.');
        }
        if (options.spec.pod.replicas && options.spec.pod.replicas <= 0) {
            throw new errors_1.PineconeArgumentError('You must pass a positive integer for `replicas` in order to create an index.');
        }
        if (options.spec.pod.pods && options.spec.pod.pods <= 0) {
            throw new errors_1.PineconeArgumentError('You must pass a positive integer for `pods` in order to create an index.');
        }
        if (!types_1.ValidPodTypes.includes(options.spec.pod.podType)) {
            throw new errors_1.PineconeArgumentError(`Invalid pod type: ${options.spec.pod.podType}. Valid values are: ${types_1.ValidPodTypes.join(', ')}.`);
        }
    }
};
//# sourceMappingURL=createIndex.js.map