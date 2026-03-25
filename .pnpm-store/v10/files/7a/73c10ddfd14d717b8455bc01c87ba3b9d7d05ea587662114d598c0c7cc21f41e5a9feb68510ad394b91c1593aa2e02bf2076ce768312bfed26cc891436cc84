/// <reference types="node" />

import events = require("events");
import { SecureContextOptions } from "tls";

export interface ColumnType {
    /**
     * The column's type, such as VarChar, Int or Binary.
     */
    name: string;
}

export interface ColumnMetaData {
    /**
     * The column's name
     */
    colName: string;

    /**
     * The column type.
     */
    type: ColumnType;

    /**
     * The precision. Only applicable to numeric and decimal.
     */
    precision?: number | undefined;

    /**
     * The scale. Only applicable to numeric, decimal, time, datetime2 and datetimeoffset.
     */
    scale?: number | undefined;

    /**
     * The length, for char, varchar, nvarchar and varbinary.
     */
    dataLength?: number | undefined;
}

export interface DebugOptions {
    /**
     * A boolean, controlling whether debug events will be emitted with text describing packet details (default: false).
     */
    packet?: boolean | undefined;

    /**
     * A boolean, controlling whether debug events will be emitted with text describing packet data details (default: false).
     */
    data?: boolean | undefined;

    /**
     * A boolean, controlling whether debug events will be emitted with text describing packet payload details (default: false).
     */
    payload?: boolean | undefined;

    /**
     * A boolean, controlling whether debug events will be emitted with text describing token stream tokens (default: false).
     */
    token?: boolean | undefined;
}

export declare enum ISOLATION_LEVEL {
    NO_CHANGE = 0x00,
    READ_UNCOMMITTED = 0x01,
    READ_COMMITTED = 0x02,
    REPEATABLE_READ = 0x03,
    SERIALIZABLE = 0x04,
    SNAPSHOT = 0x05,
}

/**
 * Unfortunately these aren't valid JavaScript identifiers
 * so I cannot list the values here as enum values
    7_1 = 0x71000001,
    7_2 = 0x72090002,
    7_3_A = 0x730A0003,
    7_3_B = 0x730B0003,
    7_4 = 0x74000004
    */
export declare var TDS_VERSION: { [index: string]: number };

export interface TediousType {
    type: string;
    name: string;
}

export interface TediousTypes {
    BigInt: TediousType;
    Binary: TediousType;
    Bit: TediousType;
    Char: TediousType;
    Date: TediousType;
    DateTime2: TediousType;
    DateTime: TediousType;
    DateTimeOffset: TediousType;
    Decimal: TediousType;
    Float: TediousType;
    Image: TediousType;
    Int: TediousType;
    Money: TediousType;
    NChar: TediousType;
    NText: TediousType;
    NVarChar: TediousType;
    Null: TediousType;
    Numeric: TediousType;
    Real: TediousType;
    SmallDateTime: TediousType;
    SmallInt: TediousType;
    SmallMoney: TediousType;
    TVP: TediousType;
    Text: TediousType;
    Time: TediousType;
    TinyInt: TediousType;
    UDT: TediousType;
    UniqueIdentifier: TediousType;
    VarBinary: TediousType;
    VarChar: TediousType;
    Variant: TediousType;
    Xml: TediousType;
}

export declare var TYPES: TediousTypes;

export interface ConnectionOptions {
    /**
     * Port to connect to (default: 1433). Mutually exclusive with options.instanceName.
     */
    port?: number | undefined;

    /**
     * The instance name to connect to. The SQL Server Browser service must be running on the database server,
     * and UDP port 1444 on the database server must be reachable. (no default) Mutually exclusive with options.port.
     */
    instanceName?: string | undefined;

    /**
     * Database to connect to (default: dependent on server configuration).
     */
    database?: string | undefined;

    /**
     * By default, if the database requested by options.database cannot be accessed,
     * the connection will fail with an error. However, if options.fallbackToDefaultDb is set to true,
     * then the user's default database will be  * used instead (Default: false).
     */
    fallbackToDefaultDb?: boolean | undefined;

