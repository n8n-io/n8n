/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

/////////////////////////////////////////
// Requires pg-promise v11.0.0 or later.
/////////////////////////////////////////

// We use ES6 as static promise here, because generic promises are still not supported.
// Follow the links below:
// https://stackoverflow.com/questions/36593087/using-a-custom-promise-as-a-generic-type
// https://github.com/Microsoft/TypeScript/issues/1213

type XPromise<T> = Promise<T>;

import * as pg from './pg-subset';
import * as pgMinify from 'pg-minify';
import * as spexLib from 'spex';

// internal namespace for "txMode" property:
declare namespace _txMode {
    // Transaction Isolation Level;
    // API: https://vitaly-t.github.io/pg-promise/txMode.html#.isolationLevel
    enum isolationLevel {
        none = 0,
        serializable = 1,
        repeatableRead = 2,
        readCommitted = 3
    }

    // TransactionMode class;
    // API: https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html
    class TransactionMode {
        constructor(options?: { tiLevel?: isolationLevel, readOnly?: boolean, deferrable?: boolean })

        begin(cap?: boolean): string
    }
}

// Main protocol of the library;
// API: https://vitaly-t.github.io/pg-promise/module-pg-promise.html
declare namespace pgPromise {

    interface IQueryFileOptions {
        debug?: boolean
        minify?: boolean | 'after'
        compress?: boolean
        params?: any
        noWarnings?: boolean
    }

    interface IFormattingOptions {
        capSQL?: boolean
        partial?: boolean
        def?: any
    }

    interface ILostContext<C extends pg.IClient = pg.IClient> {
        cn: string
        dc: any
        start: Date
        client: C
    }

    interface IConnectionOptions<C extends pg.IClient = pg.IClient> {
        direct?: boolean

        onLost?(err: any, e: ILostContext<C>): void
    }

    interface IPreparedStatement {
        name?: string
        text?: string | QueryFile
        values?: any[]
        binary?: boolean
        rowMode?: 'array' | null | void
        rows?: number
        types?: pg.ITypes
    }

    interface IParameterizedQuery {
        text?: string | QueryFile
        values?: any[]
        binary?: boolean
        rowMode?: void | 'array'
        types?: pg.ITypes;
    }

    interface IPreparedParsed {
        name: string
        text: string
        values: any[]
        binary: boolean
        rowMode: void | 'array'
        rows: number
    }

    interface IParameterizedParsed {
        text: string
        values: any[]
        binary: boolean
        rowMode: void | 'array'
    }

    interface IColumnDescriptor<T> {
        source: T
        name: string
        value: any
        exists: boolean
    }

    interface IColumnConfig<T> {
        name: string
        prop?: string
        mod?: FormattingFilter
        cast?: string
        cnd?: boolean
        def?: any

        init?(col: IColumnDescriptor<T>): any

        skip?(col: IColumnDescriptor<T>): boolean
    }

    interface IColumnSetOptions {
        table?: string | ITable | TableName
        inherit?: boolean
    }

    interface ITable {
        schema?: string
        table: string
    }

    interface IPromiseConfig {
        create(resolve: (value?: any) => void, reject?: (reason?: any) => void): XPromise<any>

        resolve(value?: any): void

        reject(reason?: any): void

        all(iterable: any): XPromise<any>
    }

    type FormattingFilter = '^' | '~' | '#' | ':raw' | ':alias' | ':name' | ':json' | ':csv' | ':list' | ':value';

    type QueryColumns<T> = Column<T> | ColumnSet<T> | Array<string | IColumnConfig<T> | Column<T>>;

    type QueryParam =
        string
        | QueryFile
        | IPreparedStatement
        | IParameterizedQuery
        | PreparedStatement
        | ParameterizedQuery
        | ((values?: any) => QueryParam);

    type ValidSchema = string | string[] | null | void;

    // helpers.TableName class;
    // API: https://vitaly-t.github.io/pg-promise/helpers.TableName.html
    class TableName {
        constructor(table: string | ITable)

        // these are all read-only:
        readonly name: string;
        readonly table: string;
        readonly schema: string;

        toString(): string
    }

    // helpers.Column class;
    // API: https://vitaly-t.github.io/pg-promise/helpers.Column.html
    class Column<T = unknown> {
        constructor(col: string | IColumnConfig<T>);

