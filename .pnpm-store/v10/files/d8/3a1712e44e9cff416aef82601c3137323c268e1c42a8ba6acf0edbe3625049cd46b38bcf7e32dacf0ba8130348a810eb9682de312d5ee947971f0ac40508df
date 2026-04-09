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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParquetFormatter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const parquetjs_1 = require("@dsnp/parquetjs");
const __1 = require("../");
const DYNAMIC_FIELD = '$meta';
/**
 * Maps a Milvus DataType to a @dsnp/parquetjs schema field definition.
 * Follows the same mapping as pymilvus ARROW_TYPE_CREATOR.
 */
function parquetFieldDef(dt) {
    switch (dt) {
        case __1.DataType.Bool:
            return { type: 'BOOLEAN' };
        case __1.DataType.Int8:
            return { type: 'INT_8' };
        case __1.DataType.Int16:
            return { type: 'INT_16' };
        case __1.DataType.Int32:
            return { type: 'INT32' };
        case __1.DataType.Int64:
            return { type: 'INT64' };
        case __1.DataType.Float:
            return { type: 'FLOAT' };
        case __1.DataType.Double:
            return { type: 'DOUBLE' };
        // VarChar, JSON, Geometry, Timestamptz, SparseFloatVector → UTF8 string
        case __1.DataType.VarChar:
        case __1.DataType.JSON:
        case __1.DataType.Geometry:
        case __1.DataType.Timestamptz:
        case __1.DataType.SparseFloatVector:
            return { type: 'UTF8' };
        // Vectors → LIST of element type
        case __1.DataType.FloatVector:
            return listOf('FLOAT');
        case __1.DataType.BinaryVector:
        case __1.DataType.Float16Vector:
        case __1.DataType.BFloat16Vector:
            return listOf('UINT_8');
        case __1.DataType.Int8Vector:
            return listOf('INT_8');
        default:
            return { type: 'UTF8' }; // fallback: JSON stringify
    }
}
/** Helper to create a LIST schema field. */
function listOf(elementType) {
    return {
        type: 'LIST',
        fields: {
            list: {
                repeated: true,
                fields: {
                    element: { type: elementType },
                },
            },
        },
    };
}
/** Create a LIST of struct schema for Array<Struct> fields. */
function listOfStruct(subFields) {
    const elementFields = {};
    for (const sf of subFields) {
        const sfDt = (0, __1.convertToDataType)(sf.data_type);
        elementFields[sf.name] = parquetFieldDef(sfDt);
    }
    return {
        type: 'LIST',
        fields: {
            list: {
                repeated: true,
                fields: {
                    element: {
                        fields: elementFields,
                    },
                },
            },
        },
    };
}
/**
 * Build a ParquetSchema from a BulkWriterSchema.
 * Matches pymilvus _deduce_arrow_schema behavior.
 */
function buildParquetSchema(schema) {
    const schemaDef = {};
    const activeFields = schema.fields.filter(f => !f.autoID && !f.is_function_output);
    for (const field of activeFields) {
        const dt = (0, __1.convertToDataType)(field.data_type);
        if (dt === __1.DataType.Array) {
            const et = field.element_type
                ? (0, __1.convertToDataType)(field.element_type)
                : null;
            if (et === __1.DataType.Struct && field.fields) {
                // Array<Struct>
                schemaDef[field.name] = listOfStruct(field.fields);
            }
            else if (et !== null) {
                // Array<scalar>
                const elementDef = parquetFieldDef(et);
                schemaDef[field.name] = listOf(elementDef.type);
            }
            else {
                schemaDef[field.name] = { type: 'UTF8' }; // fallback
            }
        }
        else {
            schemaDef[field.name] = parquetFieldDef(dt);
        }
    }
    // Dynamic field column
    if (schema.enable_dynamic_field) {
        schemaDef[DYNAMIC_FIELD] = { type: 'UTF8' };
    }
    return new parquetjs_1.ParquetSchema(schemaDef);
}
/** Wrap an array as parquetjs LIST format: { list: [{ element: v }, ...] } */
function wrapList(arr) {
    return { list: arr.map(v => ({ element: v })) };
}
/**
 * Normalize a value for Parquet serialization.
 * - JSON, Sparse, Timestamptz(Date) → string
 * - Vectors → LIST wrapped
 * - Float16/BFloat16 Uint8Array → LIST of uint8
 * - Int8Array → LIST of int8
 * - Array → LIST wrapped
 * - Array<Struct> → LIST of struct wrapped
 * - Int64 → BigInt
 */
