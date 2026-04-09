"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnBuffer = void 0;
const __1 = require("../");
const DYNAMIC_FIELD = '$meta';
const TYPE_SIZE = {
    [__1.DataType.Bool]: 1,
    [__1.DataType.Int8]: 1,
    [__1.DataType.Int16]: 2,
    [__1.DataType.Int32]: 4,
    [__1.DataType.Int64]: 8,
    [__1.DataType.Float]: 4,
    [__1.DataType.Double]: 8,
};
class ColumnBuffer {
    constructor(schema) {
        this.schema = schema;
        this.columns = new Map();
        this._dynamicRows = [];
        this._rowCount = 0;
        this.activeFields = schema.fields.filter(f => !f.autoID && !f.is_function_output);
        this.fieldNames = new Set(schema.fields.map(f => f.name));
        this.fieldDataTypes = new Map(this.activeFields.map(f => [f.name, (0, __1.convertToDataType)(f.data_type)]));
        for (const field of this.activeFields) {
            this.columns.set(field.name, []);
        }
    }
    get rowCount() {
        return this._rowCount;
    }
    get dynamicRows() {
        return this._dynamicRows;
    }
    getColumn(name) {
        var _a;
        return (_a = this.columns.get(name)) !== null && _a !== void 0 ? _a : [];
    }
    getColumns() {
        return this.columns;
    }
    getRow(index) {
        const row = {};
        for (const field of this.activeFields) {
            const col = this.columns.get(field.name);
            if (col && index < col.length) {
                row[field.name] = col[index];
            }
        }
        if (this.schema.enable_dynamic_field && this._dynamicRows[index]) {
            Object.assign(row, this._dynamicRows[index]);
        }
        return row;
    }
    append(row) {
        var _a;
        let size = 0;
        for (const field of this.activeFields) {
            const val = (_a = row[field.name]) !== null && _a !== void 0 ? _a : null;
            this.columns.get(field.name).push(val);
            size += this.estimateFieldSize(field, val);
        }
        if (this.schema.enable_dynamic_field) {
            let extra = null;
            for (const key of Object.keys(row)) {
                if (key === DYNAMIC_FIELD) {
                    // User passed explicit $meta dict — merge it
                    if (typeof row[key] === 'object' && row[key] !== null) {
                        if (!extra)
                            extra = {};
                        Object.assign(extra, row[key]);
                    }
                }
                else if (!this.fieldNames.has(key)) {
                    if (!extra)
                        extra = {};
                    extra[key] = row[key];
                }
            }
            this._dynamicRows.push(extra !== null && extra !== void 0 ? extra : {});
            if (extra) {
                size += Buffer.byteLength(JSON.stringify(extra), 'utf8');
            }
        }
        this._rowCount++;
        return size;
    }
    estimateFieldSize(field, val) {
        if (val === null || val === undefined)
            return 0;
        const dt = this.fieldDataTypes.get(field.name);
        const fixed = TYPE_SIZE[dt];
        if (fixed)
            return fixed;
        if (dt === __1.DataType.VarChar ||
            dt === __1.DataType.Geometry ||
            dt === __1.DataType.Timestamptz) {
            return typeof val === 'string' ? Buffer.byteLength(val, 'utf8') : 0;
        }
        if (dt === __1.DataType.JSON) {
            return Buffer.byteLength(JSON.stringify(val), 'utf8');
        }
        if (dt === __1.DataType.FloatVector) {
            return val.length * 4;
        }
        if (dt === __1.DataType.BinaryVector) {
            return val.length;
        }
        if (dt === __1.DataType.Float16Vector || dt === __1.DataType.BFloat16Vector) {
            if (val instanceof Uint8Array)
                return val.byteLength;
            return val.length * 2;
        }
        if (dt === __1.DataType.Int8Vector) {
            if (val instanceof Int8Array)
                return val.byteLength;
            return val.length;
        }
        if (dt === __1.DataType.SparseFloatVector) {
            return Buffer.byteLength(JSON.stringify(val), 'utf8');
        }
        if (dt === __1.DataType.Array) {
            return Buffer.byteLength(JSON.stringify(val), 'utf8');
        }
        if (dt === __1.DataType.Struct) {
            return Buffer.byteLength(JSON.stringify(val), 'utf8');
        }
        return 64;
    }
}
exports.ColumnBuffer = ColumnBuffer;
//# sourceMappingURL=ColumnBuffer.js.map