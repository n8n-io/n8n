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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkWriter = void 0;
const events_1 = require("events");
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const __1 = require("../");
const ColumnBuffer_1 = require("./ColumnBuffer");
const JsonFormatter_1 = require("./JsonFormatter");
const ParquetFormatter_1 = require("./ParquetFormatter");
const LocalStorage_1 = require("./LocalStorage");
const DEFAULT_CHUNK_SIZE = 128 * 1024 * 1024; // 128MB
class BulkWriter extends events_1.EventEmitter {
    constructor(options) {
        var _a, _b, _c;
        super();
        this.bufferSize = 0;
        this._batchFiles = [];
        this._totalRowCount = 0;
        this.chunkIndex = 0;
        this.pendingFlush = null;
        // Deep-clone schema to avoid mutation by external callers (e.g. createCollection)
        this.schema = JSON.parse(JSON.stringify(options.schema));
        this.formatter =
            options.format === 'parquet'
                ? new ParquetFormatter_1.ParquetFormatter()
                : new JsonFormatter_1.JsonFormatter();
        this.storage = (_a = options.storage) !== null && _a !== void 0 ? _a : new LocalStorage_1.LocalStorage();
        this.chunkSize = (_b = options.chunkSize) !== null && _b !== void 0 ? _b : DEFAULT_CHUNK_SIZE;
        this.basePath = path.join((_c = options.localPath) !== null && _c !== void 0 ? _c : process.cwd(), crypto.randomUUID());
        this.buffer = new ColumnBuffer_1.ColumnBuffer(this.schema);
        // Pre-compute field metadata
        this.autoIdFields = new Set(this.schema.fields.filter(f => f.autoID).map(f => f.name));
        this.functionOutputFields = new Set(this.schema.fields.filter(f => f.is_function_output).map(f => f.name));
        this.requiredFields = this.schema.fields.filter(f => !f.autoID &&
            !f.is_function_output &&
            !f.nullable &&
            f.default_value === undefined);
        this.fieldMap = new Map(this.schema.fields.map(f => [f.name, f]));
    }
    get totalRowCount() {
        return this._totalRowCount;
    }
    get bufferRowCount() {
        return this.buffer.rowCount;
    }
    get batchFiles() {
        return this._batchFiles;
    }
    /** Append a single row. Triggers auto-flush when buffer exceeds chunkSize. */
    append(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pendingFlush)
                yield this.pendingFlush;
            this.validateRow(row);
            this.bufferSize += this.buffer.append(row);
            this._totalRowCount++;
            if (this.bufferSize >= this.chunkSize) {
                yield this.commit();
            }
        });
    }
    /** Flush the current buffer to disk. */
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pendingFlush)
                yield this.pendingFlush;
            if (this.buffer.rowCount === 0)
                return;
            const oldBuffer = this.buffer;
            this.buffer = new ColumnBuffer_1.ColumnBuffer(this.schema);
            this.bufferSize = 0;
            const chunkIdx = this.chunkIndex++;
            this.pendingFlush = this.flush(oldBuffer, chunkIdx);
            yield this.pendingFlush;
            this.pendingFlush = null;
        });
    }
    /** Flush remaining data and return all batch file paths. */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.buffer.rowCount > 0) {
                yield this.commit();
            }
            if (this.pendingFlush)
                yield this.pendingFlush;
            return this._batchFiles;
        });
    }
    /** Write all rows from an async iterable, then close. */
    writeFrom(source) {
        var _a, source_1, source_1_1;
        var _b, e_1, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (_a = true, source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), _b = source_1_1.done, !_b;) {
                    _d = source_1_1.value;
                    _a = false;
                    try {
                        const row = _d;
                        yield this.append(row);
                    }
                    finally {
                        _a = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_a && !_b && (_c = source_1.return)) yield _c.call(source_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.close();
        });
    }
    flush(buffer, chunkIdx) {
        return __awaiter(this, void 0, void 0, function* () {
            const chunkDir = path.join(this.basePath, `chunk_${chunkIdx}`);
            const localFiles = yield this.formatter.persist(buffer.getColumns(), buffer.dynamicRows, buffer.rowCount, chunkDir, this.schema);
            const storedFiles = yield Promise.all(localFiles.map(f => this.storage.write(f, f)));
            this._batchFiles.push(storedFiles);
            const event = {
                files: storedFiles,
                rowCount: buffer.rowCount,
                chunkIndex: chunkIdx,
            };
            this.emit('flush', event);
        });
    }
    validateRow(row) {
        // Reject autoID fields if provided
        for (const name of this.autoIdFields) {
            if (row[name] !== undefined) {
                throw new Error(`Field "${name}" is autoID — do not provide a value.`);
            }
        }
        // Reject function output fields if provided
        for (const name of this.functionOutputFields) {
            if (row[name] !== undefined) {
                throw new Error(`Field "${name}" is a function output field — do not provide a value.`);
            }
        }
        // Check required fields
        for (const field of this.requiredFields) {
            if (row[field.name] === undefined || row[field.name] === null) {
                throw new Error(`Field "${field.name}" is required (non-nullable, no default).`);
            }
        }
        // Validate $meta if provided
        if (row['$meta'] !== undefined && row['$meta'] !== null) {
            if (typeof row['$meta'] !== 'object' || Array.isArray(row['$meta'])) {
                throw new Error('$meta must be a plain object.');
            }
        }
        // Type-specific validation for provided values
        for (const [key, val] of Object.entries(row)) {
            if (val === null || val === undefined)
                continue;
            if (key === '$meta')
                continue; // handled by ColumnBuffer
            const field = this.fieldMap.get(key);
            if (!field)
                continue; // dynamic or extra field — skip validation
            this.validateFieldValue(field, val);
        }
    }
    validateFieldValue(field, val) {
        var _a, _b, _c;
        const dt = (0, __1.convertToDataType)(field.data_type);
        const dim = Number((_a = field.dim) !== null && _a !== void 0 ? _a : (field.type_params && field.type_params.dim));
        switch (dt) {
            case __1.DataType.FloatVector: {
                if (!Array.isArray(val)) {
                    throw new Error(`Field "${field.name}": FloatVector must be a number array.`);
                }
                if (dim && val.length !== dim) {
                    throw new Error(`Field "${field.name}": expected dimension ${dim}, got ${val.length}.`);
                }
                break;
            }
            case __1.DataType.BinaryVector: {
                if (!Array.isArray(val)) {
                    throw new Error(`Field "${field.name}": BinaryVector must be a number array.`);
                }
                if (dim && val.length !== dim / 8) {
                    throw new Error(`Field "${field.name}": BinaryVector expected ${dim / 8} bytes for dimension ${dim}, got ${val.length}.`);
                }
                break;
            }
            case __1.DataType.Float16Vector:
            case __1.DataType.BFloat16Vector: {
                if (!Array.isArray(val) && !(val instanceof Uint8Array)) {
                    throw new Error(`Field "${field.name}": Float16/BFloat16 vector must be a number array or Uint8Array.`);
                }
                if (dim && Array.isArray(val) && val.length !== dim) {
                    throw new Error(`Field "${field.name}": expected dimension ${dim}, got ${val.length}.`);
                }
                break;
            }
            case __1.DataType.Int8Vector: {
                if (!Array.isArray(val) && !(val instanceof Int8Array)) {
                    throw new Error(`Field "${field.name}": Int8Vector must be a number array or Int8Array.`);
                }
                if (dim && val.length !== dim) {
                    throw new Error(`Field "${field.name}": expected dimension ${dim}, got ${val.length}.`);
                }
                break;
            }
            case __1.DataType.VarChar: {
                if (typeof val !== 'string') {
                    throw new Error(`Field "${field.name}": VarChar must be a string.`);
                }
                const maxLen = Number((_b = field.max_length) !== null && _b !== void 0 ? _b : (field.type_params && field.type_params.max_length));
                if (maxLen && val.length > maxLen) {
                    throw new Error(`Field "${field.name}": string length ${val.length} exceeds max_length ${maxLen}.`);
                }
                break;
            }
            case __1.DataType.Array: {
                if (!Array.isArray(val)) {
                    throw new Error(`Field "${field.name}": Array field must be an array.`);
                }
                const maxCap = Number((_c = field.max_capacity) !== null && _c !== void 0 ? _c : (field.type_params && field.type_params.max_capacity));
                if (maxCap && val.length > maxCap) {
                    throw new Error(`Field "${field.name}": array length ${val.length} exceeds max_capacity ${maxCap}.`);
                }
                break;
            }
            case __1.DataType.Geometry: {
                if (typeof val !== 'string') {
                    throw new Error(`Field "${field.name}": Geometry must be a WKT string.`);
                }
                break;
            }
            case __1.DataType.Timestamptz: {
                if (typeof val !== 'string' && !(val instanceof Date)) {
                    throw new Error(`Field "${field.name}": Timestamptz must be an ISO 8601 string or Date object.`);
                }
                break;
            }
            case __1.DataType.JSON: {
                if (typeof val !== 'object' || Array.isArray(val)) {
                    throw new Error(`Field "${field.name}": JSON must be a plain object.`);
                }
                break;
            }
            case __1.DataType.Bool:
                if (typeof val !== 'boolean') {
                    throw new Error(`Field "${field.name}": Bool must be a boolean.`);
                }
                break;
            case __1.DataType.Int64:
                // Accept number, string (from query), BigInt, Long objects
                if (typeof val !== 'number' &&
                    typeof val !== 'string' &&
                    typeof val !== 'bigint' &&
                    typeof val !== 'object') {
                    throw new Error(`Field "${field.name}": Int64 must be a number, string, or BigInt.`);
                }
                break;
            case __1.DataType.Int8:
            case __1.DataType.Int16:
            case __1.DataType.Int32:
            case __1.DataType.Float:
            case __1.DataType.Double:
                if (typeof val !== 'number') {
                    throw new Error(`Field "${field.name}": expected a number.`);
                }
                break;
        }
    }
}
exports.BulkWriter = BulkWriter;
//# sourceMappingURL=BulkWriter.js.map