import { Base64 } from "js-base64";
export const supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
export function transactionModeToBegin(mode) {
    if (mode === "write") {
        return "BEGIN IMMEDIATE";
    }
    else if (mode === "read") {
        return "BEGIN TRANSACTION READONLY";
    }
    else if (mode === "deferred") {
        return "BEGIN DEFERRED";
    }
    else {
        throw RangeError('Unknown transaction mode, supported values are "write", "read" and "deferred"');
    }
}
export class ResultSetImpl {
    columns;
    columnTypes;
    rows;
    rowsAffected;
    lastInsertRowid;
    constructor(columns, columnTypes, rows, rowsAffected, lastInsertRowid) {
        this.columns = columns;
        this.columnTypes = columnTypes;
        this.rows = rows;
        this.rowsAffected = rowsAffected;
        this.lastInsertRowid = lastInsertRowid;
    }
    toJSON() {
        return {
            columns: this.columns,
            columnTypes: this.columnTypes,
            rows: this.rows.map(rowToJson),
            rowsAffected: this.rowsAffected,
            lastInsertRowid: this.lastInsertRowid !== undefined
                ? "" + this.lastInsertRowid
                : null,
        };
    }
}
function rowToJson(row) {
    return Array.prototype.map.call(row, valueToJson);
}
function valueToJson(value) {
    if (typeof value === "bigint") {
        return "" + value;
    }
    else if (value instanceof ArrayBuffer) {
        return Base64.fromUint8Array(new Uint8Array(value));
    }
    else {
        return value;
    }
}