        // these are all read-only:
        readonly name: string;
        readonly prop: string;
        readonly mod: FormattingFilter;
        readonly cast: string;
        readonly cnd: boolean;
        readonly def: any;
        readonly castText: string;
        readonly escapedName: string;
        readonly variable: string;
        readonly init: (col: IColumnDescriptor<T>) => any
        readonly skip: (col: IColumnDescriptor<T>) => boolean

        toString(level?: number): string
    }

    // helpers.Column class;
    // API: https://vitaly-t.github.io/pg-promise/helpers.ColumnSet.html
    class ColumnSet<T = unknown> {
        constructor(columns: Column<T>, options?: IColumnSetOptions)
        constructor(columns: Array<string | IColumnConfig<T> | Column<T>>, options?: IColumnSetOptions)
        constructor(columns: object, options?: IColumnSetOptions)

        readonly columns: Column<T>[];
        readonly names: string;
        readonly table: TableName;
        readonly variables: string;

        assign(source?: { source?: object, prefix?: string }): string

        assignColumns(options?: {
            from?: string,
            to?: string,
            skip?: string | string[] | ((c: Column<T>) => boolean)
        }): string

        extend<S>(columns: Column<T> | ColumnSet<T> | Array<string | IColumnConfig<T> | Column<T>>): ColumnSet<S>

        merge<S>(columns: Column<T> | ColumnSet<T> | Array<string | IColumnConfig<T> | Column<T>>): ColumnSet<S>

        prepare(obj: object): object

        toString(level?: number): string
    }

    const minify: typeof pgMinify;

    // Query Result Mask;
    // API: https://vitaly-t.github.io/pg-promise/global.html#queryResult
    enum queryResult {
        one = 1,
        many = 2,
        none = 4,
        any = 6
    }

    // PreparedStatement class;
    // API: https://vitaly-t.github.io/pg-promise/PreparedStatement.html
    class PreparedStatement {

        constructor(options?: IPreparedStatement)

        // standard properties:
        name: string;
        text: string | QueryFile;
        values: any[];

        // advanced properties:
        binary: boolean;
        rowMode: void | 'array';
        rows: number;
        types: pg.ITypes;

        parse(): IPreparedParsed | errors.PreparedStatementError

        toString(level?: number): string
    }

    // ParameterizedQuery class;
    // API: https://vitaly-t.github.io/pg-promise/ParameterizedQuery.html
    class ParameterizedQuery {

        constructor(options?: string | QueryFile | IParameterizedQuery)

        // standard properties:
        text: string | QueryFile;
        values: any[];

        // advanced properties:
        binary: boolean;
        rowMode: void | 'array';
        types: pg.ITypes;

        parse(): IParameterizedParsed | errors.ParameterizedQueryError

        toString(level?: number): string
    }

    // QueryFile class;
    // API: https://vitaly-t.github.io/pg-promise/QueryFile.html
    class QueryFile {
        constructor(file: string, options?: IQueryFileOptions)

        readonly error: Error;
        readonly file: string;
        readonly options: any;

        prepare(): void

        toString(level?: number): string
    }

    // PromiseAdapter class;
    // API: https://vitaly-t.github.io/pg-promise/PromiseAdapter.html
    class PromiseAdapter {
        constructor(api: IPromiseConfig)
    }

    const txMode: typeof _txMode;
    const utils: IUtils;
    const as: IFormatting;

    // Database full protocol;
    // API: https://vitaly-t.github.io/pg-promise/Database.html
    //
    // We export this interface only to be able to help IntelliSense cast extension types correctly,
    // which doesn't always work, depending on the version of IntelliSense being used.
    interface IDatabase<Ext, C extends pg.IClient = pg.IClient> extends IBaseProtocol<Ext> {
        connect(options?: IConnectionOptions<C>): XPromise<IConnected<Ext, C>>

        /////////////////////////////////////////////////////////////////////////////
        // Hidden, read-only properties, for integrating with third-party libraries:

        readonly $config: ILibConfig<Ext, C>
        readonly $cn: string | pg.IConnectionParameters<C>
        readonly $dc: any
        readonly $pool: pg.IPool
    }

    interface IResultExt<T = unknown> extends pg.IResult<T> {
        // Property 'duration' exists only in the following context:
        //  - for single-query events 'receive'
        //  - for method Database.result
        duration?: number
    }

