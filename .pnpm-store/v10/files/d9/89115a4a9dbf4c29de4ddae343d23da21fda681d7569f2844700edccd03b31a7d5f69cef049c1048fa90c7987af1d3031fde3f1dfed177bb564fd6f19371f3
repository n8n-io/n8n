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
exports.JsonFormatter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const promises_1 = require("stream/promises");
const __1 = require("../");
// Marker for Int64 values to bypass JSON.stringify precision loss.
// JSON.stringify cannot output integers > Number.MAX_SAFE_INTEGER without
// losing precision. We wrap Int64 values in markers, stringify normally,
// then strip the quotes+markers to produce bare integer literals.
const INT64_PREFIX = '___INT64_';
const INT64_SUFFIX = '_INT64___';
const INT64_REGEX = new RegExp(`"${INT64_PREFIX}(-?\\d+)${INT64_SUFFIX}"`, 'g');
/**
 * Normalize a sparse vector (any SDK format) to dict format { "index": value }
 * which is what Milvus bulkInsert expects.
 */
function normalizeSparseVector(val) {
    if (val === null || val === undefined)
        return val;
    // Already dict format: { "2": 0.5, "5": 0.3 }
    if (!Array.isArray(val) &&
        typeof val === 'object' &&
        !('indices' in val && 'values' in val)) {
        return val;
    }
    // CSR format: { indices: [2, 5], values: [0.5, 0.3] }
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
    // COO format: [{ index: 2, value: 0.5 }, ...]
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
    // Array format: [undefined, 0.0, 0.5, 0.3, undefined, 0.2]
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
/**
 * Normalize a field value for JSON serialization.
 * Handles typed arrays, sparse vector format conversion, and Int64 precision.
 */
function normalizeValue(val, field) {
    if (val === null || val === undefined)
        return val;
    const dt = (0, __1.convertToDataType)(field.data_type);
    switch (dt) {
        // Typed arrays → regular arrays
        case __1.DataType.Float16Vector:
        case __1.DataType.BFloat16Vector:
            if (val instanceof Uint8Array) {
                return Array.from(val);
            }
            return val;
        case __1.DataType.Int8Vector:
            if (val instanceof Int8Array) {
                return Array.from(val);
            }
            return val;
        // Sparse vector → dict format
        case __1.DataType.SparseFloatVector:
            return normalizeSparseVector(val);
        // Date object → ISO string
        case __1.DataType.Timestamptz:
            if (val instanceof Date) {
                return val.toISOString();
            }
            return val;
        // Int64: wrap in marker to preserve precision through JSON.stringify
        // Handles: number, string (from gRPC query), BigInt, Long objects
        case __1.DataType.Int64:
            return `${INT64_PREFIX}${String(val)}${INT64_SUFFIX}`;
        // Array: normalize elements based on element_type
        case __1.DataType.Array: {
            if (!Array.isArray(val))
                return val;
            const et = field.element_type
                ? (0, __1.convertToDataType)(field.element_type)
                : null;
            if (et === __1.DataType.Int64) {
                return val.map((v) => `${INT64_PREFIX}${String(v)}${INT64_SUFFIX}`);
            }
            // Array<Struct>: recursively normalize sub-fields (Int64 inside structs)
            if (et === __1.DataType.Struct && field.fields) {
                const subFields = new Map(field.fields.map(sf => [sf.name, sf]));
                return val.map((item) => {
                    const normalized = {};
                    for (const [k, v] of Object.entries(item)) {
                        const sf = subFields.get(k);
                        if (sf) {
                            normalized[k] = normalizeValue(v, sf);
                        }
                        else {
                            normalized[k] = v;
                        }
                    }
                    return normalized;
                });
            }
            return val;
        }
        default:
            return val;
    }
}
/**
 * Serialize a row to JSON, then fix Int64 markers to bare integer literals.
 * "___INT64_1234567890123456789_INT64___" → 1234567890123456789
 */
function stringifyRow(row) {
    const json = JSON.stringify(row);
    return json.replace(INT64_REGEX, '$1');
}
class JsonFormatter {
    constructor() {
        this.extension = '.json';
    }
    persist(columns, dynamicRows, rowCount, dir, schema) {
        return __awaiter(this, void 0, void 0, function* () {
            fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `data${this.extension}`);
            const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
            // Build field lookup for normalization (only active fields)
            const activeFields = schema.fields.filter(f => !f.autoID && !f.is_function_output);
            const fieldMap = new Map(activeFields.map(f => [f.name, f]));
            const fieldNames = [...columns.keys()];
            const hasDynamic = schema.enable_dynamic_field && dynamicRows.length > 0;
            ws.write('{"rows":[\n');
            for (let i = 0; i < rowCount; i++) {
                if (i > 0)
                    ws.write(',\n');
                const row = {};
                for (const name of fieldNames) {
                    const val = columns.get(name)[i];
                    const field = fieldMap.get(name);
                    row[name] = field ? normalizeValue(val, field) : val;
                }
                if (hasDynamic && dynamicRows[i]) {
                    const dyn = dynamicRows[i];
                    if (Object.keys(dyn).length > 0) {
                        row['$meta'] = dyn;
                    }
                }
                const ok = ws.write(stringifyRow(row));
                if (!ok) {
                    yield (0, events_1.once)(ws, 'drain');
                }
            }
            ws.write('\n]}');
            ws.end();
            yield (0, promises_1.finished)(ws);
            return [filePath];
        });
    }
}
exports.JsonFormatter = JsonFormatter;
//# sourceMappingURL=JsonFormatter.js.map