    /**
     * The number of milliseconds before the attempt to connect is considered failed (default: 15000).
     */
    connectTimeout?: number | undefined;

    /**
     * The number of milliseconds before a request is considered failed, or 0 for no timeout (default: 15000).
     */
    requestTimeout?: number | undefined;

    /**
     * The number of milliseconds before the cancel (abort) of a request is considered failed (default: 5000).
     */
    cancelTimeout?: number | undefined;

    /**
     * The size of TDS packets (subject to negotiation with the server). Should be a power of 2. (default: 4096).
     */
    packetSize?: number | undefined;

    /**
     * A boolean determining whether to pass time values in UTC or local time. (default: true).
     */
    useUTC?: boolean | undefined;

    /**
     * A boolean determining whether to rollback a transaction automatically if any error is encountered
     * during the given transaction's execution. This sets the value for SET XACT_ABORT during the initial
     * SQL phase of a connection (documentation).
     */
    abortTransactionOnError?: boolean | undefined;

    /**
     * A string indicating which network interface (ip address) to use when connecting to SQL Server.
     */
    localAddress?: string | undefined;

    /**
     * A boolean determining whether to return rows as arrays or key-value collections. (default: false).
     */
    useColumnNames?: boolean | undefined;

    /**
     * A boolean, controlling whether the column names returned will have the first letter converted
     * to lower case (true) or not. This value is ignored if you provide a columnNameReplacer. (default: false).
     */
    camelCaseColumns?: boolean | undefined;

    /**
     * A function with parameters (columnName, index, columnMetaData) and returning a string. If provided,
     * this will be called once per column per result-set. The returned value will be used instead of the
     * SQL-provided column name on row and meta data objects. This allows you to dynamically convert between
     * naming conventions. (default: null).
     */
    columnNameReplacer?: ((columnName: string, index: number, columnMetaData: ColumnMetaData) => string) | undefined;

    /**
     * Debug options
     */
    debug?: DebugOptions | undefined;

    /**
     * The default isolation level that transactions will be run with. (default: READ_COMMITTED).
     */
    isolationLevel?: ISOLATION_LEVEL | undefined;

    /**
     * The default isolation level for new connections. All out-of-transaction queries are executed with this setting. (default: READ_COMMITED)
     */
    connectionIsolationLevel?: ISOLATION_LEVEL | undefined;

    /**
     * A boolean, determining whether the connection will request read only access from a SQL Server Availability Group. For more information, see here. (default: false).
     */
    readOnlyIntent?: boolean | undefined;

    /**
     * A boolean determining whether or not the connection will be encrypted. Set to true if you're on Windows Azure. (default: false).
     */
    encrypt?: boolean | undefined;

    /**
     * When encryption is used, an object may be supplied that will be used for the first argument when calling tls.createSecurePair (default: {}).
     */
    cryptoCredentialsDetails?: SecureContextOptions | undefined;

    /**
     * A boolean, that when true will expose received rows in Requests' done* events. See done, doneInProc and doneProc. (default: false)
     * Caution: If many row are received, enabling this option could result in excessive memory usage.
     */
    rowCollectionOnDone?: boolean | undefined;

    /**
     * A boolean, that when true will expose received rows in Requests' completion callback. See new Request. (default: false)
     * Caution: If many row are received, enabling this option could result in excessive memory usage.
     */
    rowCollectionOnRequestCompletion?: boolean | undefined;

    /**
     * The version of TDS to use. If server doesn't support specified version, negotiated version is used instead. (default: 7_4).
     * Take this from tedious.TDS_VERSION.7_4 .
     */
    tdsVersion?: string | undefined;

    /**
     * Application name used for identifying a specific application in profiling, logging or tracing tools of SQL Server. (default: Tedious)
     */
    appName?: string | undefined;

    /**
     * Number of milliseconds before retrying to establish connection, in case of transient failure. (default: 500)
     */
    connectionRetryInterval?: number | undefined;

