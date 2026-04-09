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
exports.materializeRecords = exports.shredRecord = void 0;
const parquet_types = __importStar(require("./types"));
const shredRecord = function (schema, record, buffer) {
    /* shred the record, this may raise an exception */
    const recordShredded = {};
    for (const field of schema.fieldList) {
        recordShredded[field.path.join(',')] = {
            dlevels: [],
            rlevels: [],
            values: [],
            distinct_values: new Set(),
            count: 0,
        };
    }
    shredRecordInternal(schema.fields, record, recordShredded, 0, 0);
    /* if no error during shredding, add the shredded record to the buffer */
    if (!('columnData' in buffer) || !('rowCount' in buffer)) {
        buffer.rowCount = 0;
        buffer.pageRowCount = 0;
        buffer.columnData = {};
        buffer.pages = {};
        for (const field of schema.fieldList) {
            const path = field.path.join(',');
            buffer.columnData[path] = {
                dlevels: [],
                rlevels: [],
                values: [],
                distinct_values: new Set(),
                count: 0,
            };
            buffer.pages[path] = [];
        }
    }
    buffer.rowCount += 1;
    buffer.pageRowCount += 1;
    for (const field of schema.fieldList) {
        const path = field.path.join(',');
        const record = recordShredded[path];
        const column = buffer.columnData[path];
        for (let i = 0; i < record.rlevels.length; i++) {
            column.rlevels.push(record.rlevels[i]);
            column.dlevels.push(record.dlevels[i]);
            if (record.values[i] !== undefined) {
                column.values.push(record.values[i]);
            }
        }
        [...recordShredded[path].distinct_values].forEach((value) => buffer.columnData[path].distinct_values.add(value));
        buffer.columnData[path].count += recordShredded[path].count;
    }
};
exports.shredRecord = shredRecord;
function shredRecordInternal(fields, record, data, rlvl, dlvl) {
    for (const fieldName in fields) {
        const field = fields[fieldName];
        const fieldType = field.originalType || field.primitiveType;
        const path = field.path.join(',');
        // fetch values
        let values = [];
        if (record && fieldName in record && record[fieldName] !== undefined && record[fieldName] !== null) {
            if (Array.isArray(record[fieldName])) {
                values = record[fieldName];
            }
            else if (ArrayBuffer.isView(record[fieldName])) {
                // checks if any typed array
                if (record[fieldName] instanceof Uint8Array) {
                    // wrap in a buffer, since not supported by parquet_thrift
                    values.push(Buffer.from(record[fieldName]));
                }
                else {
                    throw new Error(Object.prototype.toString.call(record[fieldName]) + ' is not supported');
                }
            }
            else {
                values.push(record[fieldName]);
            }
        }
        // check values
        if (values.length == 0 && !!record && field.repetitionType === 'REQUIRED') {
            throw new Error('missing required field: ' + field.name);
        }
        if (values.length > 1 && field.repetitionType !== 'REPEATED') {
            throw new Error('too many values for field: ' + field.name);
        }
        // push null
        if (values.length == 0) {
            if (field.isNested && isDefined(field.fields)) {
                shredRecordInternal(field.fields, null, data, rlvl, dlvl);
            }
            else {
                data[path].rlevels.push(rlvl);
                data[path].dlevels.push(dlvl);
                data[path].count += 1;
            }
            continue;
        }
        // push values
        for (let i = 0; i < values.length; ++i) {
            const rlvl_i = i === 0 ? rlvl : field.rLevelMax;
            if (field.isNested && isDefined(field.fields)) {
                shredRecordInternal(field.fields, values[i], data, rlvl_i, field.dLevelMax);
            }
            else {
                data[path].distinct_values.add(values[i]);
                data[path].values.push(parquet_types.toPrimitive(fieldType, values[i], field));
                data[path].rlevels.push(rlvl_i);
                data[path].dlevels.push(field.dLevelMax);
                data[path].count += 1;
            }
        }
    }
}
/**
 * 'Materialize' a list of <value, repetition_level, definition_level>
 * tuples back to nested records (objects/arrays) using the Google Dremel
 * Algorithm..
 *
 * The buffer argument must point to an object with the following structure (i.e.
 * the same structure that is returned by shredRecords):
 *
 *   buffer = {
 *     columnData: [
 *       'my_col': {
 *          dlevels: [d1, d2, .. dN],
 *          rlevels: [r1, r2, .. rN],
 *          values: [v1, v2, .. vN],
 *        }, ...
 *      ],
 *      rowCount: X,
 *   }
 *
 */
const materializeRecords = function (schema, buffer, records) {
    if (!records) {
        records = [];
    }
    for (const k in buffer.columnData) {
        const field = schema.findField(k);
        const fieldBranch = schema.findFieldBranch(k);
        const values = buffer.columnData[k].values[Symbol.iterator]();
        const rLevels = new Array(field.rLevelMax + 1);
        rLevels.fill(0);
        for (let i = 0; i < buffer.columnData[k].count; ++i) {
            const dLevel = buffer.columnData[k].dlevels[i];
            const rLevel = buffer.columnData[k].rlevels[i];
            rLevels[rLevel]++;
            rLevels.fill(0, rLevel + 1);
            let value = null;
            if (dLevel === field.dLevelMax) {
                value = parquet_types.fromPrimitive(field.originalType || field.primitiveType, values.next().value, field);
            }
            records[rLevels[0] - 1] = records[rLevels[0] - 1] || {};
            materializeRecordField(records[rLevels[0] - 1], fieldBranch, rLevels.slice(1), dLevel, value);
        }
    }
    return records;
};
exports.materializeRecords = materializeRecords;
function materializeRecordField(record, branch, rLevels, dLevel, value) {
    const node = branch[0];
    if (dLevel < node.dLevelMax) {
        // This ensures that nulls are correctly processed
        record[node.name] = value;
        return;
    }
    if (branch.length > 1) {
        if (node.repetitionType === 'REPEATED') {
            if (!(node.name in record)) {
                record[node.name] = [];
            }
            const recordValue = record[node.name];
            while (recordValue.length < rLevels[0] + 1) {
                recordValue.push({});
            }
            materializeRecordField(recordValue[rLevels[0]], branch.slice(1), rLevels.slice(1), dLevel, value);
        }
        else {
            record[node.name] = record[node.name] || {};
            const recordValue = record[node.name];
            materializeRecordField(recordValue, branch.slice(1), rLevels, dLevel, value);
        }
    }
    else {
        if (node.repetitionType === 'REPEATED') {
            if (!(node.name in record)) {
                record[node.name] = [];
            }
            const recordValue = record[node.name];
            while (recordValue.length < rLevels[0] + 1) {
                recordValue.push(null);
            }
            recordValue[rLevels[0]] = value;
        }
        else {
            record[node.name] = value;
        }
    }
}
function isDefined(val) {
    return val !== undefined;
}