    // Post-initialization interface;
    // API: https://vitaly-t.github.io/pg-promise/module-pg-promise.html
    interface IMain<Ext = {}, C extends pg.IClient = pg.IClient> {
        <T = Ext, C extends pg.IClient = pg.IClient>(cn: string | pg.IConnectionParameters<C>, dc?: any): IDatabase<T, C> & T

        readonly PromiseAdapter: typeof PromiseAdapter
        readonly PreparedStatement: typeof PreparedStatement
        readonly ParameterizedQuery: typeof ParameterizedQuery
        readonly QueryFile: typeof QueryFile
        readonly queryResult: typeof queryResult
        readonly minify: typeof pgMinify
        readonly spex: spexLib.ISpex
        readonly errors: typeof errors
        readonly utils: IUtils
        readonly txMode: typeof txMode
        readonly helpers: IHelpers
        readonly as: IFormatting
        readonly pg: typeof pg

        end(): void
    }

    // Additional methods available inside tasks + transactions;
    // API: https://vitaly-t.github.io/pg-promise/Task.html
    interface ITask<Ext> extends IBaseProtocol<Ext>, spexLib.ISpexBase {
        readonly ctx: ITaskContext
    }

    interface ITaskIfOptions<Ext = {}> {
        cnd?: boolean | ((t: ITask<Ext> & Ext) => boolean)
        tag?: any
    }

    interface ITxIfOptions<Ext = {}> extends ITaskIfOptions<Ext> {
        mode?: _txMode.TransactionMode | null
        reusable?: boolean | ((t: ITask<Ext> & Ext) => boolean)
    }

    // Base database protocol
    // API: https://vitaly-t.github.io/pg-promise/Database.html
    interface IBaseProtocol<Ext> {

        // API: https://vitaly-t.github.io/pg-promise/Database.html#query
        query<T = any>(query: QueryParam, values?: any, qrm?: queryResult): XPromise<T>

        // result-specific methods;

        // API: https://vitaly-t.github.io/pg-promise/Database.html#none
        none(query: QueryParam, values?: any): XPromise<null>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#one
        one<T = any>(query: QueryParam, values?: any, cb?: (value: any) => T, thisArg?: any): XPromise<T>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#oneOrNone
        oneOrNone<T = any>(query: QueryParam, values?: any, cb?: (value: any) => T, thisArg?: any): XPromise<T | null>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#many
        many<T = any>(query: QueryParam, values?: any): XPromise<T[]>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#manyOrNone
        manyOrNone<T = any>(query: QueryParam, values?: any): XPromise<T[]>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#any
        any<T = any>(query: QueryParam, values?: any): XPromise<T[]>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#result
        result<T, R = IResultExt<T>>(query: QueryParam, values?: any, cb?: (value: IResultExt<T>) => R, thisArg?: any): XPromise<R>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#multiResult
        multiResult(query: QueryParam, values?: any): XPromise<pg.IResult[]>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#multi
        multi<T = any>(query: QueryParam, values?: any): XPromise<Array<T[]>>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#stream
        stream(qs: NodeJS.ReadableStream, init: (stream: NodeJS.ReadableStream) => void): XPromise<{
            processed: number,
            duration: number
        }>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#func
        func<T = any>(funcName: string, values?: any, qrm?: queryResult): XPromise<T>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#proc
        proc<T = any>(procName: string, values?: any, cb?: (value: any) => T, thisArg?: any): XPromise<T | null>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#map
        map<T = any>(query: QueryParam, values: any, cb: (row: any, index: number, data: any[]) => T, thisArg?: any): XPromise<T[]>

        // API: https://vitaly-t.github.io/pg-promise/Database.html#each
        each<T = any>(query: QueryParam, values: any, cb: (row: any, index: number, data: any[]) => void, thisArg?: any): XPromise<T[]>