    /**
     * Number that sets to the first day of the week, it can be a number from 1 through 7.(default: 7, i.e, first day of the week is Sunday)
     */
    datefirst?: number | undefined;

    /**
     * A string representing position of month, day and year in temporal datatypes. (default: mdy)
     */
    dateFormat?: string | undefined;

    /**
     * A boolean, controls the way null values should be used during comparison operation. (default: true)
     */
    enableAnsiNull?: boolean | undefined;

    /**
     * If true, SET ANSI_NULL_DFLT_ON ON will be set in the initial sql. This means new columns will be nullable by default. See the T-SQL documentation for more details. (Default: true).
     */
    enableAnsiNullDefault?: boolean | undefined;

    /**
     * A boolean, controls if padding should be applied for values shorter than the size of defined column. (default: true)
     */
    enableAnsiPadding?: boolean | undefined;

    /**
     * If true, SQL Server will follow ISO standard behavior during various error conditions. For details, see documentation. (default: true)
     */
    enableAnsiWarnings?: boolean | undefined;

    /**
     * A boolean, determines if query execution should be terminated during overflow or divide-by-zero error. (default: false)
     */
    enableArithAbort?: boolean | undefined;

    /**
     * A boolean, determines if concatenation with NULL should result in NULL or empty string value, more details in documentation. (default: true)
     */
    enableConcatNullYieldsNull?: boolean | undefined;

    /**
     * A boolean, controls whether cursor should be closed, if the transaction opening it gets committed or rolled back. (default: false)
     */
    enableCursorCloseOnCommit?: boolean | undefined;

    /**
     * A boolean, sets the connection to either implicit or autocommit transaction mode. (default: false)
     */
    enableImplicitTransactions?: boolean | undefined;

    /**
     * If false, error is not generated during loss of precession. (default: false)
     */
    enableNumericRoundabort?: boolean | undefined;

    /**
     * If true, characters enclosed in single quotes are treated as literals and those enclosed double quotes are treated as identifiers. (default: true)
     */
    enableQuotedIdentifier?: boolean | undefined;

    /**
     * A string, sets the language of the session (default: us_english)
     */
    language?: string | undefined;

    /**
     * Number of retries on transient error (default: 3)
     */
    maxRetriesOnTransientErrors?: number | undefined;

    /**
     * Sets the MultiSubnetFailover = True parameter, which can help minimize the client recovery latency when failovers occur.
     * (default: `false`).
     */
    multiSubnetFailover?: boolean | undefined;

    /**
     * Size of data to be returned by SELECT statement for varchar(max), nvarchar(max), varbinary(max), text, ntext, and image type. (default: 2147483647)
     */
    textsize?: number | undefined;

    /**
     * A boolean, that verifies whether server's identity matches it's certificate's names (default: true)
     */
    trustServerCertificate?: boolean | undefined;
}

export interface ConnectionAuthenticationOptions {
    /**
     * Once you set domain, driver will connect to SQL Server using domain login.
     */
    domain?: string | undefined;

    /**
     * User name to use for authentication.
     */
    userName?: string | undefined;

    /**
     * Password to use for authentication.
     */
    password?: string | undefined;

    /**
     * Authentication token used when type is 'azure-active-directory-access-token'
     */
    token?: string | undefined;

    /**
     * Optional application (client) ID from your registered Azure application
     */
    clientId?: string | undefined;

    /**
     * Optional parameter for specific Azure tenant ID
     */
    tenantId?: string | undefined;
}

export interface ConnectionAuthentication {
    /**
     * Authentication Type. Default value is 'default'.
     */
    type?: string | undefined;

    /**
     * Authentication Options
     */
    options: ConnectionAuthenticationOptions;
}

export interface ConnectionConfig {
    /**
     * Hostname to connect to.
     */
    server?: string | undefined;

    /**
     * Once you set domain, driver will connect to SQL Server using domain login.
     */
    domain?: string | undefined;

    /**
     * Further options
     */
    options?: ConnectionOptions | undefined;

