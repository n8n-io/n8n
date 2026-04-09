import * as tls from 'tls';
import * as net from 'net';
import { type SecureContextOptions } from 'tls';
import { type TokenCredential } from '@azure/core-auth';
import BulkLoad, { type Options as BulkLoadOptions, type Callback as BulkLoadCallback } from './bulk-load';
import Debug from './debug';
import { EventEmitter } from 'events';
import { TransientErrorLookup } from './transient-error-lookup';
import PreloginPayload from './prelogin-payload';
import Request from './request';
import MessageIO from './message-io';
import { Parser as TokenStreamParser } from './token/token-stream-parser';
import { ISOLATION_LEVEL } from './transaction';
import { ConnectionError } from './errors';
import Message from './message';
import { type Metadata } from './metadata-parser';
import { ColumnEncryptionAzureKeyVaultProvider } from './always-encrypted/keystore-provider-azure-key-vault';
import { Collation } from './collation';
import { TokenHandler } from './token/handler';
type BeginTransactionCallback = 
/**
 * The callback is called when the request to start the transaction has completed,
 * either successfully or with an error.
 * If an error occurred then `err` will describe the error.
 *
 * As only one request at a time may be executed on a connection, another request should not
 * be initiated until this callback is called.
 *
 * @param err If an error occurred, an [[Error]] object with details of the error.
 * @param transactionDescriptor A Buffer that describe the transaction
 */
(err: Error | null | undefined, transactionDescriptor?: Buffer) => void;
type SaveTransactionCallback = 
/**
 * The callback is called when the request to set a savepoint within the
 * transaction has completed, either successfully or with an error.
 * If an error occurred then `err` will describe the error.
 *
 * As only one request at a time may be executed on a connection, another request should not
 * be initiated until this callback is called.
 *
 * @param err If an error occurred, an [[Error]] object with details of the error.
 */
(err: Error | null | undefined) => void;
type CommitTransactionCallback = 
/**
 * The callback is called when the request to commit the transaction has completed,
 * either successfully or with an error.
 * If an error occurred then `err` will describe the error.
 *
 * As only one request at a time may be executed on a connection, another request should not
 * be initiated until this callback is called.
 *
 * @param err If an error occurred, an [[Error]] object with details of the error.
 */
(err: Error | null | undefined) => void;
type RollbackTransactionCallback = 
/**
 * The callback is called when the request to rollback the transaction has
 * completed, either successfully or with an error.
 * If an error occurred then err will describe the error.
 *
 * As only one request at a time may be executed on a connection, another request should not
 * be initiated until this callback is called.
 *
 * @param err If an error occurred, an [[Error]] object with details of the error.
 */
(err: Error | null | undefined) => void;
type ResetCallback = 
/**
 * The callback is called when the connection reset has completed,
 * either successfully or with an error.
 *
 * If an error occurred then `err` will describe the error.
 *
 * As only one request at a time may be executed on a connection, another
 * request should not be initiated until this callback is called
 *
 * @param err If an error occurred, an [[Error]] object with details of the error.
 */
