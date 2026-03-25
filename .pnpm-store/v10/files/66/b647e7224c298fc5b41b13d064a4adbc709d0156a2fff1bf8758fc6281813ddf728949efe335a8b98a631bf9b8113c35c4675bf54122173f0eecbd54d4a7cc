import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions";
import { ReplicationMode } from "../types/ReplicationMode";
import { MysqlConnectionCredentialsOptions } from "./MysqlConnectionCredentialsOptions";
/**
 * MySQL specific connection options.
 *
 * @see https://github.com/mysqljs/mysql#connection-options
 */
export interface MysqlConnectionOptions extends BaseDataSourceOptions, MysqlConnectionCredentialsOptions {
    /**
     * Database type.
     */
    readonly type: "mysql" | "mariadb";
    /**
     * The driver object
     * This defaults to require("mysql2").
     */
    readonly driver?: any;
    /**
     * The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
     * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
     * Default: 'UTF8_GENERAL_CI'
     */
    readonly charset?: string;
    /**
     * The timezone configured on the MySQL server.
     * This is used to type cast server date/time values to JavaScript Date object and vice versa.
     * This can be 'local', 'Z', or an offset in the form +HH:MM or -HH:MM. (Default: 'local')
     */
    readonly timezone?: string;
    /**
     * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
     */
    readonly connectTimeout?: number;
    /**
     * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
     * This difference between connectTimeout and acquireTimeout is subtle and is described in the mysqljs/mysql docs
     * https://github.com/mysqljs/mysql/tree/master#pool-options
     */
    readonly acquireTimeout?: number;
    /**
     * Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
     */
    readonly insecureAuth?: boolean;
    /**
     * When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option (Default: false)
     */
    readonly supportBigNumbers?: boolean;
    /**
     * Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be always
     * returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving bigNumberStrings
     * disabled will return big numbers as String objects only when they cannot be accurately represented with
     * [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5) (which happens when they exceed the [-2^53, +2^53] range),
     * otherwise they will be returned as Number objects. This option is ignored if supportBigNumbers is disabled.
     */
    readonly bigNumberStrings?: boolean;
    /**
     * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date objects.
     * Can be true/false or an array of type names to keep as strings.
     */
    readonly dateStrings?: boolean | string[];
    /**
     * Prints protocol details to stdout. Can be true/false or an array of packet type names that should be printed.
     * (Default: false)
     */
    readonly debug?: boolean | string[];
    /**
     * Generates stack traces on Error to include call site of library entrance ("long stack traces").
     * Slight performance penalty for most calls. (Default: true)
     */
    readonly trace?: boolean;
    /**
     * Allow multiple mysql statements per query. Be careful with this, it could increase the scope of SQL injection attacks.
     * (Default: false)
     */
    readonly multipleStatements?: boolean;
    /**
     * Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
     * (Default: true)
     */
    readonly legacySpatialSupport?: boolean;
    /**
     * List of connection flags to use other than the default ones. It is also possible to blacklist default ones.
     * For more information, check https://github.com/mysqljs/mysql#connection-flags.
     */
    readonly flags?: string[];
    /**
     * Replication setup.
     */
    readonly replication?: {
        /**
         * Master server used by orm to perform writes.
         */
        readonly master: MysqlConnectionCredentialsOptions;
        /**
         * List of read-from severs (slaves).
         */
        readonly slaves: MysqlConnectionCredentialsOptions[];
        /**
         * If true, PoolCluster will attempt to reconnect when connection fails. (Default: true)
         */
        readonly canRetry?: boolean;
        /**
         * If connection fails, node's errorCount increases.
         * When errorCount is greater than removeNodeErrorCount, remove a node in the PoolCluster. (Default: 5)
         */
        readonly removeNodeErrorCount?: number;
        /**
         * If connection fails, specifies the number of milliseconds before another connection attempt will be made.
         * If set to 0, then node will be removed instead and never re-used. (Default: 0)
         */
        readonly restoreNodeTimeout?: number;
        /**
         * Determines how slaves are selected:
         * RR: Select one alternately (Round-Robin).
         * RANDOM: Select the node by random function.
         * ORDER: Select the first node available unconditionally.
         */
        readonly selector?: "RR" | "RANDOM" | "ORDER";
        /**
         * Default connection pool to use for SELECT queries
         * @default "slave"
         */
        readonly defaultMode?: ReplicationMode;
    };
}