    /**
     * Authentication Options
     */
    authentication?: ConnectionAuthentication | undefined;
}

export interface ParameterOptions {
    //  for VarChar, NVarChar, VarBinary
    length?: number | "max" | undefined;
    // precision for Numeric, Decimal
    precision?: number | undefined;
    // scale for Numeric, Decimal, Time, DateTime2, DateTimeOffset
    scale?: number | undefined;
}

/**
 * Type of each column in the Request#row event
 */
export interface ColumnValue {
    metadata: ColumnMetaData;
    value: any;
}

export interface Request {
    /**
     * This event, describing result set columns, will be emitted before row events are emitted. This event may be emited multiple times when more than one recordset is produced by the statement.
     */
    on(event: "columnMetadata", listener: (columns: ColumnMetaData[]) => void): this;

    /**
     * The request has been prepared and can be used in subsequent calls to execute and unprepare.
     */
    on(event: "prepared", listener: () => void): this;

    /**
     * The request encountered an error and has not been prepared.
     */
    on(event: "error", listener: (err: Error) => void): this;

    /**
     * This is the final event emitted by a request. This is emitted after the callback passed in a request is called.
     */
    on(event: "requestCompleted", listener: () => void): this;

    /**
     * A row resulting from execution of the SQL statement with `config.options.useColumnNames` set to `false` (default).
     */
    on(event: "row", listener: (columns: ColumnValue[]) => void): this;

    /**
     * A row resulting from execution of the SQL statement with `config.options.useColumnNames` set to `true`.
     */
    on(event: "row", listener: (columns: Record<string, ColumnValue>) => void): this;

    /**
     * All rows from a result set have been provided (through row events). This token is used to indicate the completion of a SQL statement. As multiple SQL statements can be sent to the server in a single SQL batch, multiple done events can be generated. An done event is emited for each SQL statement in the SQL batch except variable declarations. For execution of SQL statements within stored procedures, doneProc and doneInProc events are used in place of done events.
     */
    on(event: "done", listener: (rowCount: number, more: boolean, rows: any[]) => void): this;

    /**
     * Indicates the completion status of a SQL statement within a stored procedure. All rows from a statement in a stored procedure have been provided (through row events).
     */
    on(event: "doneInProc", listener: (rowCount: number, more: boolean, rows: any[]) => void): this;

    /**
     * Indicates the completion status of a stored procedure. This is also generated for stored procedures executed through SQL statements.
     */
    on(event: "doneProc", listener: (rowCount: number, more: boolean, returnStatus: any, rows: any[]) => void): this;

    /**
     * A value for an output parameter (that was added to the request with addOutputParameter(...)). See also Using Parameters.
     */
    on(event: "returnValue", listener: (parameterName: string, value: any, metadata: ColumnMetaData) => void): this;
}

/**
 * A Request instance represents a request that can be executed on a connection
 * @event  'columnMetadata' This event, describing result set columns, will be emitted before row events are emitted. This event may be emited multiple times when more than one recordset is produced by the statement.
 * @event  'prepared' The request has been prepared and can be used in subsequent calls to execute and unprepare.
 * @event  'error' The request encountered an error and has not been prepared.
 * @event  'requestCompleted' This is the final event emitted by a request. This is emitted after the callback passed in a request is called.
 * @event  'row' A row resulting from execution of the SQL statement
 * @event  'done' All rows from a result set have been provided (through row events). This token is used to indicate the completion of a SQL statement. As multiple SQL statements can be sent to the server in a single SQL batch, multiple done events can be generated. An done event is emited for each SQL statement in the SQL batch except variable declarations. For execution of SQL statements within stored procedures, doneProc and doneInProc events are used in place of done events.
 * @event  'doneInProc' Indicates the completion status of a SQL statement within a stored procedure. All rows from a statement in a stored procedure have been provided (through row events).
 * @event  'doneProc' Indicates the completion status of a stored procedure. This is also generated for stored procedures executed through SQL statements.
 * @event  'returnValue' A value for an output parameter (that was added to the request with addOutputParameter(...)). See also Using Parameters.
 */