        // Tasks;
        // API: https://vitaly-t.github.io/pg-promise/Database.html#task
        task<T>(cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        task<T>(tag: string | number, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        task<T>(options: { tag?: any }, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        // Conditional Tasks;
        // API: https://vitaly-t.github.io/pg-promise/Database.html#taskIf
        taskIf<T>(cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        taskIf<T>(tag: string | number, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        taskIf<T>(options: ITaskIfOptions<Ext>, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        // Transactions;
        // API: https://vitaly-t.github.io/pg-promise/Database.html#tx
        tx<T>(cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        tx<T>(tag: string | number, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        tx<T>(options: {
            tag?: any,
            mode?: _txMode.TransactionMode | null
        }, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        // Conditional Transactions;
        // API: https://vitaly-t.github.io/pg-promise/Database.html#txIf
        txIf<T>(cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        txIf<T>(tag: string | number, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>

        txIf<T>(options: ITxIfOptions<Ext>, cb: (t: ITask<Ext> & Ext) => T | XPromise<T>): XPromise<T>
    }

    // Database object in connected state;
    // API: https://vitaly-t.github.io/pg-promise/Database.html#connect
    interface IConnected<Ext, C extends pg.IClient> extends IBaseProtocol<Ext>, spexLib.ISpexBase {
        readonly client: C

        // Note that for normal connections (working with the pool), method `done` accepts `kill`
        // flag to terminate the connection within the pool, so it can be auto-recreated;
        // And in this case the method returns nothing / void.

        // But for direct connections (connect({direct: true})), `kill` flag is ignored, because
        // the connection is always closed physically, which may take time, and so in this case
        // the method returns a Promise, to indicate when the connection finished closing.
        done(kill?: boolean): void | XPromise<void>;

        // Repeated calls are not allowed, and will throw an error.
    }

    // Event context extension for tasks + transactions;
    // See: https://vitaly-t.github.io/pg-promise/global.html#TaskContext
    interface ITaskContext {

        // these are set in the beginning of each task/transaction:
        readonly context: any
        readonly parent: ITaskContext | null
        readonly connected: boolean
        readonly inTransaction: boolean
        readonly level: number
        readonly useCount: number
        readonly isTX: boolean
        readonly start: Date
        readonly tag: any
        readonly dc: any

        // these are set at the end of each task/transaction:
        readonly finish?: Date
        readonly duration?: number
        readonly success?: boolean
        readonly result?: any

        // this exists only inside transactions (isTX = true):
        readonly txLevel?: number

        // Version of PostgreSQL Server to which we are connected;
        // This property is not available with Native Bindings!
        readonly serverVersion: string
    }

    // Generic Event Context interface;
    // See: https://vitaly-t.github.io/pg-promise/global.html#EventContext
    interface IEventContext<C extends pg.IClient = pg.IClient> {
        client: C
        cn: any
        dc: any
        query: any
        params: any
        ctx: ITaskContext
    }

    // Errors namespace
    // API: https://vitaly-t.github.io/pg-promise/errors.html
    namespace errors {
        // QueryResultError interface;
        // API: https://vitaly-t.github.io/pg-promise/errors.QueryResultError.html
        class QueryResultError extends Error {

            // standard error properties:
            name: string;
            message: string;
            stack: string;

            // extended properties:
            result: pg.IResult;
            received: number;
            code: queryResultErrorCode;
            query: string;
            values: any;

            // API: https://vitaly-t.github.io/pg-promise/errors.QueryResultError.html#toString
            toString(): string
        }

        // QueryFileError interface;
        // API: https://vitaly-t.github.io/pg-promise/errors.QueryFileError.html
        class QueryFileError extends Error {

            // standard error properties:
            name: string;
            message: string;
            stack: string;

            // extended properties:
            file: string;
            options: IQueryFileOptions;
            error: pgMinify.SQLParsingError;

            toString(level?: number): string
        }

        // PreparedStatementError interface;
        // API: https://vitaly-t.github.io/pg-promise/errors.PreparedStatementError.html
        class PreparedStatementError extends Error {

            // standard error properties:
            name: string;
            message: string;
            stack: string;

            // extended properties:
            error: QueryFileError;

            toString(level?: number): string
        }

        // ParameterizedQueryError interface;
        // API: https://vitaly-t.github.io/pg-promise/errors.ParameterizedQueryError.html
        class ParameterizedQueryError extends Error {

            // standard error properties:
            name: string;
            message: string;
            stack: string;

            // extended properties:
            error: QueryFileError;

            toString(level?: number): string
        }

        // Query Result Error Code;
        // API: https://vitaly-t.github.io/pg-promise/errors.html#.queryResultErrorCode
        enum queryResultErrorCode {
            noData = 0,
            notEmpty = 1,
            multiple = 2
        }
    }

    // Library's Initialization Options
    // API: https://vitaly-t.github.io/pg-promise/module-pg-promise.html
    interface IInitOptions<Ext = {}, C extends pg.IClient = pg.IClient> {
        noWarnings?: boolean
        pgFormatting?: boolean
        pgNative?: boolean
        promiseLib?: any
        capSQL?: boolean
        schema?: ValidSchema | ((dc: any) => ValidSchema)

        connect?(e: { client: C, dc: any, useCount: number }): void

        disconnect?(e: { client: C, dc: any }): void

        query?(e: IEventContext<C>): void

        // NOTE: result is undefined when data comes from QueryStream, i.e. via method Database.stream
        receive?(e: { data: any[], result: IResultExt | void, ctx: IEventContext<C> }): void

        task?(e: IEventContext<C>): void

        transact?(e: IEventContext<C>): void

        error?(err: any, e: IEventContext<C>): void

        extend?(obj: IDatabase<Ext, C> & Ext, dc: any): void
    }

    // API: https://vitaly-t.github.io/pg-promise/Database.html#$config
    interface ILibConfig<Ext, C extends pg.IClient = pg.IClient> {
        version: string
        promiseLib: any
        promise: IGenericPromise
        options: IInitOptions<Ext, C>
        pgp: IMain<Ext, C>
        $npm: any
    }

    // Custom-Type Formatting object
    // API: https://github.com/vitaly-t/pg-promise#custom-type-formatting
    interface ICTFObject {
        toPostgres(a: any): any
    }

    // Query formatting namespace;
    // API: https://vitaly-t.github.io/pg-promise/formatting.html
    interface IFormatting {

        ctf: { toPostgres: symbol, rawType: symbol }

        alias(name: string | (() => string)): string

        array(arr: any[] | (() => any[]), options?: { capSQL?: boolean }): string

        bool(value: any | (() => any)): string

        buffer(obj: object | (() => object), raw?: boolean): string

        csv(values: any | (() => any)): string

        date(d: Date | (() => Date), raw?: boolean): string

        format(query: string | QueryFile | ICTFObject, values?: any, options?: IFormattingOptions): string

        func(func: (cc: any) => any, raw?: boolean, cc?: any): string

        json(data: any | (() => any), raw?: boolean): string

        name(name: any | (() => any)): string

        number(value: number | bigint | (() => number | bigint)): string

        text(value: any | (() => any), raw?: boolean): string

        value(value: any | (() => any)): string
    }

    interface ITaskArguments<T> extends IArguments {
        options: { tag?: any, cnd?: any, mode?: _txMode.TransactionMode | null } & T

        cb(): any
    }

    // General-purpose functions
    // API: https://vitaly-t.github.io/pg-promise/utils.html
    interface IUtils {
        camelize(text: string): string

        camelizeVar(text: string): string

        enumSql(dir: string, options?: {
            recursive?: boolean,
            ignoreErrors?: boolean
        }, cb?: (file: string, name: string, path: string) => any): any

        taskArgs<T = {}>(args: IArguments): ITaskArguments<T>
    }

    // Query Formatting Helpers
    // API: https://vitaly-t.github.io/pg-promise/helpers.html
    interface IHelpers {

        concat(queries: Array<string | QueryFile | {
            query: string | QueryFile,
            values?: any,
            options?: IFormattingOptions
        }>): string

        insert(data: object | object[], columns?: QueryColumns<any> | null, table?: string | ITable | TableName): string

        update(data: object | object[], columns?: QueryColumns<any> | null, table?: string | ITable | TableName, options?: {
            tableAlias?: string,
            valueAlias?: string,
            emptyUpdate?: any
        }): any

        values(data: object | object[], columns?: QueryColumns<any> | null): string

        sets(data: object, columns?: QueryColumns<any> | null): string

        Column: typeof Column
        ColumnSet: typeof ColumnSet
        TableName: typeof TableName

        _TN(path: TemplateStringsArray, ...args: Array<any>): ITable

        _TN(path: string): ITable
    }

    interface IGenericPromise {
        (cb: (resolve: (value?: any) => void, reject: (reason?: any) => void) => void): XPromise<any>

        resolve(value?: any): void

        reject(reason?: any): void

        all(iterable: any): XPromise<any>
    }
}

// Default library interface (before initialization)
// API: https://vitaly-t.github.io/pg-promise/module-pg-promise.html
declare function pgPromise<Ext = {}, C extends pg.IClient = pg.IClient>(options?: pgPromise.IInitOptions<Ext, C>): pgPromise.IMain<Ext, C>

export = pgPromise;
