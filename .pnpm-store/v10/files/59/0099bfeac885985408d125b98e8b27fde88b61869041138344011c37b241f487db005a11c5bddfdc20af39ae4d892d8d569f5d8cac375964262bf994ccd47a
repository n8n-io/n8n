import * as hrana from "@libsql/hrana-client";
import type { Config, Client } from "@libsql/core/api";
import type { InStatement, ResultSet, Transaction, IntMode, InArgs, Replicated } from "@libsql/core/api";
import { TransactionMode } from "@libsql/core/api";
import type { ExpandedConfig } from "@libsql/core/config";
import { HranaTransaction } from "./hrana.js";
import { SqlCache } from "./sql_cache.js";
export * from "@libsql/core/api";
export declare function createClient(config: Config): Client;
/** @private */
export declare function _createClient(config: ExpandedConfig): Client;
export declare class HttpClient implements Client {
    #private;
    protocol: "http";
    /** @private */
    constructor(url: URL, authToken: string | undefined, intMode: IntMode, customFetch: Function | undefined, concurrency: number, remoteEncryptionKey: string | undefined);
    private limit;
    execute(stmtOrSql: InStatement | string, args?: InArgs): Promise<ResultSet>;
    batch(stmts: Array<InStatement | [string, InArgs?]>, mode?: TransactionMode): Promise<Array<ResultSet>>;
    migrate(stmts: Array<InStatement>): Promise<Array<ResultSet>>;
    transaction(mode?: TransactionMode): Promise<HttpTransaction>;
    executeMultiple(sql: string): Promise<void>;
    sync(): Promise<Replicated>;
    close(): void;
    reconnect(): Promise<void>;
    get closed(): boolean;
}
export declare class HttpTransaction extends HranaTransaction implements Transaction {
    #private;
    /** @private */
    constructor(stream: hrana.HttpStream, mode: TransactionMode, version: hrana.ProtocolVersion);
    /** @private */
    _getStream(): hrana.Stream;
    /** @private */
    _getSqlCache(): SqlCache;
    close(): void;
    get closed(): boolean;
}