function normalizeForParquet(val, field, dt) {
    if (val === null || val === undefined)
        return null;
    switch (dt) {
        case __1.DataType.JSON:
            return JSON.stringify(val);
        case __1.DataType.SparseFloatVector:
            return JSON.stringify(normalizeSparseForParquet(val));
        case __1.DataType.Timestamptz:
            if (val instanceof Date)
                return val.toISOString();
            return val;
        case __1.DataType.Geometry:
            return val;
        case __1.DataType.Int64:
            return BigInt(val);
        case __1.DataType.FloatVector:
            return wrapList(val);
        case __1.DataType.BinaryVector:
            return wrapList(val);
        case __1.DataType.Float16Vector:
        case __1.DataType.BFloat16Vector:
            if (val instanceof Uint8Array) {
                return wrapList(Array.from(val));
            }
            // number[] → need to convert to bytes (uint8)
            // For Parquet, Float16/BFloat16 are stored as raw bytes
            return wrapList(val);
        case __1.DataType.Int8Vector:
            if (val instanceof Int8Array) {
                return wrapList(Array.from(val));
            }
            return wrapList(val);
        case __1.DataType.Array: {
            const et = field.element_type
                ? (0, __1.convertToDataType)(field.element_type)
                : null;
            if (et === __1.DataType.Struct && Array.isArray(val) && field.fields) {
                // Array<Struct> → normalize each struct's sub-field values
                const subFieldMap = new Map(field.fields.map(sf => [sf.name, sf]));
                return {
                    list: val.map((item) => {
                        const normalized = {};
                        for (const [k, v] of Object.entries(item)) {
                            const sf = subFieldMap.get(k);
                            if (sf) {
                                const sfDt = (0, __1.convertToDataType)(sf.data_type);
                                normalized[k] = normalizeForParquet(v, sf, sfDt);
                            }
                            else {
                                normalized[k] = v;
                            }
                        }
                        return { element: normalized };
                    }),
                };
            }
            // Array<Int64> → elements need BigInt conversion
            if (et === __1.DataType.Int64 && Array.isArray(val)) {
                return wrapList(val.map((v) => BigInt(v)));
            }
            // Array<scalar>
            if (Array.isArray(val)) {
                return wrapList(val);
            }
            return val;
        }
        // Struct as top-level field → JSON string (schema maps to UTF8)
        case __1.DataType.Struct:
            return JSON.stringify(val);
        default:
            return val;
    }
}
/** Normalize sparse vector to dict format (same as JsonFormatter). */
function normalizeSparseForParquet(val) {
    if (val === null || val === undefined)
        return val;
    if (!Array.isArray(val) &&
        typeof val === 'object' &&
        !('indices' in val && 'values' in val)) {
        return val;
    }
    if (typeof val === 'object' &&
        !Array.isArray(val) &&
        'indices' in val &&
        'values' in val) {
        const dict = {};
        for (let i = 0; i < val.indices.length; i++) {
            dict[String(val.indices[i])] = val.values[i];
        }
        return dict;
    }
    if (Array.isArray(val) &&
        val.length > 0 &&
        typeof val[0] === 'object' &&
        'index' in val[0]) {
        const dict = {};
        for (const item of val) {
            dict[String(item.index)] = item.value;
        }
        return dict;
    }
    if (Array.isArray(val)) {
        const dict = {};
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== undefined && val[i] !== null) {
                dict[String(i)] = val[i];
            }
        }
        return dict;
    }
    return val;
}
class ParquetFormatter {
    constructor() {
        this.extension = '.parquet';
    }
    persist(columns, dynamicRows, rowCount, dir, schema) {
        return __awaiter(this, void 0, void 0, function* () {
            fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `data${this.extension}`);
            const parquetSchema = buildParquetSchema(schema);
            // Pre-compute field metadata
            const activeFields = schema.fields.filter(f => !f.autoID && !f.is_function_output);
            const fieldMap = new Map(activeFields.map(f => [f.name, f]));
            const fieldDataTypes = new Map(activeFields.map(f => [f.name, (0, __1.convertToDataType)(f.data_type)]));
            const fieldNames = [...columns.keys()];
            const hasDynamic = schema.enable_dynamic_field && dynamicRows.length > 0;
            const writer = yield parquetjs_1.ParquetWriter.openFile(parquetSchema, filePath);
            for (let i = 0; i < rowCount; i++) {
                const row = {};
                for (const name of fieldNames) {
                    const val = columns.get(name)[i];
                    const field = fieldMap.get(name);
                    if (field) {
                        const dt = fieldDataTypes.get(name);
                        row[name] = normalizeForParquet(val, field, dt);
                    }
                    else {
                        row[name] = val;
                    }
                }
                // Dynamic field → JSON string in $meta column
                if (hasDynamic && dynamicRows[i]) {
                    const dyn = dynamicRows[i];
                    row[DYNAMIC_FIELD] =
                        Object.keys(dyn).length > 0 ? JSON.stringify(dyn) : '{}';
                }
                else if (schema.enable_dynamic_field) {
                    row[DYNAMIC_FIELD] = '{}';
                }
                yield writer.appendRow(row);
            }
            yield writer.close();
            return [filePath];
        });
    }
}
exports.ParquetFormatter = ParquetFormatter;
//# sourceMappingURL=ParquetFormatter.js.map