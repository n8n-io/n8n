import { Attributes } from '@opentelemetry/api';
import type * as mysqlTypes from 'mysql2';
import { MySQL2InstrumentationQueryMaskingHook } from './types';
import { SemconvStability } from '@opentelemetry/instrumentation';
type formatType = typeof mysqlTypes.format;
interface QueryOptions {
    sql: string;
    values?: any | any[] | {
        [param: string]: any;
    };
}
interface Query {
    sql: string;
}
interface Config {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    connectionConfig?: Config;
}
/**
 * Get an Attributes map from a mysql connection config object
 *
 * @param config ConnectionConfig
 */
export declare function getConnectionAttributes(config: Config, dbSemconvStability: SemconvStability, netSemconvStability: SemconvStability): Attributes;
/**
 * Conjures up the value for the db.query.text attribute by formatting a SQL query.
 */
export declare function getQueryText(query: string | Query | QueryOptions, format?: formatType, values?: any[], maskStatement?: boolean, maskStatementHook?: MySQL2InstrumentationQueryMaskingHook): string;
/**
 * The span name SHOULD be set to a low cardinality value
 * representing the statement executed on the database.
 *
 * @returns SQL statement without variable arguments or SQL verb
 */
export declare function getSpanName(query: string | Query | QueryOptions): string;
export declare const once: (fn: Function) => (...args: unknown[]) => any;
export declare function getConnectionPrototypeToInstrument(connection: any): any;
export {};
//# sourceMappingURL=utils.d.ts.map