(err: Error | null | undefined) => void;
type TransactionDoneCallback = (err: Error | null | undefined, ...args: any[]) => void;
type CallbackParameters<T extends (err: Error | null | undefined, ...args: any[]) => any> = T extends (err: Error | null | undefined, ...args: infer P) => any ? P : never;
interface AzureActiveDirectoryMsiAppServiceAuthentication {
    type: 'azure-active-directory-msi-app-service';
    options: {
        /**
         * If you user want to connect to an Azure app service using a specific client account
         * they need to provide `clientId` associate to their created identity.
         *
         * This is optional for retrieve token from azure web app service
         */
        clientId?: string;
    };
}
interface AzureActiveDirectoryMsiVmAuthentication {
    type: 'azure-active-directory-msi-vm';
    options: {
        /**
         * If you want to connect using a specific client account
         * they need to provide `clientId` associated to their created identity.
         *
         * This is optional for retrieve a token
         */
        clientId?: string;
    };
}
interface AzureActiveDirectoryDefaultAuthentication {
    type: 'azure-active-directory-default';
    options: {
        /**
         * If you want to connect using a specific client account
         * they need to provide `clientId` associated to their created identity.
         *
         * This is optional for retrieving a token
         */
        clientId?: string;
    };
}
interface AzureActiveDirectoryAccessTokenAuthentication {
    type: 'azure-active-directory-access-token';
    options: {
        /**
         * A user need to provide `token` which they retrieved else where
         * to forming the connection.
         */
        token: string;
    };
}
interface AzureActiveDirectoryPasswordAuthentication {
    type: 'azure-active-directory-password';
    options: {
        /**
         * A user need to provide `userName` associate to their account.
         */
        userName: string;
        /**
         * A user need to provide `password` associate to their account.
         */
        password: string;
        /**
         * A client id to use.
         */
        clientId: string;
        /**
         * Optional parameter for specific Azure tenant ID
         */
        tenantId: string;
    };
}
interface AzureActiveDirectoryServicePrincipalSecret {
    type: 'azure-active-directory-service-principal-secret';
    options: {
        /**
         * Application (`client`) ID from your registered Azure application
         */
        clientId: string;
        /**
         * The created `client secret` for this registered Azure application
         */
        clientSecret: string;
        /**
         * Directory (`tenant`) ID from your registered Azure application
         */
        tenantId: string;
    };
}
/** Structure that defines the options that are necessary to authenticate the Tedious.JS instance with an `@azure/identity` token credential. */
interface TokenCredentialAuthentication {
    /** Unique designator for the type of authentication to be used. */
    type: 'token-credential';
    /** Set of configurations that are required or allowed with this authentication type. */
    options: {
        /** Credential object used to authenticate to the resource. */
        credential: TokenCredential;
    };
}
interface NtlmAuthentication {
    type: 'ntlm';
    options: {
        /**
         * User name from your windows account.
         */
        userName: string;
        /**
         * Password from your windows account.
         */
        password: string;
        /**
         * Once you set domain for ntlm authentication type, driver will connect to SQL Server using domain login.
         *
         * This is necessary for forming a connection using ntlm type
         */
        domain: string;
    };
}
interface DefaultAuthentication {
    type: 'default';
    options: {
        /**
         * User name to use for sql server login.
         */
        userName?: string | undefined;
        /**
         * Password to use for sql server login.
         */
        password?: string | undefined;
    };
}
export type ConnectionAuthentication = DefaultAuthentication | NtlmAuthentication | TokenCredentialAuthentication | AzureActiveDirectoryPasswordAuthentication | AzureActiveDirectoryMsiAppServiceAuthentication | AzureActiveDirectoryMsiVmAuthentication | AzureActiveDirectoryAccessTokenAuthentication | AzureActiveDirectoryServicePrincipalSecret | AzureActiveDirectoryDefaultAuthentication;
interface InternalConnectionConfig {
    server: string;
    authentication: ConnectionAuthentication;
    options: InternalConnectionOptions;
}
export interface InternalConnectionOptions {
    abortTransactionOnError: boolean;
    appName: undefined | string;
    camelCaseColumns: boolean;
    cancelTimeout: number;
    columnEncryptionKeyCacheTTL: number;
    columnEncryptionSetting: boolean;
    columnNameReplacer: undefined | ((colName: string, index: number, metadata: Metadata) => string);
    connectionRetryInterval: number;
    connector: undefined | (() => Promise<net.Socket>);
    connectTimeout: number;
    connectionIsolationLevel: typeof ISOLATION_LEVEL[keyof typeof ISOLATION_LEVEL];
    cryptoCredentialsDetails: SecureContextOptions;
    database: undefined | string;
    datefirst: number;
    dateFormat: string;
    debug: {
        data: boolean;
        packet: boolean;
        payload: boolean;
        token: boolean;
    };
    enableAnsiNull: null | boolean;
    enableAnsiNullDefault: null | boolean;
    enableAnsiPadding: null | boolean;
    enableAnsiWarnings: null | boolean;
    enableArithAbort: null | boolean;
    enableConcatNullYieldsNull: null | boolean;
    enableCursorCloseOnCommit: null | boolean;
    enableImplicitTransactions: null | boolean;
    enableNumericRoundabort: null | boolean;
    enableQuotedIdentifier: null | boolean;
    encrypt: string | boolean;
    encryptionKeyStoreProviders: KeyStoreProviderMap | undefined;
    fallbackToDefaultDb: boolean;
    instanceName: undefined | string;
    isolationLevel: typeof ISOLATION_LEVEL[keyof typeof ISOLATION_LEVEL];
    language: string;
    localAddress: undefined | string;
    maxRetriesOnTransientErrors: number;
    multiSubnetFailover: boolean;
    packetSize: number;
    port: undefined | number;
    readOnlyIntent: boolean;
    requestTimeout: number;
    rowCollectionOnDone: boolean;
    rowCollectionOnRequestCompletion: boolean;
    serverName: undefined | string;
    serverSupportsColumnEncryption: boolean;
    tdsVersion: string;
    textsize: number;
    trustedServerNameAE: string | undefined;
    trustServerCertificate: boolean;
    useColumnNames: boolean;
    useUTC: boolean;
    workstationId: undefined | string;
    lowerCaseGuids: boolean;
}
interface KeyStoreProviderMap {
    [key: string]: ColumnEncryptionAzureKeyVaultProvider;
}
/**
 * @private
 */
