import type * as pgTypes from 'pg';
import type * as pgPoolTypes from 'pg-pool';
export type PostgresCallback = (err: Error, res: object) => unknown;
export interface PgParsedConnectionParams {
    database?: string;
    host?: string;
    namespace?: string;
    port?: number;
    user?: string;
}
export interface PgClientExtended extends pgTypes.Client {
    connectionParameters: PgParsedConnectionParams;
}
export type PgPoolCallback = (err: Error, client: any, done: (release?: any) => void) => void;
export interface PgPoolOptionsParams {
    allowExitOnIdle: boolean;
    connectionString?: string;
    database: string;
    host: string;
    idleTimeoutMillis: number;
    max: number;
    maxClient: number;
    maxLifetimeSeconds: number;
    maxUses: number;
    namespace: string;
    port: number;
    user: string;
}
export declare const EVENT_LISTENERS_SET: unique symbol;
export interface PgPoolExtended extends pgPoolTypes<pgTypes.Client> {
    options: PgPoolOptionsParams;
    [EVENT_LISTENERS_SET]?: boolean;
}
export type PgClientConnect = (callback?: Function) => Promise<void> | void;
//# sourceMappingURL=internal-types.d.ts.map