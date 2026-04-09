// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as os from 'node:os';
import * as path from 'node:path';
import Ajv from 'ajv';
import AjvDraft04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { JsonFile } from './JsonFile';
import { FileSystem } from './FileSystem';
/**
 * Pattern matching JSON Schema vendor extension keywords in the form `x-<vendor>-<keyword>`,
 * where `<vendor>` is alphanumeric and `<keyword>` is kebab-case alphanumeric.
 * @example `x-tsdoc-release-tag`, `x-myvendor-description`
 */
const VENDOR_EXTENSION_KEY_PATTERN = /^x-[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)*$/;
/**
 * Collects top-level property keys from a JSON object that match the vendor extension
 * pattern `x-<vendor>-<keyword>`.  Only root-level keys are inspected for performance.
 */
function _collectVendorExtensionKeywords(obj, keywords) {
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
            if (VENDOR_EXTENSION_KEY_PATTERN.test(key)) {
                keywords.add(key);
            }
        }
    }
}
const JSON_SCHEMA_URL_PREFIX_BY_JSON_SCHEMA_VERSION = new Map([
    ['draft-04', 'http://json-schema.org/draft-04/schema'],
    ['draft-07', 'http://json-schema.org/draft-07/schema']
]);
/**
 * Helper function to determine the json-schema version to target for validation.
 */
function _inferJsonSchemaVersion({ $schema }) {
    if ($schema) {
        for (const [jsonSchemaVersion, urlPrefix] of JSON_SCHEMA_URL_PREFIX_BY_JSON_SCHEMA_VERSION) {
            if ($schema.startsWith(urlPrefix)) {
                return jsonSchemaVersion;
            }
        }
    }
}
/**
 * Represents a JSON schema that can be used to validate JSON data files loaded by the JsonFile class.
 * @remarks
 * The schema itself is normally loaded and compiled later, only if it is actually required to validate
 * an input.  To avoid schema errors at runtime, it's recommended to create a unit test that calls
 * JsonSchema.ensureCompiled() for each of your schema objects.
 *
 * @public
 */
