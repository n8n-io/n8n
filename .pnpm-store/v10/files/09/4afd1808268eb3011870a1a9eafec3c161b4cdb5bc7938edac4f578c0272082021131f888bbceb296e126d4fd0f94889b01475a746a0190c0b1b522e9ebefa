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
exports.ParquetSchema = void 0;
const parquet_codec = __importStar(require("./codec"));
const parquet_compression = __importStar(require("./compression"));
const parquet_types = __importStar(require("./types"));
const jsonSchema_1 = require("./jsonSchema");
/**
 * A parquet file schema
 */
class ParquetSchema {
    schema;
    fields;
    fieldList;
    /**
     * Create a new schema from JSON Schema (json-schema.org)
     */
    static fromJsonSchema(jsonSchema) {
        const schema = (0, jsonSchema_1.fromJsonSchema)(jsonSchema);
        return new ParquetSchema(schema);
    }
    /**
     * Create a new schema from a JSON schema definition
     */
    constructor(schema) {
        this.schema = schema;
        this.fields = buildFields(schema);
        this.fieldList = listFields(this.fields);
    }
    /**
     * Retrieve a field definition
     */
    findField(path) {
        if (typeof path === 'string') {
            path = path.split(',');
        }
        else {
            path = path.slice(0); // clone array
        }
        let n = this.fields;
        for (; path.length > 1; path.shift()) {
            const fields = n[path[0]]?.fields;
            if (isDefined(fields)) {
                n = fields;
            }
        }
        return n[path[0]];
    }
    /**
     * Retrieve a field definition and all the field's ancestors
     */
    findFieldBranch(path) {
        if (typeof path === 'string') {
            path = path.split(',');
        }
        const branch = [];
        let n = this.fields;
        for (; path.length > 0; path.shift()) {
            branch.push(n[path[0]]);
            const fields = n[path[0]].fields;
            if (path.length > 1 && isDefined(fields)) {
                n = fields;
            }
        }
        return branch;
    }
}
exports.ParquetSchema = ParquetSchema;
function buildFields(schema, rLevelParentMax, dLevelParentMax, path) {
    if (!rLevelParentMax) {
        rLevelParentMax = 0;
    }
    if (!dLevelParentMax) {
        dLevelParentMax = 0;
    }
    if (!path) {
        path = [];
    }
    const fieldList = {};
    let fieldErrors = [];
    for (const name in schema) {
        const opts = schema[name];
        /* field repetition type */
        const required = !opts.optional;
        const repeated = !!opts.repeated;
        let rLevelMax = rLevelParentMax;
        let dLevelMax = dLevelParentMax;
        let repetitionType = 'REQUIRED';
        if (!required) {
            repetitionType = 'OPTIONAL';
            ++dLevelMax;
        }
        if (repeated) {
            repetitionType = 'REPEATED';
            ++rLevelMax;
            if (required) {
                ++dLevelMax;
            }
        }
        /* nested field */
        if (opts.fields) {
            fieldList[name] = {
                name: name,
                path: path.concat(name),
                repetitionType: repetitionType,
                rLevelMax: rLevelMax,
                dLevelMax: dLevelMax,
                isNested: true,
                statistics: opts.statistics,
                fieldCount: Object.keys(opts.fields).length,
                fields: buildFields(opts.fields, rLevelMax, dLevelMax, path.concat(name)),
                logicalType: opts.logicalType,
            };
            if (opts.type == 'LIST' || opts.type == 'MAP')
                fieldList[name].originalType = opts.type;
            continue;
        }
        let nameWithPath = `${name}` || 'missing name';
        if (path && path.length > 0) {
            nameWithPath = `${path}.${nameWithPath}`;
        }
        const typeDef = opts.type ? parquet_types.getParquetTypeDataObject(opts.type, opts) : undefined;
        if (!typeDef) {
            fieldErrors.push(`Invalid parquet type: ${opts.type || 'missing type'}, for Column: ${nameWithPath}`);
            continue;
        }
        /* field encoding */
        if (!opts.encoding) {
            opts.encoding = 'PLAIN';
        }
        if (!(opts.encoding in parquet_codec)) {
            fieldErrors.push(`Unsupported parquet encoding: ${opts.encoding}, for Column: ${nameWithPath}`);
        }
        if (!opts.compression) {
            opts.compression = 'UNCOMPRESSED';
        }
        if (!(opts.compression in parquet_compression.PARQUET_COMPRESSION_METHODS)) {
            fieldErrors.push(`Unsupported compression method: ${opts.compression}, for Column: ${nameWithPath}`);
        }
        if (typeDef.originalType === 'DECIMAL') {
            // Default scale to 0 per https://github.com/apache/parquet-format/blob/master/LogicalTypes.md#decimal
            if (typeof opts.scale === 'undefined')
                opts.scale = 0;
            fieldErrors = fieldErrors.concat(errorsForDecimalOpts(typeDef.originalType, typeDef.primitiveType, opts, nameWithPath));
        }
        /* add to schema */
        fieldList[name] = {
            name: name,
            primitiveType: typeDef.primitiveType,
            originalType: typeDef.originalType,
            logicalType: opts.logicalType,
            path: path.concat([name]),
            repetitionType: repetitionType,
            encoding: opts.encoding,
            statistics: opts.statistics,
            compression: opts.compression,
            precision: opts.precision,
            scale: opts.scale,
            typeLength: opts.typeLength || typeDef.typeLength,
            rLevelMax: rLevelMax,
            dLevelMax: dLevelMax,
        };
    }
    if (fieldErrors.length > 0) {
        throw fieldErrors.reduce((accumulator, currentVal) => accumulator + '\n' + currentVal);
    }
    return fieldList;
}
function listFields(fields) {
    let list = [];
    for (const k in fields) {
        list.push(fields[k]);
        const nestedFields = fields[k].fields;
        if (fields[k].isNested && isDefined(nestedFields)) {
            list = list.concat(listFields(nestedFields));
        }
    }
    return list;
}
function isDefined(val) {
    return val !== undefined;
}
function errorsForDecimalOpts(type, primitiveType, opts, columnName) {
    const fieldErrors = [];
    if (opts.precision === undefined || opts.precision < 1) {
        fieldErrors.push(`invalid schema for type: ${type}, for Column: ${columnName}, precision is required and must be be greater than 0`);
    }
    else if (!Number.isInteger(opts.precision)) {
        fieldErrors.push(`invalid schema for type: ${type}, for Column: ${columnName}, precision must be an integer`);
    }
    else if (primitiveType === 'INT64' && opts.precision > 18) {
        fieldErrors.push(`invalid schema for type: ${type} and primitive type: ${primitiveType} for Column: ${columnName}, can not handle precision over 18`);
    }
    if (typeof opts.scale === 'undefined' || opts.scale < 0) {
        fieldErrors.push(`invalid schema for type: ${type}, for Column: ${columnName}, scale is required to be 0 or greater`);
    }
    else if (!Number.isInteger(opts.scale)) {
        fieldErrors.push(`invalid schema for type: ${type}, for Column: ${columnName}, scale must be an integer`);
    }
    else if (opts.precision !== undefined && opts.scale > opts.precision) {
        fieldErrors.push(`invalid schema or precision for type: ${type}, for Column: ${columnName}, precision must be greater than or equal to scale`);
    }
    return fieldErrors;
}
