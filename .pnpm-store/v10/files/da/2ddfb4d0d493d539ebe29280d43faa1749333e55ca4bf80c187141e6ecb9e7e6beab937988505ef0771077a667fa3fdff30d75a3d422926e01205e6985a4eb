import { EventEmitter } from 'events';
import Connection, { type InternalConnectionOptions } from './connection';
import { Transform } from 'stream';
import { type DataType, type Parameter } from './data-type';
import { Collation } from './collation';
/**
 * @private
 */
interface InternalOptions {
    checkConstraints: boolean;
    fireTriggers: boolean;
    keepNulls: boolean;
    lockTable: boolean;
    order: {
        [columnName: string]: 'ASC' | 'DESC';
    };
}
export interface Options {
    /**
     * Honors constraints during bulk load, using T-SQL
     * [CHECK_CONSTRAINTS](https://technet.microsoft.com/en-us/library/ms186247(v=sql.105).aspx).
     * (default: `false`)
     */
    checkConstraints?: InternalOptions['checkConstraints'] | undefined;
    /**
     * Honors insert triggers during bulk load, using the T-SQL [FIRE_TRIGGERS](https://technet.microsoft.com/en-us/library/ms187640(v=sql.105).aspx). (default: `false`)
     */
    fireTriggers?: InternalOptions['fireTriggers'] | undefined;
    /**
     * Honors null value passed, ignores the default values set on table, using T-SQL [KEEP_NULLS](https://msdn.microsoft.com/en-us/library/ms187887(v=sql.120).aspx). (default: `false`)
     */
    keepNulls?: InternalOptions['keepNulls'] | undefined;
    /**
     * Places a bulk update(BU) lock on table while performing bulk load, using T-SQL [TABLOCK](https://technet.microsoft.com/en-us/library/ms180876(v=sql.105).aspx). (default: `false`)
     */
    lockTable?: InternalOptions['lockTable'] | undefined;
    /**
     * Specifies the ordering of the data to possibly increase bulk insert performance, using T-SQL [ORDER](https://docs.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms177468(v=sql.105)). (default: `{}`)
     */
    order?: InternalOptions['order'] | undefined;
}
export type Callback = 
/**
 * A function which will be called after the [[BulkLoad]] finishes executing.
 *
 * @param rowCount the number of rows inserted
 */
(err: Error | undefined | null, rowCount?: number) => void;
interface Column extends Parameter {
    objName: string;
    collation: Collation | undefined;
}
interface ColumnOptions {
    output?: boolean;
    /**
     * For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
     */
    length?: number;
    /**
     * For Numeric, Decimal.
     */
    precision?: number;
    /**
     * For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
     */
    scale?: number;
    /**
     * If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]], then you can use this option to specify the property name.
     */
    objName?: string;
    /**
     * Indicates whether the column accepts NULL values.
     */
    nullable?: boolean;
}
declare class RowTransform extends Transform {
    /**
     * @private
     */
    columnMetadataWritten: boolean;
    /**
     * @private
     */
    bulkLoad: BulkLoad;
    /**
     * @private
     */
    mainOptions: BulkLoad['options'];
    /**
     * @private
     */
    columns: BulkLoad['columns'];
    /**
     * @private
     */
    constructor(bulkLoad: BulkLoad);
    /**
     * @private
     */
    _transform(row: Array<unknown> | {
        [colName: string]: unknown;
    }, _encoding: string, callback: (error?: Error) => void): void;
    /**
     * @private
     */
    _flush(callback: () => void): void;
}
/**
 * A BulkLoad instance is used to perform a bulk insert.
 *
 * Use [[Connection.newBulkLoad]] to create a new instance, and [[Connection.execBulkLoad]] to execute it.
 *
 * Example of BulkLoad Usages:
 *
 * ```js
 * // optional BulkLoad options
 * const options = { keepNulls: true };
 *
 * // instantiate - provide the table where you'll be inserting to, options and a callback
 * const bulkLoad = connection.newBulkLoad('MyTable', options, (error, rowCount) => {
 *   console.log('inserted %d rows', rowCount);
 * });
 *
 * // setup your columns - always indicate whether the column is nullable
 * bulkLoad.addColumn('myInt', TYPES.Int, { nullable: false });
 * bulkLoad.addColumn('myString', TYPES.NVarChar, { length: 50, nullable: true });
 *
 * // execute
 * connection.execBulkLoad(bulkLoad, [
 *   { myInt: 7, myString: 'hello' },
 *   { myInt: 23, myString: 'world' }
 * ]);
 * ```
 */
