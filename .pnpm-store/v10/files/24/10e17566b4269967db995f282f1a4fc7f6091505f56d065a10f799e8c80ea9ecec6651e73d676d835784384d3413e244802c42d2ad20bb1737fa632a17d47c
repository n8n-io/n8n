import { ResultSet, Row, TransactionMode } from "./api";
export declare const supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
export declare function transactionModeToBegin(mode: TransactionMode): string;
export declare class ResultSetImpl implements ResultSet {
    columns: Array<string>;
    columnTypes: Array<string>;
    rows: Array<Row>;
    rowsAffected: number;
    lastInsertRowid: bigint | undefined;
    constructor(columns: Array<string>, columnTypes: Array<string>, rows: Array<Row>, rowsAffected: number, lastInsertRowid: bigint | undefined);
    toJSON(): any;
}