export class Request extends events.EventEmitter {
    /**
     * Constructor
     * @param sql The SQL statement to be executed (or a procedure name, if the request is to be used with connection.callProcedure).
     * @param callback    The callback is called when the request has completed, either successfully or with an error. If an error occurs during execution of the statement(s), then err will describe the error.
     *                     As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     *                     rowCount: The number of rows emitted as result of executing the SQL statement.
     *                     rows: Rows as a result of executing the SQL statement. Will only be avaiable if Connection's config.options.rowCollectionOnRequestCompletion is true.
     */
    constructor(sql: string, callback: (error: Error, rowCount: number, rows: any[]) => void);

    /**
     * Add an input parameter to the request.
     * @param name The parameter name. This should correspond to a parameter in the SQL, or a parameter that a called procedure expects. The name should not start with '@'.
     * @param type One of the supported data types.
     * @param value The value that the parameter is to be given. The Javascript type of the argument should match that documented for data types.
     * @param options Additional type options. Optional.
     */
    addParameter(name: string, type: TediousType, value: any, options?: ParameterOptions): void;

    /**
     * Add an output parameter to the request. The parameter's value will be provide by an emitted returnValue event.
     * @param name The parameter name. This should correspond to a parameter in the SQL, or a parameter that a called procedure expects.
     * @param type One of the supported data types.
     * @param value The value that the parameter is to be given. The Javascript type of the argument should match that documented for data types. Optional.
     * @param options Additional type options. Optional.
     */
    addOutputParameter(name: string, type: TediousType, value?: any, options?: ParameterOptions): void;

    /**
     * Temporarily suspends the flow of data from the database. No more 'row' events will be emitted until request.resume() is called.
     */
    pause(): void;

    /**
     * Resumes the flow of data from the database.
     */
    resume(): void;

    /**
     * Sets a timeout for this request. Default is 1500ms
     * @param timeout time in ms
     */
    setTimeout(timeout: number): void;
}

export interface BulkLoadColumnOpts extends ParameterOptions {
    //  Indicates whether the column accepts NULL values.
    nullable: boolean;
    //  If the name of the column is different from the name of the property found on rowObj arguments passed to , then you can use this option to specify the property name.
    objName?: string | undefined;
}

export interface BulkLoad {
    /**
     * Adds a column to the bulk load. The column definitions should match the table you are trying to insert into. Attempting to call addColumn after the first row has been added will throw an exception.
     * @param name    The name of the column.
     * @param type    One of the supported data types.
     * @param options    Additional column type information. At a minimum, nullable must be set to true or false.
     */
    addColumn(name: string, type: TediousType, options: BulkLoadColumnOpts): void;

    /**
     * Adds a row to the bulk insert. This method accepts arguments in three different formats:
     * @param rowObj An object of key/value pairs representing column name (or objName) and value.
     */
    addRow(row: Object): void;
    /**
     * Adds a row to the bulk insert. This method accepts arguments in three different formats:
     * @param columnArray    An array representing the values of each column in the same order which they were added to the bulkLoad object.
     */
    addRow(columnArray: any[]): void;
    /**
     * Adds a row to the bulk insert. This method accepts arguments in three different formats:
     * @param args If there are at least two columns, values can be passed as multiple arguments instead of an array. They must be in the same order the columns were added in.
     */
    addRow(...args: any[]): void;

    /**
     * This is simply a helper utility function which returns a CREATE TABLE SQL statement based on the columns added to the bulkLoad object. This may be particularly handy when you want to insert into a temporary table (a table which starts with #). A side note on bulk inserting into temporary tables: if you want to access a local temporary table after executing the bulk load, you'll need to use the same connection and execute your requests using connection.execSqlBatch instead of .execSql.
     */
    getTableCreationSql(): string;
}

/**
 * message interface used by the infoMessage and errorMessage events of Connection
 */
