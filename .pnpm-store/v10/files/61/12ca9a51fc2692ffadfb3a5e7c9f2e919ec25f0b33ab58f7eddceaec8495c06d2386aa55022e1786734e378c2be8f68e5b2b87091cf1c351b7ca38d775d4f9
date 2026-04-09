import * as hrana from "@libsql/hrana-client";
import type { InStatement, ResultSet, Transaction, TransactionMode, InArgs } from "@libsql/core/api";
import type { SqlCache } from "./sql_cache.js";
export declare abstract class HranaTransaction implements Transaction {
    #private;
    /** @private */
    constructor(mode: TransactionMode, version: hrana.ProtocolVersion);
    /** @private */
    abstract _getStream(): hrana.Stream;
    /** @private */
    abstract _getSqlCache(): SqlCache;
    abstract close(): void;
    abstract get closed(): boolean;
    execute(stmt: InStatement): Promise<ResultSet>;
    batch(stmts: Array<InStatement>): Promise<Array<ResultSet>>;
    executeMultiple(sql: string): Promise<void>;
    rollback(): Promise<void>;
    commit(): Promise<void>;
}
export declare function executeHranaBatch(mode: TransactionMode, version: hrana.ProtocolVersion, batch: hrana.Batch, hranaStmts: Array<hrana.Stmt>, disableForeignKeys?: boolean): Promise<Array<ResultSet>>;
export declare function stmtToHrana(stmt: InStatement | [string, InArgs?]): hrana.Stmt;
export declare function resultSetFromHrana(hranaRows: hrana.RowsResult): ResultSet;
export declare function mapHranaError(e: unknown): unknown;
