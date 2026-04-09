import { EventEmitter } from 'events';
import { type Parameter, type DataType } from './data-type';
import Connection from './connection';
import { type Metadata } from './metadata-parser';
import { SQLServerStatementColumnEncryptionSetting } from './always-encrypted/types';
import { type ColumnMetadata } from './token/colmetadata-token-parser';
import { Collation } from './collation';
/**
 * The callback is called when the request has completed, either successfully or with an error.
 * If an error occurs during execution of the statement(s), then `err` will describe the error.
 *
 * As only one request at a time may be executed on a connection, another request should not
 * be initiated until this callback is called.
 *
 * This callback is called before `requestCompleted` is emitted.
 */
type CompletionCallback = 
/**
 * @param error
 *   If an error occurred, an error object.
 *
 * @param rowCount
 *   The number of rows emitted as result of executing the SQL statement.
 *
 * @param rows
 *   Rows as a result of executing the SQL statement.
 *   Will only be available if [[ConnectionOptions.rowCollectionOnRequestCompletion]] is `true`.
 */
(error: Error | null | undefined, rowCount?: number, rows?: any) => void;
export interface ParameterOptions {
    output?: boolean;
    length?: number;
    precision?: number;
    scale?: number;
}
interface RequestOptions {
    statementColumnEncryptionSetting?: SQLServerStatementColumnEncryptionSetting;
}
/**
 * ```js
 * const { Request } = require('tedious');
 * const request = new Request("select 42, 'hello world'", (err, rowCount) {
 *   // Request completion callback...
 * });
 * connection.execSql(request);
 * ```
 */