export interface InfoObject {
    /**
     * Error number
     */
    number: number;
    /**
     * The error state, used as a modifier to the error number.
     */
    state: any;
    /**
     * The class (severity) of the error. A class of less than 10 indicates an informational message.
     */
    class: number;
    /**
     * The message text.
     */
    message: string;
    /**
     * The stored procedure name (if a stored procedure generated the message).
     */
    procName: string;
    /**
     * The line number in the SQL batch or stored procedure that caused the error. Line numbers begin at 1; therefore, if the line number is not applicable to the message, the value of LineNumber will be 0.
     */
    lineNumber: number;
}

export interface Connection {
    /**
     * The attempt to connect and validate has completed.
     */
    on(event: "connect", listener: (err: Error) => void): this;

    /**
     * The connection has ended. This may be as a result of the client calling close(), the server closing the connection, or a network error.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Internal error occurs.
     */
    on(event: "error", listener: (err: Error) => void): this;

    /**
     * A debug message is available. It may be logged or ignored.
     */
    on(event: "debug", listener: (messageText: string) => void): this;

    /**
     * The server has issued an information message.
     */
    on(event: "infoMessage", listener: (info: InfoObject) => void): this;

    /**
     * The server has issued an error message.
     */
    on(event: "errorMessage", listener: (err: Error) => void): this;

    /**
     * The server has reported that the active database has changed. This may be as a result of a successful login, or a use statement.
     */
    on(event: "databaseChange", listener: (databaseName: string) => void): this;

    /**
     * The server has reported that the language has changed.
     */
    on(event: "languageChange", listener: (languageName: string) => void): this;

    /**
     * The server has reported that the charset has changed.
     */
    on(event: "charsetChange", listener: (charset: string) => void): this;
}

/**
 * Connection
 * @event  'connect' The attempt to connect and validate has completed.
 * @event  'end' The connection has ended. This may be as a result of the client calling close(), the server closing the connection, or a network error.
 * @event  'error' Internal error occurs.
 * @event  'debug' A debug message is available. It may be logged or ignored.
 * @event  'infoMessage' The server has issued an information message.
 * @event  'errorMessage' The server has issued an error message.
 * @event  'databaseChange' The server has reported that the active database has changed. This may be as a result of a sucessful login, or a use statement.
 * @event  'languageChange' The server has reported that the language has changed.
 * @event  'charsetChange' The server has reported that the charset has changed.
 * @event  'secure' A secure connection has been established.
 */
export class Connection extends events.EventEmitter {
    constructor(config: ConnectionConfig);

    /**
     * Establish a connection to the server.
     * @param callback The callback is called when the connection was established or an error occured. If an error occured then err will describe the error.
     */
    connect(callback?: (err?: Error) => void): void;

    /**
     * Start a transaction. As only one request at a time may be executed on
     * a connection, another request should not be initiated until this callback is called.
     * @param callback The callback is called when the request to start the transaction has completed, either successfully or with an error. If an error occured then err will describe the error.
     * @param name A string representing a name to associate with the transaction. Optional, and defaults to an empty string. Required when isolationLevel is present.
     * @param isolationLevel The isolation level that the transaction is to be run with.
     */
    beginTransaction(callback: (error?: Error) => void, name?: string, isolationLevel?: ISOLATION_LEVEL): void;

    /**
     * Commit a transaction.
     * There should be an active transaction. That is, beginTransaction should have been previously called.
     * @param callback The callback is called when the request to commit the transaction has completed, either successfully or with an error. If an error occured then err will describe the error.
     *                     As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     */
    commitTransaction(callback: (error: Error) => void): void;

    /**
     * Rollback a transaction. There should be an active transaction. That is, beginTransaction should have been previously called.
     * @param callback The callback is called when the request to rollback the transaction has completed, either successfully or with an error. If an error occured then err will describe the error.
     *                         As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     */
    rollbackTransaction(callback: (error: Error) => void): void;

    /**
     * Set a savepoint within a transaction. There should be an active transaction. That is, beginTransaction should have been previously called.
     * @param callback The callback is called when the request to set a savepoint within the transaction has completed, either successfully or with an error. If an error occured then err will describe the error.
     *                     As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     */
    saveTransaction(callback: (error: Error) => void): void;

