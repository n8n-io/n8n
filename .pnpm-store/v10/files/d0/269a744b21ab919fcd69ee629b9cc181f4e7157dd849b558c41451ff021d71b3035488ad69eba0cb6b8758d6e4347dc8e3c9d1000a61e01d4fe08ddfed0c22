import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions";
import { ReplicationMode } from "../types/ReplicationMode";
import { PostgresConnectionCredentialsOptions } from "./PostgresConnectionCredentialsOptions";
/**
 * Postgres-specific connection options.
 */
export interface PostgresConnectionOptions extends BaseDataSourceOptions, PostgresConnectionCredentialsOptions {
    /**
     * Database type.
     */
    readonly type: "postgres";
    /**
     * Schema name.
     */
    readonly schema?: string;
    /**
     * The driver object
     * This defaults to `require("pg")`.
     */
    readonly driver?: any;
    /**
     * The driver object
     * This defaults to `require("pg-native")`.
     */
    readonly nativeDriver?: any;
    /**
     * A boolean determining whether to pass time values in UTC or local time. (default: false).
     */
    readonly useUTC?: boolean;
    /**
     * Replication setup.
     */
    readonly replication?: {
        /**
         * Master server used by orm to perform writes.
         */
        readonly master: PostgresConnectionCredentialsOptions;
        /**
         * List of read-from severs (slaves).
         */
        readonly slaves: PostgresConnectionCredentialsOptions[];
        /**
         * Default connection pool to use for SELECT queries
         * @default "slave"
         */
        readonly defaultMode?: ReplicationMode;
    };
    /**
     * The milliseconds before a timeout occurs during the initial connection to the postgres
     * server. If undefined, or set to 0, there is no timeout. Defaults to undefined.
     */
    readonly connectTimeoutMS?: number;
    /**
     * Number of milliseconds before PostgreSQL cancels a running statement (server-side).
     * Default is no timeout.
     */
    readonly statementTimeout?: number;
    /**
     * Number of milliseconds the client waits for a query response before
     * terminating the connection (client-side). Default is no timeout.
     */
    readonly queryTimeout?: number;
    /**
     * The Postgres extension to use to generate UUID columns. Defaults to uuid-ossp.
     * If pgcrypto is selected, TypeORM will use the gen_random_uuid() function from this extension.
     * If uuid-ossp is selected, TypeORM will use the uuid_generate_v4() function from this extension.
     */
    readonly uuidExtension?: "pgcrypto" | "uuid-ossp";
    readonly poolErrorHandler?: (err: any) => any;
    /**
     * Include notification messages from Postgres server in client logs.
     * Note: This only works with the JavaScript `pg` driver.
     * The native `pg-native` driver does not emit notice/notification events.
     */
    readonly logNotifications?: boolean;
    /**
     * Automatically install postgres extensions
     */
    readonly installExtensions?: boolean;
    /**
     * Return 64-bit integers (int8) as JavaScript integers.
     *
     * Because JavaScript doesn't have support for 64-bit integers node-postgres cannot confidently
     * parse int8 data type results as numbers because if you have a huge number it will overflow
     * and the result you'd get back from node-postgres would not be the result in the database.
     * That would be a very bad thing so node-postgres just returns int8 results as strings and leaves the parsing up to you.
     *
     * Enabling parseInt8 will cause node-postgres to parse int8 results as numbers.
     * Note: the maximum safe integer in js is: Number.MAX_SAFE_INTEGER (`+2^53`)
     *
     * @see [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5)
     * @see [node-postgres int8 explanation](https://github.com/brianc/node-pg-types#:~:text=on%20projects%3A%20return-,64%2Dbit%20integers,-(int8)%20as)
     * @see [node-postgres defaults.parseInt8 implementation](https://github.com/brianc/node-postgres/blob/pg%408.8.0/packages/pg/lib/defaults.js#L80)
     */
    readonly parseInt8?: boolean;
}