declare class BulkLoad extends EventEmitter {
    /**
     * @private
     */
    error: Error | undefined;
    /**
     * @private
     */
    canceled: boolean;
    /**
     * @private
     */
    executionStarted: boolean;
    /**
     * @private
     */
    streamingMode: boolean;
    /**
     * @private
     */
    table: string;
    /**
     * @private
     */
    timeout: number | undefined;
    /**
     * @private
     */
    options: InternalConnectionOptions;
    /**
     * @private
     */
    callback: Callback;
    /**
     * @private
     */
    columns: Array<Column>;
    /**
     * @private
     */
    columnsByName: {
        [name: string]: Column;
    };
    /**
     * @private
     */
    firstRowWritten: boolean;
    /**
     * @private
     */
    rowToPacketTransform: RowTransform;
    /**
     * @private
     */
    bulkOptions: InternalOptions;
    /**
     * @private
     */
    connection: Connection | undefined;
    /**
     * @private
     */
    rows: Array<any> | undefined;
    /**
     * @private
     */
    rst: Array<any> | undefined;
    /**
     * @private
     */
    rowCount: number | undefined;
    collation: Collation | undefined;
    /**
     * @private
     */
    constructor(table: string, collation: Collation | undefined, connectionOptions: InternalConnectionOptions, { checkConstraints, fireTriggers, keepNulls, lockTable, order, }: Options, callback: Callback);
    /**
     * Adds a column to the bulk load.
     *
     * The column definitions should match the table you are trying to insert into.
     * Attempting to call addColumn after the first row has been added will throw an exception.
     *
     * ```js
     * bulkLoad.addColumn('MyIntColumn', TYPES.Int, { nullable: false });
     * ```
     *
     * @param name The name of the column.
     * @param type One of the supported `data types`.
     * @param __namedParameters Additional column type information. At a minimum, `nullable` must be set to true or false.
     * @param length For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
     * @param nullable Indicates whether the column accepts NULL values.
     * @param objName If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]] or [[Connection.execBulkLoad]], then you can use this option to specify the property name.
     * @param precision For Numeric, Decimal.
     * @param scale For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
    */
    addColumn(name: string, type: DataType, { output, length, precision, scale, objName, nullable }: ColumnOptions): void;
    /**
     * @private
     */
    getOptionsSql(): string;
    /**
     * @private
     */
    getBulkInsertSql(): string;
    /**
     * This is simply a helper utility function which returns a `CREATE TABLE SQL` statement based on the columns added to the bulkLoad object.
     * This may be particularly handy when you want to insert into a temporary table (a table which starts with `#`).
     *
     * ```js
     * var sql = bulkLoad.getTableCreationSql();
     * ```
     *
     * A side note on bulk inserting into temporary tables: if you want to access a local temporary table after executing the bulk load,
     * you'll need to use the same connection and execute your requests using [[Connection.execSqlBatch]] instead of [[Connection.execSql]]
     */
    getTableCreationSql(): string;
    /**
     * @private
     */
    getColMetaData(): Buffer<ArrayBufferLike>;
    /**
     * Sets a timeout for this bulk load.
     *
     * ```js
     * bulkLoad.setTimeout(timeout);
     * ```
     *
     * @param timeout The number of milliseconds before the bulk load is considered failed, or 0 for no timeout.
     *   When no timeout is set for the bulk load, the [[ConnectionOptions.requestTimeout]] of the Connection is used.
     */
    setTimeout(timeout?: number): void;
    /**
     * @private
     */
    createDoneToken(): Buffer<ArrayBufferLike>;
    /**
     * @private
     */
    cancel(): void;
}
export default BulkLoad;
