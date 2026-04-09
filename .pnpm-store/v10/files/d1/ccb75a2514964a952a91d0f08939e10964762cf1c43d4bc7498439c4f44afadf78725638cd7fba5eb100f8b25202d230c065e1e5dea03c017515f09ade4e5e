/** A SQL text that you can send to the database. Either a string or a reference to SQL text that is cached on
 * the server. */
export type InSql = string | Sql;
export interface SqlOwner {
    /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
    storeSql(sql: string): Sql;
    /** @private */
    _closeSql(sqlId: number): void;
}
/** Text of an SQL statement cached on the server. */
export declare class Sql {
    #private;
    /** @private */
    constructor(owner: SqlOwner, sqlId: number);
    /** @private */
    _getSqlId(owner: SqlOwner): number;
    /** Remove the SQL text from the server, releasing resouces. */
    close(): void;
    /** @private */
    _setClosed(error: Error): void;
    /** True if the SQL text is closed (removed from the server). */
    get closed(): boolean;
}
export type ProtoSql = {
    sql?: string;
    sqlId?: number;
};
export declare function sqlToProto(owner: SqlOwner, sql: InSql): ProtoSql;