    /**
     * Run the given callback after starting a transaction, and commit or rollback the transaction afterwards.
     * This is a helper that employs beginTransaction, commitTransaction, rollbackTransaction and saveTransaction to greatly simplify the use of database transactions and automatically handle transaction nesting.
     * @param callback The callback is called when the request to start a transaction (or create a savepoint, in the case of a nested transaction) has completed, either successfully or with an error.
     *                  If an error occured, then err will describe the error. If no error occured, the callback should perform its work and eventually call done with an error or null
     *                  (to trigger a transaction rollback or a transaction commit) and an additional completion callback that will be called when the request to rollback or commit the current transaction
     *                  has completed, either successfully or with an error. Additional arguments given to done will be passed through to this callback.
     *                     As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     * @param name A string representing a name to associate with the transaction. Optional, and defaults to an empty string. In case of a nested transaction, naming the transaction name has no effect.
     * @param isolationLevel The isolation level that the transaction is to be run with.
     */
    transaction(
        callback: (
            error: Error,
            done: (error?: Error, doneCallback?: (error?: Error, ...args: any[]) => void, ...args: any[]) => void,
        ) => void,
        name?: string,
        isolationLevel?: ISOLATION_LEVEL,
    ): void;

    /**
     * Prepare the SQL represented by the request. The request can then be used in subsequent calls to execute and unprepare
     * @param request A Request object representing the request. Parameters only require a name and type. Parameter values are ignored.
     */
    prepare(request: Request): void;

    /**
     * Release the SQL Server resources associated with a previously prepared request.
     */
    unprepare(request: Request): void;

    /**
     * Call a stored procedure represented by request.
     */
    callProcedure(request: Request): void;

    /**
     * Execute the SQL represented by request.
     * As sp_executesql is used to execute the SQL, if the same SQL is executed multiples times using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates for the first execution.
     * Beware of the way that scoping rules apply, and how they may affect local temp tables. If you're running in to scoping issues, then execSqlBatch may be a better choice. See also issue #24.
     */
    execSql(request: Request): void;

    /**
     * Execute the SQL batch represented by request. There is no param support, and unlike execSql, it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
     * In almost all cases, execSql will be a better choice.
     */
    execSqlBatch(request: Request): void;

    /**
     * Execute previously prepared SQL, using the supplied parameters.
     * @param request A previously prepared Request.
     * @param parameters An object whose names correspond to the names of parameters that were added to the request before it was prepared. The object's values are passed as the parameters' values when the request is executed.
     */
    execute(request: Request, parameters: {}): void;

    /**
     * Creates a new BulkLoad instance.
     * @param tableName The name of the table to bulk-insert into.
     * @param callback A function which will be called after the BulkLoad finishes executing. rowCount will equal the number of rows inserted.
     */
    newBulkLoad(tableName: string, callback: (error: Error, rowCount: number) => void): BulkLoad;

    /**
     * Executes a BulkLoad.
     */
    execBulkLoad(bulkLoad: BulkLoad): void;

    /**
     * Reset the connection to its initial state. Can be useful for connection pool implementations.
     * @param callback The callback is called when the connection reset has completed, either successfully or with an error. If an error occured then err will describe the error.
     *                     As only one request at a time may be executed on a connection, another request should not be initiated until this callback is called.
     */
    reset(callback: (error: Error) => void): void;

    /**
     * Cancel currently executed request.
     */
    cancel(): void;

    /**
     * Closes the connection to the database. The end will be emmited once the connection has been closed.
     */
    close(): void;
}

/**
 * Error emitted by Connection class 'error' event
 */
export declare class ConnectionError extends Error {
    constructor(message?: string, code?: string);

    public message: string;
    public code: string;
}

/**
 * Error emitted by Request class
 */
export declare class RequestError extends Error {
    constructor(message?: string, code?: string);

    public message: string;
    public code: string;
}
