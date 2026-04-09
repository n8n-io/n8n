"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromJsonSchema = exports.UnsupportedJsonSchemaError = void 0;
const fields = __importStar(require("./fields"));
const parquet_types_1 = require("../gen-nodejs/parquet_types");
const parquet_types_2 = require("../gen-nodejs/parquet_types");
/**
 * Simple check to make sure that `SupportedJSONSchema4` is correct.
 * There are a lot of JSON schema stuff we just don't support for now.
 */
const isJsonSchemaSupported = (js) => {
    const unsupportedFields = [
        '$ref',
        'multipleOf',
        'allOf',
        'anyOf',
        'oneOf',
        'not',
        'additionalItems',
        'enum',
        'extends',
    ];
    for (const field in unsupportedFields) {
        if (!(js[field] === undefined || js[field] === false)) {
            return false;
        }
    }
    return true;
};
/**
 * Error to capture all the unsupported edge cases
 */
class UnsupportedJsonSchemaError extends Error {
    constructor(msg) {
        const message = `Unsupported JSON schema: ${msg}`;
        super(message);
        this.name = 'UnsupportedJsonSchemaError';
    }
}
exports.UnsupportedJsonSchemaError = UnsupportedJsonSchemaError;
/**
 * Json Schema has required at the top level instead of field level
 */
const isJsonSchemaRequired = (jsonSchema) => (field) => {
    switch (jsonSchema.required) {
        case true:
            return true;
        case undefined:
        case false:
            return false;
    }
    return jsonSchema.required.includes(field);
};
/**
 * Converts the Array field type into the correct Field Definition
 */
const fromJsonSchemaArray = (fieldValue, optionalFieldList) => {
    if (!fieldValue.items || !fieldValue.items.type) {
        throw new UnsupportedJsonSchemaError('Array field with no values found.');
    }
    switch (fieldValue.items.type) {
        case 'string':
            if (fieldValue.items.format && fieldValue.items.format === 'date-time') {
                return fields.createListField('TIMESTAMP_MILLIS', optionalFieldList);
            }
            return fields.createListField('UTF8', optionalFieldList);
        case 'integer':
            return fields.createListField('INT64', optionalFieldList);
        case 'number':
            return fields.createListField('DOUBLE', optionalFieldList);
        case 'boolean':
            return fields.createListField('BOOLEAN', optionalFieldList);
        case 'object':
            // Handle array of time fields
            if (fieldValue.items.properties &&
                fieldValue.items.properties.unit &&
                fieldValue.items.properties.isAdjustedToUTC) {
                if (!fieldValue.items.properties.unit.enum) {
                    throw new UnsupportedJsonSchemaError('Unit enum is not defined');
                }
                const unit = fieldValue.items.properties.unit.default || fieldValue.items.properties.unit.enum[0];
                const isAdjustedToUTC = !!fieldValue.items.properties.isAdjustedToUTC.default;
                let timeUnit;
                switch (unit) {
                    case 'MICROS':
                        timeUnit = new parquet_types_1.TimeUnit({ MICROS: true });
                        break;
                    case 'NANOS':
                        timeUnit = new parquet_types_1.TimeUnit({ NANOS: true });
                        break;
                    default:
                        timeUnit = new parquet_types_1.TimeUnit({ MILLIS: true });
                        break;
                }
                const timeLogicalType = new parquet_types_2.TimeType({ isAdjustedToUTC, unit: timeUnit });
                return fields.createTimeField(timeLogicalType, optionalFieldList);
            }
            return fields.createStructListField((0, exports.fromJsonSchema)(fieldValue.items), optionalFieldList);
        default:
            throw new UnsupportedJsonSchemaError(`Array field type ${JSON.stringify(fieldValue.items)} is unsupported.`);
    }
};
/**
 * Converts a field from a JSON Schema into a Parquet Field Definition
 */
const fromJsonSchemaField = (jsonSchema) => (fieldName, fieldValue) => {
    if (!isJsonSchemaSupported(fieldValue)) {
        throw new UnsupportedJsonSchemaError(`Field: ${fieldName} has an unsupported schema`);
    }
    const optional = !isJsonSchemaRequired(jsonSchema)(fieldName);
    switch (fieldValue.type) {
        case 'string':
            if (fieldValue.format && fieldValue.format === 'date-time') {
                return fields.createTimestampField(optional);
            }
            return fields.createStringField(optional);
        case 'integer':
            return fields.createIntField(64, optional);
        case 'number':
            return fields.createDoubleField(optional);
        case 'boolean':
            return fields.createBooleanField(optional);
        case 'array':
            return fromJsonSchemaArray(fieldValue, optional);
        case 'object':
            if (fieldValue.properties && fieldValue.properties.unit && fieldValue.properties.isAdjustedToUTC) {
                if (!fieldValue.properties.unit.enum) {
                    throw new UnsupportedJsonSchemaError('Unit enum is not defined');
                }
                const unit = fieldValue.properties.unit.default || fieldValue.properties.unit.enum[0];
                const isAdjustedToUTC = !!fieldValue.properties.isAdjustedToUTC.default;
                let timeUnit;
                switch (unit) {
                    case 'MICROS':
                        timeUnit = new parquet_types_1.TimeUnit({ MICROS: true });
                        break;
                    case 'NANOS':
                        timeUnit = new parquet_types_1.TimeUnit({ NANOS: true });
                        break;
                    default:
                        timeUnit = new parquet_types_1.TimeUnit({ MILLIS: true });
                        break;
                }
                const timeLogicalType = new parquet_types_2.TimeType({ isAdjustedToUTC, unit: timeUnit });
                return fields.createTimeField(timeLogicalType, optional);
            }
            return fields.createStructField((0, exports.fromJsonSchema)(fieldValue), optional);
        default:
            throw new UnsupportedJsonSchemaError(`Unable to convert "${fieldName}" with JSON Schema type "${fieldValue.type}" to a Parquet Schema.`);
    }
};
/**
 * Converts supported Json Schemas into Parquet Schema Definitions
 */
const fromJsonSchema = (jsonSchema) => {
    if (!isJsonSchemaSupported(jsonSchema)) {
        throw new UnsupportedJsonSchemaError('Unsupported fields found');
    }
    const schema = {};
    const fromField = fromJsonSchemaField(jsonSchema);
    for (const [fieldName, fieldValue] of Object.entries(jsonSchema.properties || {})) {
        schema[fieldName] = fromField(fieldName, fieldValue);
    }
    return schema;
};
exports.fromJsonSchema = fromJsonSchema;