interface State {
    name: string;
    enter?(this: Connection): void;
    exit?(this: Connection, newState: State): void;
    events: {
        socketError?(this: Connection, err: Error): void;
        message?(this: Connection, message: Message): void;
    };
}
type Authentication = DefaultAuthentication | NtlmAuthentication | TokenCredentialAuthentication | AzureActiveDirectoryPasswordAuthentication | AzureActiveDirectoryMsiAppServiceAuthentication | AzureActiveDirectoryMsiVmAuthentication | AzureActiveDirectoryAccessTokenAuthentication | AzureActiveDirectoryServicePrincipalSecret | AzureActiveDirectoryDefaultAuthentication;
type AuthenticationType = Authentication['type'];
export interface ConnectionConfiguration {
    /**
     * Hostname to connect to.
     */
    server: string;
    /**
     * Configuration options for forming the connection.
     */
    options?: ConnectionOptions;
    /**
     * Authentication related options for connection.
     */
    authentication?: AuthenticationOptions;
}
interface DebugOptions {
    /**
     * A boolean, controlling whether [[debug]] events will be emitted with text describing packet data details
     *
     * (default: `false`)
     */
    data: boolean;
    /**
     * A boolean, controlling whether [[debug]] events will be emitted with text describing packet details
     *
     * (default: `false`)
     */
    packet: boolean;
    /**
     * A boolean, controlling whether [[debug]] events will be emitted with text describing packet payload details
     *
     * (default: `false`)
     */
    payload: boolean;
    /**
     * A boolean, controlling whether [[debug]] events will be emitted with text describing token stream tokens
     *
     * (default: `false`)
     */
    token: boolean;
}
interface AuthenticationOptions {
    /**
     * Type of the authentication method, valid types are `default`, `ntlm`,
     * `azure-active-directory-password`, `azure-active-directory-access-token`,
     * `azure-active-directory-msi-vm`, `azure-active-directory-msi-app-service`,
     * `azure-active-directory-default`
     * or `azure-active-directory-service-principal-secret`
     */
    type?: AuthenticationType;
    /**
     * Different options for authentication types:
     *
     * * `default`: [[DefaultAuthentication.options]]
     * * `ntlm` :[[NtlmAuthentication]]
     * * `token-credential`: [[CredentialChainAuthentication.options]]
     * * `azure-active-directory-password` : [[AzureActiveDirectoryPasswordAuthentication.options]]
     * * `azure-active-directory-access-token` : [[AzureActiveDirectoryAccessTokenAuthentication.options]]
     * * `azure-active-directory-msi-vm` : [[AzureActiveDirectoryMsiVmAuthentication.options]]
     * * `azure-active-directory-msi-app-service` : [[AzureActiveDirectoryMsiAppServiceAuthentication.options]]
     * * `azure-active-directory-service-principal-secret` : [[AzureActiveDirectoryServicePrincipalSecret.options]]
     * * `azure-active-directory-default` : [[AzureActiveDirectoryDefaultAuthentication.options]]
     */
    options?: any;
}
export interface ConnectionOptions {
    /**
     * A boolean determining whether to rollback a transaction automatically if any error is encountered
     * during the given transaction's execution. This sets the value for `SET XACT_ABORT` during the
     * initial SQL phase of a connection [documentation](https://docs.microsoft.com/en-us/sql/t-sql/statements/set-xact-abort-transact-sql).
     */
    abortTransactionOnError?: boolean | undefined;
    /**
     * Application name used for identifying a specific application in profiling, logging or tracing tools of SQLServer.
     *
     * (default: `Tedious`)
     */
    appName?: string | undefined;
    /**
     * A boolean, controlling whether the column names returned will have the first letter converted to lower case
     * (`true`) or not. This value is ignored if you provide a [[columnNameReplacer]].
     *
     * (default: `false`).
     */
    camelCaseColumns?: boolean;
    /**
     * The number of milliseconds before the [[Request.cancel]] (abort) of a request is considered failed
     *
     * (default: `5000`).
     */
    cancelTimeout?: number;
    /**
     * A function with parameters `(columnName, index, columnMetaData)` and returning a string. If provided,
     * this will be called once per column per result-set. The returned value will be used instead of the SQL-provided
     * column name on row and meta data objects. This allows you to dynamically convert between naming conventions.
     *
     * (default: `null`)
     */
    columnNameReplacer?: (colName: string, index: number, metadata: Metadata) => string;
    /**
     * Number of milliseconds before retrying to establish connection, in case of transient failure.
     *
     * (default:`500`)
     */
    connectionRetryInterval?: number;
    /**
     * Custom connector factory method.
     *
     * (default: `undefined`)
     */
    connector?: () => Promise<net.Socket>;
    /**
     * The number of milliseconds before the attempt to connect is considered failed
     *
     * (default: `15000`).
     */
    connectTimeout?: number;
    /**
     * The default isolation level for new connections. All out-of-transaction queries are executed with this setting.
     *
     * The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
     * * `READ_UNCOMMITTED`
     * * `READ_COMMITTED`
     * * `REPEATABLE_READ`
     * * `SERIALIZABLE`
     * * `SNAPSHOT`
     *
     * (default: `READ_COMMITED`).
     */
    connectionIsolationLevel?: number;
    /**
     * When encryption is used, an object may be supplied that will be used
     * for the first argument when calling [`tls.createSecurePair`](http://nodejs.org/docs/latest/api/tls.html#tls_tls_createsecurepair_credentials_isserver_requestcert_rejectunauthorized)
     *
     * (default: `{}`)
     */
    cryptoCredentialsDetails?: SecureContextOptions;
    /**
     * Database to connect to (default: dependent on server configuration).
     */
    database?: string | undefined;
    /**
     * Sets the first day of the week to a number from 1 through 7.
     */
    datefirst?: number;
    /**
     * A string representing position of month, day and year in temporal datatypes.
     *
     * (default: `mdy`)
     */
    dateFormat?: string;
    debug?: DebugOptions;
    /**
     * A boolean, controls the way null values should be used during comparison operation.
     *
     * (default: `true`)
     */
    enableAnsiNull?: boolean;
    /**
     * If true, `SET ANSI_NULL_DFLT_ON ON` will be set in the initial sql. This means new columns will be
     * nullable by default. See the [T-SQL documentation](https://msdn.microsoft.com/en-us/library/ms187375.aspx)
     *
     * (default: `true`).
     */
    enableAnsiNullDefault?: boolean;
    /**
     * A boolean, controls if padding should be applied for values shorter than the size of defined column.
     *
     * (default: `true`)
     */
    enableAnsiPadding?: boolean;
    /**
     * If true, SQL Server will follow ISO standard behavior during various error conditions. For details,
     * see [documentation](https://docs.microsoft.com/en-us/sql/t-sql/statements/set-ansi-warnings-transact-sql)
     *
     * (default: `true`)
     */
    enableAnsiWarnings?: boolean;
    /**
     * Ends a query when an overflow or divide-by-zero error occurs during query execution.
     * See [documentation](https://docs.microsoft.com/en-us/sql/t-sql/statements/set-arithabort-transact-sql?view=sql-server-2017)
     * for more details.
     *
     * (default: `true`)
     */
    enableArithAbort?: boolean;
    /**
     * A boolean, determines if concatenation with NULL should result in NULL or empty string value, more details in
     * [documentation](https://docs.microsoft.com/en-us/sql/t-sql/statements/set-concat-null-yields-null-transact-sql)
     *
     * (default: `true`)
     */
    enableConcatNullYieldsNull?: boolean;
    /**
     * A boolean, controls whether cursor should be closed, if the transaction opening it gets committed or rolled
     * back.
     *
     * (default: `null`)
     */
    enableCursorCloseOnCommit?: boolean | null;
    /**
     * A boolean, sets the connection to either implicit or autocommit transaction mode.
     *
     * (default: `false`)
     */
    enableImplicitTransactions?: boolean;
    /**
     * If false, error is not generated during loss of precession.
     *
     * (default: `false`)
     */
    enableNumericRoundabort?: boolean;
    /**
     * If true, characters enclosed in single quotes are treated as literals and those enclosed double quotes are treated as identifiers.
     *
     * (default: `true`)
     */
    enableQuotedIdentifier?: boolean;
    /**
     * A string value that can be only set to 'strict', which indicates the usage TDS 8.0 protocol. Otherwise,
     * a boolean determining whether or not the connection will be encrypted.
     *
     * (default: `true`)
     */
    encrypt?: string | boolean;
    /**
     * By default, if the database requested by [[database]] cannot be accessed,
     * the connection will fail with an error. However, if [[fallbackToDefaultDb]] is
     * set to `true`, then the user's default database will be used instead
     *
     * (default: `false`)
     */
    fallbackToDefaultDb?: boolean;
    /**
     * The instance name to connect to.
     * The SQL Server Browser service must be running on the database server,
     * and UDP port 1434 on the database server must be reachable.
     *
     * (no default)
     *
     * Mutually exclusive with [[port]].
     */
    instanceName?: string | undefined;
    /**
     * The default isolation level that transactions will be run with.
     *
     * The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
     * * `READ_UNCOMMITTED`
     * * `READ_COMMITTED`
     * * `REPEATABLE_READ`
     * * `SERIALIZABLE`
     * * `SNAPSHOT`
     *
     * (default: `READ_COMMITED`).
     */
    isolationLevel?: number;
    /**
     * Specifies the language environment for the session. The session language determines the datetime formats and system messages.
     *
     * (default: `us_english`).
     */
    language?: string;
    /**
     * A string indicating which network interface (ip address) to use when connecting to SQL Server.
     */
    localAddress?: string | undefined;
    /**
     * A boolean determining whether to parse unique identifier type with lowercase case characters.
     *
     * (default: `false`).
     */
    lowerCaseGuids?: boolean;
    /**
     * The maximum number of connection retries for transient errors.、
     *
     * (default: `3`).
     */
    maxRetriesOnTransientErrors?: number;
    /**
     * Sets the MultiSubnetFailover = True parameter, which can help minimize the client recovery latency when failovers occur.
     *
     * (default: `false`).
     */
    multiSubnetFailover?: boolean;
    /**
     * The size of TDS packets (subject to negotiation with the server).
     * Should be a power of 2.
     *
     * (default: `4096`).
     */
    packetSize?: number;
    /**
     * Port to connect to (default: `1433`).
     *
     * Mutually exclusive with [[instanceName]]
     */
    port?: number | undefined;
    /**
     * A boolean, determining whether the connection will request read only access from a SQL Server Availability
     * Group. For more information, see [here](http://msdn.microsoft.com/en-us/library/hh710054.aspx "Microsoft: Configure Read-Only Routing for an Availability Group (SQL Server)")
     *
     * (default: `false`).
     */
    readOnlyIntent?: boolean;
    /**
     * The number of milliseconds before a request is considered failed, or `0` for no timeout.
     *
     * As soon as a response is received, the timeout is cleared. This means that queries that immediately return a response have ability to run longer than this timeout.
     *
     * (default: `15000`).
     */
    requestTimeout?: number;
    /**
     * A boolean, that when true will expose received rows in Requests done related events:
     * * [[Request.Event_doneInProc]]
     * * [[Request.Event_doneProc]]
     * * [[Request.Event_done]]
     *
     * (default: `false`)
     *
     * Caution: If many row are received, enabling this option could result in
     * excessive memory usage.
     */
    rowCollectionOnDone?: boolean;
    /**
     * A boolean, that when true will expose received rows in Requests' completion callback.See [[Request.constructor]].
     *
     * (default: `false`)
     *
     * Caution: If many row are received, enabling this option could result in
     * excessive memory usage.
     */
    rowCollectionOnRequestCompletion?: boolean;
    /**
     * The version of TDS to use. If server doesn't support specified version, negotiated version is used instead.
     *
     * The versions are available from `require('tedious').TDS_VERSION`.
     * * `7_1`
     * * `7_2`
     * * `7_3_A`
     * * `7_3_B`
     * * `7_4`
     *
     * (default: `7_4`)
     */
    tdsVersion?: string | undefined;
    /**
     * Specifies the size of varchar(max), nvarchar(max), varbinary(max), text, ntext, and image data returned by a SELECT statement.
     *
     * (default: `2147483647`)
     */
    textsize?: number;
    /**
     * If "true", the SQL Server SSL certificate is automatically trusted when the communication layer is encrypted using SSL.
     *
     * If "false", the SQL Server validates the server SSL certificate. If the server certificate validation fails,
     * the driver raises an error and terminates the connection. Make sure the value passed to serverName exactly
     * matches the Common Name (CN) or DNS name in the Subject Alternate Name in the server certificate for an SSL connection to succeed.
     *
     * (default: `true`)
     */
    trustServerCertificate?: boolean;
    /**
     *
     */
    serverName?: string;
    /**
     * A boolean determining whether to return rows as arrays or key-value collections.
     *
     * (default: `false`).
     */
    useColumnNames?: boolean;
    /**
     * A boolean determining whether to pass time values in UTC or local time.
     *
     * (default: `true`).
     */
    useUTC?: boolean;
    /**
     * The workstation ID (WSID) of the client, default os.hostname().
     * Used for identifying a specific client in profiling, logging or
     * tracing client activity in SQLServer.
     *
     * The value is reported by the TSQL function HOST_NAME().
     */
    workstationId?: string | undefined;
}
interface RoutingData {
    server: string;
    port: number;
    instance: string;
}
/**
 * A [[Connection]] instance represents a single connection to a database server.
 *
 * ```js
 * var Connection = require('tedious').Connection;
 * var config = {
 *  "authentication": {
 *    ...,
 *    "options": {...}
 *  },
 *  "options": {...}
 * };
 * var connection = new Connection(config);
 * ```
 *
 * Only one request at a time may be executed on a connection. Once a [[Request]]
 * has been initiated (with [[Connection.callProcedure]], [[Connection.execSql]],
 * or [[Connection.execSqlBatch]]), another should not be initiated until the
 * [[Request]]'s completion callback is called.
 */
