"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorFromProto = exports.valueResultFromProto = exports.rowResultFromProto = exports.rowsResultFromProto = exports.stmtResultFromProto = void 0;
const errors_js_1 = require("./errors.js");
const value_js_1 = require("./value.js");
function stmtResultFromProto(result) {
    return {
        affectedRowCount: result.affectedRowCount,
        lastInsertRowid: result.lastInsertRowid,
        columnNames: result.cols.map(col => col.name),
        columnDecltypes: result.cols.map(col => col.decltype),
    };
}
exports.stmtResultFromProto = stmtResultFromProto;
function rowsResultFromProto(result, intMode) {
    const stmtResult = stmtResultFromProto(result);
    const rows = result.rows.map(row => rowFromProto(stmtResult.columnNames, row, intMode));
    return { ...stmtResult, rows };
}
exports.rowsResultFromProto = rowsResultFromProto;
function rowResultFromProto(result, intMode) {
    const stmtResult = stmtResultFromProto(result);
    let row;
    if (result.rows.length > 0) {
        row = rowFromProto(stmtResult.columnNames, result.rows[0], intMode);
    }
    return { ...stmtResult, row };
}
exports.rowResultFromProto = rowResultFromProto;
function valueResultFromProto(result, intMode) {
    const stmtResult = stmtResultFromProto(result);
    let value;
    if (result.rows.length > 0 && stmtResult.columnNames.length > 0) {
        value = (0, value_js_1.valueFromProto)(result.rows[0][0], intMode);
    }
    return { ...stmtResult, value };
}
exports.valueResultFromProto = valueResultFromProto;
function rowFromProto(colNames, values, intMode) {
    const row = {};
    // make sure that the "length" property is not enumerable
    Object.defineProperty(row, "length", { value: values.length });
    for (let i = 0; i < values.length; ++i) {
        const value = (0, value_js_1.valueFromProto)(values[i], intMode);
        Object.defineProperty(row, i, { value });
        const colName = colNames[i];
        if (colName !== undefined && !Object.hasOwn(row, colName)) {
            Object.defineProperty(row, colName, { value, enumerable: true, configurable: true, writable: true });
        }
    }
    return row;
}
function errorFromProto(error) {
    return new errors_js_1.ResponseError(error.message, error);
}
exports.errorFromProto = errorFromProto;
