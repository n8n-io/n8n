"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonSchema = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const FileSystem_1 = require("./FileSystem");
const JsonFile_1 = require("./JsonFile");
const ajv_1 = __importDefault(require("ajv"));
const ajv_draft_04_1 = __importDefault(require("ajv-draft-04"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
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
class JsonSchema {
    constructor() {
        this._dependentSchemas = [];
        this._filename = '';
        this._validator = undefined;
        this._schemaObject = undefined;
        this._schemaVersion = undefined;
        this._customFormats = undefined;
    }
    /**
     * Registers a JsonSchema that will be loaded from a file on disk.
     * @remarks
     * NOTE: An error occurs if the file does not exist; however, the file itself is not loaded or validated
     * until it the schema is actually used.
     */
    static fromFile(filename, options) {
        // This is a quick and inexpensive test to avoid the catch the most common errors early.
        // Full validation will happen later in JsonSchema.compile().
        if (!FileSystem_1.FileSystem.exists(filename)) {
            throw new Error('Schema file not found: ' + filename);
        }
        const schema = new JsonSchema();
        schema._filename = filename;
        if (options) {
            schema._dependentSchemas = options.dependentSchemas || [];
            schema._schemaVersion = options.schemaVersion;
            schema._customFormats = options.customFormats;
        }
        return schema;
    }
    /**
     * Registers a JsonSchema that will be loaded from an object.
     */
    static fromLoadedObject(schemaObject, options) {
        const schema = new JsonSchema();
        schema._schemaObject = schemaObject;
        if (options) {
            schema._dependentSchemas = options.dependentSchemas || [];
            schema._schemaVersion = options.schemaVersion;
            schema._customFormats = options.customFormats;
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
                    validator = new ajv_draft_04_1.default(validatorOptions);
                    break;
                }
                case 'draft-07':
                default: {
                    validator = new ajv_1.default(validatorOptions);
                    break;
                }
            }
            // Enable json-schema format validation
            // https://ajv.js.org/packages/ajv-formats.html
            (0, ajv_formats_1.default)(validator);
            if (this._customFormats) {
                for (const [name, format] of Object.entries(this._customFormats)) {
                    validator.addFormat(name, Object.assign(Object.assign({}, format), { async: false }));
                }
            }
            const collectedSchemas = [];
            const seenObjects = new Set();
            const seenIds = new Set();
            JsonSchema._collectDependentSchemas(collectedSchemas, this._dependentSchemas, seenObjects, seenIds);
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
            $schema } = jsonObject, remainder = __rest(jsonObject, ["$schema"]);
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
            this._schemaObject = JsonFile_1.JsonFile.load(this._filename);
        }
        return this._schemaObject.id || this._schemaObject.$id || '';
    }
}
exports.JsonSchema = JsonSchema;
//# sourceMappingURL=JsonSchema.js.map