declare class Connection extends EventEmitter {
    /**
     * @private
     */
    fedAuthRequired: boolean;
    /**
     * @private
     */
    config: InternalConnectionConfig;
    /**
     * @private
     */
    secureContextOptions: SecureContextOptions;
    /**
     * @private
     */
    inTransaction: boolean;
    /**
     * @private
     */
    transactionDescriptors: Buffer[];
    /**
     * @private
     */
    transactionDepth: number;
    /**
     * @private
     */
    isSqlBatch: boolean;
    /**
     * @private
     */
    curTransientRetryCount: number;
    /**
     * @private
     */
    transientErrorLookup: TransientErrorLookup;
    /**
     * @private
     */
    closed: boolean;
    /**
     * @private
     */
    loginError: undefined | AggregateError | ConnectionError;
    /**
     * @private
     */
    debug: Debug;
    /**
     * @private
     */
    ntlmpacket: undefined | any;
    /**
     * @private
     */
    ntlmpacketBuffer: undefined | Buffer;
    /**
     * @private
     */
    STATE: {
        INITIALIZED: State;
        CONNECTING: State;
        SENT_PRELOGIN: State;
        REROUTING: State;
        TRANSIENT_FAILURE_RETRY: State;
        SENT_TLSSSLNEGOTIATION: State;
        SENT_LOGIN7_WITH_STANDARD_LOGIN: State;
        SENT_LOGIN7_WITH_NTLM: State;
        SENT_LOGIN7_WITH_FEDAUTH: State;
        LOGGED_IN_SENDING_INITIAL_SQL: State;
        LOGGED_IN: State;
        SENT_CLIENT_REQUEST: State;
        SENT_ATTENTION: State;
        FINAL: State;
    };
    /**
     * @private
     */
    routingData: undefined | RoutingData;
    /**
     * @private
     */
    messageIo: MessageIO;
    /**
     * @private
     */
    state: State;
    /**
     * @private
     */
    resetConnectionOnNextRequest: undefined | boolean;
    /**
     * @private
     */
    request: undefined | Request | BulkLoad;
    /**
     * @private
     */
    procReturnStatusValue: undefined | any;
    /**
     * @private
     */
    socket: undefined | net.Socket;
    /**
     * @private
     */
    messageBuffer: Buffer;
    /**
     * @private
     */
    cancelTimer: undefined | NodeJS.Timeout;
    /**
     * @private
     */
    requestTimer: undefined | NodeJS.Timeout;
    /**
     * @private
     */
    _cancelAfterRequestSent: () => void;
    /**
     * @private
     */
    databaseCollation: Collation | undefined;
    /**
     * @private
     */
    _onSocketClose: (hadError: boolean) => void;
    /**
     * @private
     */
    _onSocketError: (err: Error) => void;
    /**
     * @private
     */
    _onSocketEnd: () => void;
    /**
     * Note: be aware of the different options field:
     * 1. config.authentication.options
     * 2. config.options
     *
     * ```js
     * const { Connection } = require('tedious');
     *
     * const config = {
     *  "authentication": {
     *    ...,
     *    "options": {...}
     *  },
     *  "options": {...}
     * };
     *
     * const connection = new Connection(config);
     * ```
     *
     * @param config
     */
    constructor(config: ConnectionConfiguration);
    connect(connectListener?: (err?: Error) => void): void;
    /**
     * The server has reported that the charset has changed.
     */
    on(event: 'charsetChange', listener: (charset: string) => void): this;
    /**
     * The attempt to connect and validate has completed.
     */
    on(event: 'connect', 
    /**
     * @param err If successfully connected, will be falsey. If there was a
     *   problem (with either connecting or validation), will be an [[Error]] object.
     */
    listener: (err: Error | undefined) => void): this;
    /**
     * The server has reported that the active database has changed.
     * This may be as a result of a successful login, or a `use` statement.
     */
    on(event: 'databaseChange', listener: (databaseName: string) => void): this;
    /**
     * A debug message is available. It may be logged or ignored.
     */
    on(event: 'debug', listener: (messageText: string) => void): this;
    /**
     * Internal error occurs.
     */
    on(event: 'error', listener: (err: Error) => void): this;
    /**
     * The server has issued an error message.
     */
    on(event: 'errorMessage', listener: (message: import('./token/token').ErrorMessageToken) => void): this;
    /**
     * The connection has ended.
     *
     * This may be as a result of the client calling [[close]], the server
     * closing the connection, or a network error.
     */
    on(event: 'end', listener: () => void): this;
    /**
     * The server has issued an information message.
     */
    on(event: 'infoMessage', listener: (message: import('./token/token').InfoMessageToken) => void): this;
    /**
     * The server has reported that the language has changed.
     */
    on(event: 'languageChange', listener: (languageName: string) => void): this;
    /**
     * The connection was reset.
     */
    on(event: 'resetConnection', listener: () => void): this;
    /**
     * A secure connection has been established.
     */
    on(event: 'secure', listener: (cleartext: import('tls').TLSSocket) => void): this;
    /**
     * @private
     */
    emit(event: 'charsetChange', charset: string): boolean;
    /**
     * @private
     */
    emit(event: 'connect', error?: Error): boolean;
    /**
     * @private
     */
    emit(event: 'databaseChange', databaseName: string): boolean;
    /**
     * @private
     */
    emit(event: 'databaseMirroringPartner', partnerInstanceName: string): boolean;
    /**
     * @private
     */
    emit(event: 'debug', messageText: string): boolean;
    /**
     * @private
     */
    emit(event: 'error', error: Error): boolean;
    /**
     * @private
     */
    emit(event: 'errorMessage', message: import('./token/token').ErrorMessageToken): boolean;
    /**
     * @private
     */
    emit(event: 'end'): boolean;
    /**
     * @private
     */
    emit(event: 'infoMessage', message: import('./token/token').InfoMessageToken): boolean;
    /**
     * @private
     */
    emit(event: 'languageChange', languageName: string): boolean;
    /**
     * @private
     */
    emit(event: 'secure', cleartext: import('tls').TLSSocket): boolean;
    /**
     * @private
     */
    emit(event: 'rerouting'): boolean;
    /**
     * @private
     */
    emit(event: 'resetConnection'): boolean;
    /**
     * @private
     */
    emit(event: 'retry'): boolean;
    /**
     * @private
     */
    emit(event: 'rollbackTransaction'): boolean;
    /**
     * Closes the connection to the database.
     *
     * The [[Event_end]] will be emitted once the connection has been closed.
     */
    close(): void;
    /**
     * @private
     */
    initialiseConnection(): Promise<void>;
    /**
     * @private
     */
    cleanupConnection(): void;
    /**
     * @private
     */
    createDebug(): Debug;
    /**
     * @private
     */
    createTokenStreamParser(message: Message, handler: TokenHandler): TokenStreamParser;
    wrapWithTls(socket: net.Socket, signal: AbortSignal): Promise<tls.TLSSocket>;
    connectOnPort(port: number, multiSubnetFailover: boolean, signal: AbortSignal, customConnector?: () => Promise<net.Socket>): Promise<net.Socket>;
    /**
     * @private
     */
    closeConnection(): void;
    /**
     * @private
     */
    createCancelTimer(): void;
    /**
     * @private
     */
    createRequestTimer(): void;
    /**
     * @private
     */
    cancelTimeout(): void;
    /**
     * @private
     */
    requestTimeout(): void;
    /**
     * @private
     */
    clearCancelTimer(): void;
    /**
     * @private
     */
    clearRequestTimer(): void;
    /**
     * @private
     */
    transitionTo(newState: State): void;
    /**
     * @private
     */
    getEventHandler<T extends keyof State['events']>(eventName: T): NonNullable<State['events'][T]>;
    /**
     * @private
     */
    dispatchEvent<T extends keyof State['events']>(eventName: T, ...args: Parameters<NonNullable<State['events'][T]>>): void;
    /**
     * @private
     */
    wrapSocketError(error: Error): ConnectionError;
    /**
     * @private
     */
    socketEnd(): void;
    /**
     * @private
     */
    socketClose(): void;
    /**
     * @private
     */
    sendPreLogin(): void;
    /**
     * @private
     */
    sendLogin7Packet(): void;
    /**
     * @private
     */
    sendFedAuthTokenMessage(token: string): void;
    /**
     * @private
     */
    sendInitialSql(): void;
    /**
     * @private
     */
    getInitialSql(): string;
    /**
     * Execute the SQL batch represented by [[Request]].
     * There is no param support, and unlike [[Request.execSql]],
     * it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
     *
     * In almost all cases, [[Request.execSql]] will be a better choice.
     *
     * @param request A [[Request]] object representing the request.
     */
    execSqlBatch(request: Request): void;
    /**
     *  Execute the SQL represented by [[Request]].
     *
     * As `sp_executesql` is used to execute the SQL, if the same SQL is executed multiples times
     * using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates
     * for the first execution. This may also result in SQL server treating the request like a stored procedure
     * which can result in the [[Event_doneInProc]] or [[Event_doneProc]] events being emitted instead of the
     * [[Event_done]] event you might expect. Using [[execSqlBatch]] will prevent this from occurring but may have a negative performance impact.
     *
     * Beware of the way that scoping rules apply, and how they may [affect local temp tables](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)
     * If you're running in to scoping issues, then [[execSqlBatch]] may be a better choice.
     * See also [issue #24](https://github.com/pekim/tedious/issues/24)
     *
     * @param request A [[Request]] object representing the request.
     */
    execSql(request: Request): void;
    /**
     * Creates a new BulkLoad instance.
     *
     * @param table The name of the table to bulk-insert into.
     * @param options A set of bulk load options.
     */
    newBulkLoad(table: string, callback: BulkLoadCallback): BulkLoad;
    newBulkLoad(table: string, options: BulkLoadOptions, callback: BulkLoadCallback): BulkLoad;
    /**
     * Execute a [[BulkLoad]].
     *
     * ```js
     * // We want to perform a bulk load into a table with the following format:
     * // CREATE TABLE employees (first_name nvarchar(255), last_name nvarchar(255), day_of_birth date);
     *
     * const bulkLoad = connection.newBulkLoad('employees', (err, rowCount) => {
     *   // ...
     * });
     *
     * // First, we need to specify the columns that we want to write to,
     * // and their definitions. These definitions must match the actual table,
     * // otherwise the bulk load will fail.
     * bulkLoad.addColumn('first_name', TYPES.NVarchar, { nullable: false });
     * bulkLoad.addColumn('last_name', TYPES.NVarchar, { nullable: false });
     * bulkLoad.addColumn('date_of_birth', TYPES.Date, { nullable: false });
     *
     * // Execute a bulk load with a predefined list of rows.
     * //
     * // Note that these rows are held in memory until the
     * // bulk load was performed, so if you need to write a large
     * // number of rows (e.g. by reading from a CSV file),
     * // passing an `AsyncIterable` is advisable to keep memory usage low.
     * connection.execBulkLoad(bulkLoad, [
     *   { 'first_name': 'Steve', 'last_name': 'Jobs', 'day_of_birth': new Date('02-24-1955') },
     *   { 'first_name': 'Bill', 'last_name': 'Gates', 'day_of_birth': new Date('10-28-1955') }
     * ]);
     * ```
     *
     * @param bulkLoad A previously created [[BulkLoad]].
     * @param rows A [[Iterable]] or [[AsyncIterable]] that contains the rows that should be bulk loaded.
     */
    execBulkLoad(bulkLoad: BulkLoad, rows: AsyncIterable<unknown[] | {
        [columnName: string]: unknown;
    }> | Iterable<unknown[] | {
        [columnName: string]: unknown;
    }>): void;
    /**
     * Prepare the SQL represented by the request.
     *
     * The request can then be used in subsequent calls to
     * [[execute]] and [[unprepare]]
     *
     * @param request A [[Request]] object representing the request.
     *   Parameters only require a name and type. Parameter values are ignored.
     */
    prepare(request: Request): void;
    /**
     * Release the SQL Server resources associated with a previously prepared request.
     *
     * @param request A [[Request]] object representing the request.
     *   Parameters only require a name and type.
     *   Parameter values are ignored.
     */
    unprepare(request: Request): void;
    /**
     * Execute previously prepared SQL, using the supplied parameters.
     *
     * @param request A previously prepared [[Request]].
     * @param parameters  An object whose names correspond to the names of
     *   parameters that were added to the [[Request]] before it was prepared.
     *   The object's values are passed as the parameters' values when the
     *   request is executed.
     */
    execute(request: Request, parameters?: {
        [key: string]: unknown;
    }): void;
    /**
     * Call a stored procedure represented by [[Request]].
     *
     * @param request A [[Request]] object representing the request.
     */
    callProcedure(request: Request): void;
    /**
     * Start a transaction.
     *
     * @param callback
     * @param name A string representing a name to associate with the transaction.
     *   Optional, and defaults to an empty string. Required when `isolationLevel`
     *   is present.
     * @param isolationLevel The isolation level that the transaction is to be run with.
     *
     *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
     *   * `READ_UNCOMMITTED`
     *   * `READ_COMMITTED`
     *   * `REPEATABLE_READ`
     *   * `SERIALIZABLE`
     *   * `SNAPSHOT`
     *
     *   Optional, and defaults to the Connection's isolation level.
     */
    beginTransaction(callback: BeginTransactionCallback, name?: string, isolationLevel?: number): void;
    /**
     * Commit a transaction.
     *
     * There should be an active transaction - that is, [[beginTransaction]]
     * should have been previously called.
     *
     * @param callback
     * @param name A string representing a name to associate with the transaction.
     *   Optional, and defaults to an empty string. Required when `isolationLevel`is present.
     */
    commitTransaction(callback: CommitTransactionCallback, name?: string): void;
    /**
     * Rollback a transaction.
     *
     * There should be an active transaction - that is, [[beginTransaction]]
     * should have been previously called.
     *
     * @param callback
     * @param name A string representing a name to associate with the transaction.
     *   Optional, and defaults to an empty string.
     *   Required when `isolationLevel` is present.
     */
    rollbackTransaction(callback: RollbackTransactionCallback, name?: string): void;
    /**
     * Set a savepoint within a transaction.
     *
     * There should be an active transaction - that is, [[beginTransaction]]
     * should have been previously called.
     *
     * @param callback
     * @param name A string representing a name to associate with the transaction.\
     *   Optional, and defaults to an empty string.
     *   Required when `isolationLevel` is present.
     */
    saveTransaction(callback: SaveTransactionCallback, name: string): void;
    /**
     * Run the given callback after starting a transaction, and commit or
     * rollback the transaction afterwards.
     *
     * This is a helper that employs [[beginTransaction]], [[commitTransaction]],
     * [[rollbackTransaction]], and [[saveTransaction]] to greatly simplify the
     * use of database transactions and automatically handle transaction nesting.
     *
     * @param cb
     * @param isolationLevel
     *   The isolation level that the transaction is to be run with.
     *
     *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
     *   * `READ_UNCOMMITTED`
     *   * `READ_COMMITTED`
     *   * `REPEATABLE_READ`
     *   * `SERIALIZABLE`
     *   * `SNAPSHOT`
     *
     *   Optional, and defaults to the Connection's isolation level.
     */
    transaction(cb: (err: Error | null | undefined, txDone?: <T extends TransactionDoneCallback>(err: Error | null | undefined, done: T, ...args: CallbackParameters<T>) => void) => void, isolationLevel?: typeof ISOLATION_LEVEL[keyof typeof ISOLATION_LEVEL]): void;
    /**
     * @private
     */
    makeRequest(request: Request | BulkLoad, packetType: number, payload: (Iterable<Buffer> | AsyncIterable<Buffer>) & {
        toString: (indent?: string) => string;
    }): void;
    /**
     * Cancel currently executed request.
     */
    cancel(): boolean;
    /**
     * Reset the connection to its initial state.
     * Can be useful for connection pool implementations.
     *
     * @param callback
     */
    reset(callback: ResetCallback): void;
    /**
     * @private
     */
    currentTransactionDescriptor(): Buffer<ArrayBufferLike>;
    /**
     * @private
     */
    getIsolationLevelText(isolationLevel: typeof ISOLATION_LEVEL[keyof typeof ISOLATION_LEVEL]): "read uncommitted" | "repeatable read" | "serializable" | "snapshot" | "read committed";
    /**
     * @private
     */
    performTlsNegotiation(preloginPayload: PreloginPayload, signal: AbortSignal): Promise<void>;
    readPreloginResponse(signal: AbortSignal): Promise<PreloginPayload>;
    /**
     * @private
     */
    performReRouting(): Promise<void>;
    /**
     * @private
     */
    performTransientFailureRetry(): Promise<void>;
    /**
     * @private
     */
    performSentLogin7WithStandardLogin(signal: AbortSignal): Promise<RoutingData | undefined>;
    /**
     * @private
     */
    performSentLogin7WithNTLMLogin(signal: AbortSignal): Promise<RoutingData | undefined>;
    /**
     * @private
     */
    performSentLogin7WithFedAuth(signal: AbortSignal): Promise<RoutingData | undefined>;
    /**
     * @private
     */
    performLoggedInSendingInitialSql(signal: AbortSignal): Promise<void>;
}
export default Connection;
