"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wireEncoder_1 = require("./wireEncoder");
const wireDecoder_1 = __importDefault(require("./wireDecoder"));
const constants_1 = require("./constants");
const api_1 = __importDefault(require("./api"));
const cache_1 = __importDefault(require("./cache"));
const errors_1 = require("./errors");
const _types_1 = require("./@types");
const schemaTypeResolver_1 = require("./schemaTypeResolver");
const DEFAULT_OPTS = {
    compatibility: constants_1.COMPATIBILITY.BACKWARD,
    separator: constants_1.DEFAULT_SEPARATOR,
};
class SchemaRegistry {
    constructor({ auth, clientId, host, retry, agent, middlewares }, options) {
        this.cacheMissRequests = {};
        this.api = (0, api_1.default)({ auth, clientId, host, retry, agent, middlewares });
        this.cache = new cache_1.default();
        this.options = options;
    }
    isConfluentSchema(schema) {
        return schema.schema != null;
    }
    getConfluentSchema(schema) {
        let confluentSchema;
        // convert data from old api (for backwards compatibility)
        if (!this.isConfluentSchema(schema)) {
            // schema is instanceof RawAvroSchema or AvroSchema
            confluentSchema = {
                type: _types_1.SchemaType.AVRO,
                schema: JSON.stringify(schema),
            };
        }
        else {
            confluentSchema = schema;
        }
        return confluentSchema;
    }
    async register(schema, userOpts) {
        const { compatibility, separator } = { ...DEFAULT_OPTS, ...userOpts };
        const confluentSchema = this.getConfluentSchema(schema);
        const helper = (0, schemaTypeResolver_1.helperTypeFromSchemaType)(confluentSchema.type);
        const options = await this.updateOptionsWithSchemaReferences(confluentSchema, this.options);
        const schemaInstance = (0, schemaTypeResolver_1.schemaFromConfluentSchema)(confluentSchema, options);
        helper.validate(schemaInstance);
        let isFirstTimeRegistration = false;
        let subject;
        if (userOpts === null || userOpts === void 0 ? void 0 : userOpts.subject) {
            subject = {
                name: userOpts.subject,
            };
        }
        else {
            subject = helper.getSubject(confluentSchema, schemaInstance, separator);
        }
        try {
            const response = await this.api.Subject.config({ subject: subject.name });
            const { compatibilityLevel } = response.data();
            if (compatibilityLevel.toUpperCase() !== compatibility) {
                throw new errors_1.ConfluentSchemaRegistryCompatibilityError(`Compatibility does not match the configuration (${compatibility} != ${compatibilityLevel.toUpperCase()})`);
            }
        }
        catch (error) {
            if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 404) {
                throw error;
            }
            else {
                isFirstTimeRegistration = true;
            }
        }
        const response = await this.api.Subject.register({
            subject: subject.name,
            body: {
                schemaType: confluentSchema.type === _types_1.SchemaType.AVRO ? undefined : confluentSchema.type,
                schema: confluentSchema.schema,
                references: confluentSchema.references,
            },
        });
        if (compatibility && isFirstTimeRegistration) {
            await this.api.Subject.updateConfig({ subject: subject.name, body: { compatibility } });
        }
        const registeredSchema = response.data();
        this.cache.setLatestRegistryId(subject.name, registeredSchema.id);
        this.cache.setSchema(registeredSchema.id, confluentSchema.type, schemaInstance);
        return registeredSchema;
    }
    async updateOptionsWithSchemaReferences(schema, options) {
        const helper = (0, schemaTypeResolver_1.helperTypeFromSchemaType)(schema.type);
        const referencedSchemas = await this.getreferencedSchemas(schema, helper);
        const protocolOptions = this.asProtocolOptions(options);
        return helper.updateOptionsFromSchemaReferences(referencedSchemas, protocolOptions);
    }
    asProtocolOptions(options) {
        if (!(options === null || options === void 0 ? void 0 : options.forSchemaOptions)) {
            return options;
        }
        return {
            [_types_1.SchemaType.AVRO]: options === null || options === void 0 ? void 0 : options.forSchemaOptions,
        };
    }
    async getreferencedSchemas(schema, helper) {
        const referencesSet = new Set();
        return this.getreferencedSchemasRecursive(schema, helper, referencesSet);
    }
    async getreferencedSchemasRecursive(schema, helper, referencesSet) {
        const references = schema.references || [];
        let referencedSchemas = [];
        for (const reference of references) {
            const schemas = await this.getreferencedSchemasFromReference(reference, helper, referencesSet);
            referencedSchemas = referencedSchemas.concat(schemas);
        }
        return referencedSchemas;
    }
    async getreferencedSchemasFromReference(reference, helper, referencesSet) {
        const { name, subject, version } = reference;
        const key = `${name}-${subject}-${version}`;
        // avoid duplicates
        if (referencesSet.has(key)) {
            return [];
        }
        referencesSet.add(key);
        const versionResponse = await this.api.Subject.version(reference);
        const foundSchema = versionResponse.data();
        const schema = helper.toConfluentSchema(foundSchema);
        const referencedSchemas = await this.getreferencedSchemasRecursive(schema, helper, referencesSet);
        referencedSchemas.push(schema);
        return referencedSchemas;
    }
    async _getSchema(registryId) {
        const cacheEntry = this.cache.getSchema(registryId);
        if (cacheEntry) {
            return cacheEntry;
        }
        const response = await this.getSchemaOriginRequest(registryId);
        const foundSchema = response.data();
        const schemaType = (0, schemaTypeResolver_1.schemaTypeFromString)(foundSchema.schemaType);
        const helper = (0, schemaTypeResolver_1.helperTypeFromSchemaType)(schemaType);
        const confluentSchema = helper.toConfluentSchema(foundSchema);
        const options = await this.updateOptionsWithSchemaReferences(confluentSchema, this.options);
        const schemaInstance = (0, schemaTypeResolver_1.schemaFromConfluentSchema)(confluentSchema, options);
        return this.cache.setSchema(registryId, schemaType, schemaInstance);
    }
    async getSchema(registryId) {
        return await (await this._getSchema(registryId)).schema;
    }
    async encode(registryId, payload) {
        if (!registryId) {
            throw new errors_1.ConfluentSchemaRegistryArgumentError(`Invalid registryId: ${JSON.stringify(registryId)}`);
        }
        const { schema } = await this._getSchema(registryId);
        try {
            const serializedPayload = schema.toBuffer(payload);
            return (0, wireEncoder_1.encode)(registryId, serializedPayload);
        }
        catch (error) {
            if (error instanceof errors_1.ConfluentSchemaRegistryValidationError)
                throw error;
            const paths = this.collectInvalidPaths(schema, payload);
            throw new errors_1.ConfluentSchemaRegistryValidationError(error, paths);
        }
    }
    collectInvalidPaths(schema, jsonPayload) {
        const paths = [];
        schema.isValid(jsonPayload, {
            errorHook: path => paths.push(path),
        });
        return paths;
    }
    async decode(buffer, options) {
        var _a;
        if (!Buffer.isBuffer(buffer)) {
            throw new errors_1.ConfluentSchemaRegistryArgumentError('Invalid buffer');
        }
        const { magicByte, registryId, payload } = (0, wireDecoder_1.default)(buffer);
        if (Buffer.compare(wireEncoder_1.MAGIC_BYTE, magicByte) !== 0) {
            throw new errors_1.ConfluentSchemaRegistryArgumentError(`Message encoded with magic byte ${JSON.stringify(magicByte)}, expected ${JSON.stringify(wireEncoder_1.MAGIC_BYTE)}`);
        }
        const { type, schema: writerSchema } = await this._getSchema(registryId);
        let rawReaderSchema;
        switch (type) {
            case _types_1.SchemaType.AVRO:
                rawReaderSchema = (_a = options === null || options === void 0 ? void 0 : options[_types_1.SchemaType.AVRO]) === null || _a === void 0 ? void 0 : _a.readerSchema;
        }
        if (rawReaderSchema) {
            const readerSchema = (0, schemaTypeResolver_1.schemaFromConfluentSchema)({ type: _types_1.SchemaType.AVRO, schema: rawReaderSchema }, this.options);
            if (readerSchema.equals(writerSchema)) {
                /* Even when schemas are considered equal by `avsc`,
                 * they still aren't interchangeable:
                 * provided `readerSchema` may have different `opts` (e.g. logicalTypes / unionWrap flags)
                 * see https://github.com/mtth/avsc/issues/362 */
                return readerSchema.fromBuffer(payload);
            }
            else {
                // decode using a resolver from writer type into reader type
                return readerSchema.fromBuffer(payload, readerSchema.createResolver(writerSchema));
            }
        }
        return writerSchema.fromBuffer(payload);
    }
    async getRegistryId(subject, version) {
        const response = await this.api.Subject.version({ subject, version });
        const { id } = response.data();
        return id;
    }
    async getRegistryIdBySchema(subject, schema) {
        try {
            const confluentSchema = this.getConfluentSchema(schema);
            const response = await this.api.Subject.registered({
                subject,
                body: {
                    schemaType: confluentSchema.type === _types_1.SchemaType.AVRO ? undefined : confluentSchema.type,
                    schema: confluentSchema.schema,
                },
            });
            const { id } = response.data();
            return id;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
                throw new errors_1.ConfluentSchemaRegistryError(error);
            }
            throw error;
        }
    }
    async getLatestSchemaId(subject) {
        const response = await this.api.Subject.latestVersion({ subject });
        const { id } = response.data();
        return id;
    }
    async getSchemaOriginRequest(registryId) {
        // ensure that cache-misses result in a single origin request
        const req = this.cacheMissRequests[registryId];
        if (req)
            return req;
        const request = this.api.Schema.find({ id: registryId }).finally(() => {
            delete this.cacheMissRequests[registryId];
        });
        this.cacheMissRequests[registryId] = request;
        return request;
    }
}
exports.default = SchemaRegistry;
//# sourceMappingURL=SchemaRegistry.js.map