declare class Request extends EventEmitter {
    /**
     * @private
     */
    sqlTextOrProcedure: string | undefined;
    /**
     * @private
     */
    parameters: Parameter[];
    /**
     * @private
     */
    parametersByName: {
        [key: string]: Parameter;
    };
    /**
     * @private
     */
    preparing: boolean;
    /**
     * @private
     */
    canceled: boolean;
    /**
     * @private
     */
    paused: boolean;
    /**
     * @private
     */
    userCallback: CompletionCallback;
    /**
     * @private
     */
    handle: number | undefined;
    /**
     * @private
     */
    error: Error | undefined;
    /**
     * @private
     */
    connection: Connection | undefined;
    /**
     * @private
     */
    timeout: number | undefined;
    /**
     * @private
     */
    rows?: Array<any>;
    /**
     * @private
     */
    rst?: Array<any>;
    /**
     * @private
     */
    rowCount?: number;
    /**
     * @private
     */
    callback: CompletionCallback;
    shouldHonorAE?: boolean;
    statementColumnEncryptionSetting: SQLServerStatementColumnEncryptionSetting;
    cryptoMetadataLoaded: boolean;
    /**
     * This event, describing result set columns, will be emitted before row
     * events are emitted. This event may be emitted multiple times when more
     * than one recordset is produced by the statement.
     *
     * An array like object, where the columns can be accessed either by index
     * or name. Columns with a name that is an integer are not accessible by name,
     * as it would be interpreted as an array index.
     */
    on(event: 'columnMetadata', listener: (columns: ColumnMetadata[] | {
        [key: string]: ColumnMetadata;
    }) => void): this;
    /**
     * The request has been prepared and can be used in subsequent calls to execute and unprepare.
     */
    on(event: 'prepared', listener: () => void): this;
    /**
     * The request encountered an error and has not been prepared.
     */
    on(event: 'error', listener: (err: Error) => void): this;
    /**
     * A row resulting from execution of the SQL statement.
     */
    on(event: 'row', listener: 
    /**
     * An array or object (depends on [[ConnectionOptions.useColumnNames]]), where the columns can be accessed by index/name.
     * Each column has two properties, `metadata` and `value`：
     *
     * * `metadata`
     *
     *    The same data that is exposed in the `columnMetadata` event.
     *
     * * `value`
     *
     *    The column's value. It will be `null` for a `NULL`.
     *    If there are multiple columns with the same name, then this will be an array of the values.
     */
    (columns: any) => void): this;
    /**
     * All rows from a result set have been provided (through `row` events).
     *
     * This token is used to indicate the completion of a SQL statement.
     * As multiple SQL statements can be sent to the server in a single SQL batch, multiple `done` can be generated.
     * An `done` event is emitted for each SQL statement in the SQL batch except variable declarations.
     * For execution of SQL statements within stored procedures, `doneProc` and `doneInProc` events are used in place of `done`.
     *
     * If you are using [[Connection.execSql]] then SQL server may treat the multiple calls with the same query as a stored procedure.
     * When this occurs, the `doneProc` and `doneInProc` events may be emitted instead. You must handle both events to ensure complete coverage.
     */
    on(event: 'done', listener: 
    /**
     * @param rowCount
     *   The number of result rows. May be `undefined` if not available.
     *
     * @param more
     *   If there are more results to come (probably because multiple statements are being executed), then `true`.
     *
     * @param rst
     *   Rows as a result of executing the SQL statement.
     *   Will only be available if Connection's [[ConnectionOptions.rowCollectionOnDone]] is `true`.
     */
    (rowCount: number | undefined, more: boolean, rst?: any[]) => void): this;
    /**
     * `request.on('doneInProc', function (rowCount, more, rows) { });`
     *
     * Indicates the completion status of a SQL statement within a stored procedure. All rows from a statement
     * in a stored procedure have been provided (through `row` events).
     *
     * This event may also occur when executing multiple calls with the same query using [[execSql]].
     */
    on(event: 'doneInProc', listener: 
    /**
     * @param rowCount
     *   The number of result rows. May be `undefined` if not available.
     *
     * @param more
     *   If there are more results to come (probably because multiple statements are being executed), then `true`.
     *
     * @param rst
     *   Rows as a result of executing the SQL statement.
     *   Will only be available if Connection's [[ConnectionOptions.rowCollectionOnDone]] is `true`.
     */
    (rowCount: number | undefined, more: boolean, rst?: any[]) => void): this;
    /**
     * Indicates the completion status of a stored procedure. This is also generated for stored procedures
     * executed through SQL statements.\
     * This event may also occur when executing multiple calls with the same query using [[execSql]].
     */
    on(event: 'doneProc', listener: 
    /**
     * @param rowCount
     *   The number of result rows. May be `undefined` if not available.
     *
     * @param more
     *   If there are more results to come (probably because multiple statements are being executed), then `true`.
     *
     * @param rst
     *   Rows as a result of executing the SQL statement.
     *   Will only be available if Connection's [[ConnectionOptions.rowCollectionOnDone]] is `true`.
     */
    (rowCount: number | undefined, more: boolean, procReturnStatusValue: number, rst?: any[]) => void): this;
    /**
     * A value for an output parameter (that was added to the request with [[addOutputParameter]]).
     * See also `Using Parameters`.
     */
    on(event: 'returnValue', listener: 
    /**
     * @param parameterName
     *   The parameter name. (Does not start with '@'.)
     *
     * @param value
     *   The parameter's output value.
     *
     * @param metadata
     *   The same data that is exposed in the `columnMetaData` event.
     */
    (parameterName: string, value: unknown, metadata: Metadata) => void): this;
    /**
     * This event gives the columns by which data is ordered, if `ORDER BY` clause is executed in SQL Server.
     */
    on(event: 'order', listener: 
    /**
     * @param orderColumns
     *   An array of column numbers in the result set by which data is ordered.
     */
    (orderColumns: number[]) => void): this;
    on(event: 'requestCompleted', listener: () => void): this;
    on(event: 'cancel', listener: () => void): this;
    on(event: 'pause', listener: () => void): this;
    on(event: 'resume', listener: () => void): this;
    /**
     * @private
     */
    emit(event: 'columnMetadata', columns: ColumnMetadata[] | {
        [key: string]: ColumnMetadata;
    }): boolean;
    /**
     * @private
     */
    emit(event: 'prepared'): boolean;
    /**
     * @private
     */
    emit(event: 'error', err: Error): boolean;
    /**
     * @private
     */
    emit(event: 'row', columns: any): boolean;
    /**
     * @private
     */
    emit(event: 'done', rowCount: number | undefined, more: boolean, rst?: any[]): boolean;
    /**
     * @private
     */
    emit(event: 'doneInProc', rowCount: number | undefined, more: boolean, rst?: any[]): boolean;
    /**
     * @private
     */
    emit(event: 'doneProc', rowCount: number | undefined, more: boolean, procReturnStatusValue: number, rst?: any[]): boolean;
    /**
     * @private
     */
    emit(event: 'returnValue', parameterName: string, value: unknown, metadata: Metadata): boolean;
    /**
     * @private
     */
    emit(event: 'requestCompleted'): boolean;
    /**
     * @private
     */
    emit(event: 'cancel'): boolean;
    /**
     * @private
     */
    emit(event: 'pause'): boolean;
    /**
     * @private
     */
    emit(event: 'resume'): boolean;
    /**
     * @private
     */
    emit(event: 'order', orderColumns: number[]): boolean;
    /**
     * @param sqlTextOrProcedure
     *   The SQL statement to be executed
     *
     * @param callback
     *   The callback to execute once the request has been fully completed.
     */
    constructor(sqlTextOrProcedure: string | undefined, callback: CompletionCallback, options?: RequestOptions);
    /**
     * @param name
     *   The parameter name. This should correspond to a parameter in the SQL,
     *   or a parameter that a called procedure expects. The name should not start with `@`.
     *
     * @param type
     *   One of the supported data types.
     *
     * @param value
     *   The value that the parameter is to be given. The Javascript type of the
     *   argument should match that documented for data types.
     *
     * @param options
     *   Additional type options. Optional.
     */
    addParameter(name: string, type: DataType, value?: unknown, options?: Readonly<ParameterOptions> | null): void;
    /**
     * @param name
     *   The parameter name. This should correspond to a parameter in the SQL,
     *   or a parameter that a called procedure expects.
     *
     * @param type
     *   One of the supported data types.
     *
     * @param value
     *   The value that the parameter is to be given. The Javascript type of the
     *   argument should match that documented for data types
     *
     * @param options
     *   Additional type options. Optional.
     */
    addOutputParameter(name: string, type: DataType, value?: unknown, options?: Readonly<ParameterOptions> | null): void;
    /**
     * @private
     */
    makeParamsParameter(parameters: Parameter[]): string;
    /**
     * @private
     */
    validateParameters(collation: Collation | undefined): void;
    /**
     * Temporarily suspends the flow of data from the database. No more `row` events will be emitted until [[resume] is called.
     * If this request is already in a paused state, calling [[pause]] has no effect.
     */
    pause(): void;
    /**
     * Resumes the flow of data from the database.
     * If this request is not in a paused state, calling [[resume]] has no effect.
     */
    resume(): void;
    /**
     * Cancels a request while waiting for a server response.
     */
    cancel(): void;
    /**
     * Sets a timeout for this request.
     *
     * @param timeout
     *   The number of milliseconds before the request is considered failed,
     *   or `0` for no timeout. When no timeout is set for the request,
     *   the [[ConnectionOptions.requestTimeout]] of the [[Connection]] is used.
     */
    setTimeout(timeout?: number): void;
}
export default Request;
