"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexForModel = void 0;
const db_control_1 = require("../pinecone-generated-ts-fetch/db_control");
const errors_1 = require("../errors");
const createIndex_1 = require("./createIndex");
const validateObjectProperties_1 = require("../utils/validateObjectProperties");
const CreateIndexForModelOptionsProperties = [
    'name',
    'cloud',
    'region',
    'embed',
    'deletionProtection',
    'tags',
    'waitUntilReady',
    'suppressConflicts',
];
const CreateIndexForModelEmbedProperties = [
    'model',
    'metric',
    'fieldMap',
    'readParameters',
    'writeParameters',
];
const createIndexForModel = (api) => {
    return async (options) => {
        if (!options) {
            throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`name`, `cloud`, `region`, and an `embed`)');
        }
        validateCreateIndexForModelRequest(options);
        try {
            const createResponse = await api.createIndexForModel({
                createIndexForModelRequest: options,
            });
            if (options.waitUntilReady) {
                return await (0, createIndex_1.waitUntilIndexIsReady)(api, createResponse.name);
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
exports.createIndexForModel = createIndexForModel;
const validateCreateIndexForModelRequest = (options) => {
    // validate options properties
    if (options) {
        (0, validateObjectProperties_1.ValidateObjectProperties)(options, CreateIndexForModelOptionsProperties);
    }
    if (!options.name) {
        throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `name` in order to create an index.');
    }
    if (!options.cloud) {
        throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `cloud` in order to create an index.');
    }
    if (options.cloud &&
        !Object.values(db_control_1.ServerlessSpecCloudEnum).includes(options.cloud)) {
        throw new errors_1.PineconeArgumentError(`Invalid cloud value: ${options.cloud}. Valid values are: ${Object.values(db_control_1.ServerlessSpecCloudEnum).join(', ')}.`);
    }
    if (!options.region) {
        throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `region` in order to create an index.');
    }
    if (!options.embed) {
        throw new errors_1.PineconeArgumentError('You must pass an `embed` object in order to create an index.');
    }
    // validate embed properties
    if (options.embed) {
        (0, validateObjectProperties_1.ValidateObjectProperties)(options.embed, CreateIndexForModelEmbedProperties);
    }
    if (options.embed.metric &&
        !Object.values(db_control_1.IndexModelMetricEnum).includes(options.embed.metric)) {
        {
            throw new errors_1.PineconeArgumentError(`Invalid metric value: ${options.embed.metric}. Valid values are: ${Object.values(db_control_1.IndexModelMetricEnum).join(', ')}.`);
        }
    }
};
//# sourceMappingURL=createIndexForModel.js.map