export class JsonSchema {
    constructor() {
        this._dependentSchemas = [];
        this._filename = '';
        this._validator = undefined;
        this._schemaObject = undefined;
        this._schemaVersion = undefined;
        this._customFormats = undefined;
        this._rejectVendorExtensionKeywords = false;
    }
    /**
     * Registers a JsonSchema that will be loaded from a file on disk.
     * @remarks
     * NOTE: An error occurs if the file does not exist; however, the file itself is not loaded or validated
     * until it the schema is actually used.
     */
    static fromFile(filename, options) {
        var _a;
        // This is a quick and inexpensive test to avoid the catch the most common errors early.
        // Full validation will happen later in JsonSchema.compile().
        if (!FileSystem.exists(filename)) {
            throw new Error('Schema file not found: ' + filename);
        }
        const schema = new JsonSchema();
        schema._filename = filename;
        if (options) {
            schema._dependentSchemas = options.dependentSchemas || [];
            schema._schemaVersion = options.schemaVersion;
            schema._customFormats = options.customFormats;
            schema._rejectVendorExtensionKeywords = (_a = options.rejectVendorExtensionKeywords) !== null && _a !== void 0 ? _a : false;
        }
        return schema;
    }
    /**
     * Registers a JsonSchema that will be loaded from an object.
     */
    static fromLoadedObject(schemaObject, options) {
        var _a;
        const schema = new JsonSchema();
        schema._schemaObject = schemaObject;
        if (options) {
            schema._dependentSchemas = options.dependentSchemas || [];
            schema._schemaVersion = options.schemaVersion;
            schema._customFormats = options.customFormats;
            schema._rejectVendorExtensionKeywords = (_a = options.rejectVendorExtensionKeywords) !== null && _a !== void 0 ? _a : false;
        }
        return schema;
    }
    static _collectDependentSchemas(collectedSchemas, dependentSchemas, seenObjects, seenIds) {
        for (const dependentSchema of dependentSchemas) {
            // It's okay for the same schema to appear multiple times in the tree, but we only process it once
            if (seenObjects.has(dependentSchema)) {
                continue;
            }
            seenObjects.add(dependentSchema);
            const schemaId = dependentSchema._ensureLoaded();
            if (schemaId === '') {
                throw new Error(`This schema ${dependentSchema.shortName} cannot be referenced` +
                    ' because is missing the "id" (draft-04) or "$id" field');
            }
            if (seenIds.has(schemaId)) {
                throw new Error(`This schema ${dependentSchema.shortName} has the same "id" (draft-04) or "$id" as another schema in this set`);
            }
            seenIds.add(schemaId);
            collectedSchemas.push(dependentSchema);
            JsonSchema._collectDependentSchemas(collectedSchemas, dependentSchema._dependentSchemas, seenObjects, seenIds);
        }
    }
    /**
     * Used to nicely format the ZSchema error tree.
     */
    static _formatErrorDetails(errorDetails) {
        return JsonSchema._formatErrorDetailsHelper(errorDetails, '', '');
    }
    /**
     * Used by _formatErrorDetails.
     */
    static _formatErrorDetailsHelper(errorDetails, indent, buffer) {
        var _a, _b;
        for (const errorDetail of errorDetails) {
            buffer += os.EOL + indent + `Error: #${errorDetail.instancePath}`;
            buffer += os.EOL + indent + `       ${errorDetail.message}`;
            if ((_a = errorDetail.params) === null || _a === void 0 ? void 0 : _a.additionalProperty) {
                buffer += `: ${(_b = errorDetail.params) === null || _b === void 0 ? void 0 : _b.additionalProperty}`;
            }
        }
        return buffer;
    }
    /**
     * Returns a short name for this schema, for use in error messages.
     * @remarks
     * If the schema was loaded from a file, then the base filename is used.  Otherwise, the "$id"
     * field is used if available.
     */
    get shortName() {
        if (!this._filename) {
            if (this._schemaObject) {
                const schemaWithId = this._schemaObject;
                if (schemaWithId.id) {
                    return schemaWithId.id;
                }
                else if (schemaWithId.$id) {
                    return schemaWithId.$id;
                }
            }
            return '(anonymous schema)';
        }
        else {
            return path.basename(this._filename);
        }
    }
    /**
     * If not already done, this loads the schema from disk and compiles it.
     * @remarks
     * Any dependencies will be compiled as well.
     */
    ensureCompiled() {
        var _a;
        this._ensureLoaded();
        if (!this._validator) {
            const targetSchemaVersion = (_a = this._schemaVersion) !== null && _a !== void 0 ? _a : _inferJsonSchemaVersion(this._schemaObject);
            const validatorOptions = {
                strictSchema: true,
                allowUnionTypes: true
            };
            let validator;
            // Keep legacy support for older draft-04 schema
            switch (targetSchemaVersion) {
                case 'draft-04': {
                    validator = new AjvDraft04(validatorOptions);
                    break;
                }
                case 'draft-07':
                default: {
                    validator = new Ajv(validatorOptions);
                    break;
                }
            }
            // Enable json-schema format validation
            // https://ajv.js.org/packages/ajv-formats.html
            addFormats(validator);
            if (this._customFormats) {
                for (const [name, format] of Object.entries(this._customFormats)) {
                    validator.addFormat(name, { ...format, async: false });
                }
            }
            const collectedSchemas = [];
            const seenObjects = new Set();
            const seenIds = new Set();
            JsonSchema._collectDependentSchemas(collectedSchemas, this._dependentSchemas, seenObjects, seenIds);
            // Unless explicitly rejected, scan the top-level keys of each schema for vendor
            // extension keys matching the x-<vendor>-<keyword> pattern and register them with
            // AJV so that strict mode does not reject them as unknown keywords.
            if (!this._rejectVendorExtensionKeywords) {
                const vendorKeywords = new Set();
                _collectVendorExtensionKeywords(this._schemaObject, vendorKeywords);
                for (const collectedSchema of collectedSchemas) {
                    _collectVendorExtensionKeywords(collectedSchema._schemaObject, vendorKeywords);
                }
                for (const keyword of vendorKeywords) {
                    validator.addKeyword(keyword);
                }
            }
            // Validate each schema in order.  We specifically do not supply them all together, because we want
            // to make sure that circular references will fail to validate.
            for (const collectedSchema of collectedSchemas) {
                validator.validateSchema(collectedSchema._schemaObject);
                if (validator.errors && validator.errors.length > 0) {
                    throw new Error(`Failed to validate schema "${collectedSchema.shortName}":` +
                        os.EOL +
                        JsonSchema._formatErrorDetails(validator.errors));
                }
                validator.addSchema(collectedSchema._schemaObject);
            }
            this._validator = validator.compile(this._schemaObject);
        }
    }
    /**
     * Validates the specified JSON object against this JSON schema.  If the validation fails,
     * an exception will be thrown.
     * @param jsonObject - The JSON data to be validated
     * @param filenameForErrors - The filename that the JSON data was available, or an empty string
     *    if not applicable
     * @param options - Other options that control the validation
     */
    validateObject(jsonObject, filenameForErrors, options) {
        this.validateObjectWithCallback(jsonObject, (errorInfo) => {
            var _a;
            const prefix = (_a = options === null || options === void 0 ? void 0 : options.customErrorHeader) !== null && _a !== void 0 ? _a : 'JSON validation failed:';
            throw new Error(prefix + os.EOL + filenameForErrors + os.EOL + errorInfo.details);
        }, options);
    }
    /**
     * Validates the specified JSON object against this JSON schema.  If the validation fails,
     * a callback is called for each validation error.
     */
    validateObjectWithCallback(jsonObject, errorCallback, options) {
        this.ensureCompiled();
        if (options === null || options === void 0 ? void 0 : options.ignoreSchemaField) {
            const { 
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            $schema, ...remainder } = jsonObject;
            jsonObject = remainder;
        }
        if (this._validator && !this._validator(jsonObject)) {
            const errorDetails = JsonSchema._formatErrorDetails(this._validator.errors);
            const args = {
                details: errorDetails
            };
            errorCallback(args);
        }
    }
    _ensureLoaded() {
        if (!this._schemaObject) {
            this._schemaObject = JsonFile.load(this._filename);
        }
        return this._schemaObject.id || this._schemaObject.$id || '';
    }
}
//# sourceMappingURL=JsonSchema.js.map