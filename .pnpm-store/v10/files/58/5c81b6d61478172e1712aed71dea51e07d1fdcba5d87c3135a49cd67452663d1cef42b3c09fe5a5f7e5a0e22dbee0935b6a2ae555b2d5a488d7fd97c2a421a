// @credit COLSA Corporation <http://www.colsa.com/>

/// <reference types="node" />

import events = require("events");
import { Readable, ReadableOptions } from "stream";
import tds = require("tedious");
import { Pool } from "tarn";
import { CallbackOrPromise, PoolOptions } from "tarn/dist/Pool";
export interface ISqlType {
    type: ISqlTypeFactory;
}
export interface ISqlTypeWithNoParams extends ISqlType {
    type: ISqlTypeFactoryWithNoParams;
}
export interface ISqlTypeWithLength extends ISqlType {
    type: ISqlTypeFactoryWithLength;
    length: number;
}
export interface ISqlTypeWithScale extends ISqlType {
    type: ISqlTypeFactoryWithScale;
    scale: number;
}
export interface ISqlTypeWithPrecisionScale extends ISqlType {
    type: ISqlTypeFactoryWithPrecisionScale;
    precision: number;
    scale: number;
}
export interface ISqlTypeWithTvpType extends ISqlType {
    type: ISqlTypeFactoryWithTvpType;
    tvpType: any;
}

export interface ISqlTypeFactory {
}
export interface ISqlTypeFactoryWithNoParams extends ISqlTypeFactory {
    (): ISqlTypeWithNoParams;
}
export interface ISqlTypeFactoryWithLength extends ISqlTypeFactory {
    (length?: number): ISqlTypeWithLength;
}
export interface ISqlTypeFactoryWithScale extends ISqlTypeFactory {
    (scale?: number): ISqlTypeWithScale;
}
export interface ISqlTypeFactoryWithPrecisionScale extends ISqlTypeFactory {
    (precision?: number, scale?: number): ISqlTypeWithPrecisionScale;
}
export interface ISqlTypeFactoryWithTvpType extends ISqlTypeFactory {
    (tvpType?: any): ISqlTypeWithTvpType;
}

export declare var VarChar: ISqlTypeFactoryWithLength;
export declare var NVarChar: ISqlTypeFactoryWithLength;
export declare var Text: ISqlTypeFactoryWithNoParams;
export declare var Int: ISqlTypeFactoryWithNoParams;
export declare var BigInt: ISqlTypeFactoryWithNoParams;
export declare var TinyInt: ISqlTypeFactoryWithNoParams;
export declare var SmallInt: ISqlTypeFactoryWithNoParams;
export declare var Bit: ISqlTypeFactoryWithNoParams;
export declare var Float: ISqlTypeFactoryWithNoParams;
export declare var Numeric: ISqlTypeFactoryWithPrecisionScale;
export declare var Decimal: ISqlTypeFactoryWithPrecisionScale;
export declare var Real: ISqlTypeFactoryWithNoParams;
export declare var Date: ISqlTypeFactoryWithNoParams;
export declare var DateTime: ISqlTypeFactoryWithNoParams;
export declare var DateTime2: ISqlTypeFactoryWithScale;
export declare var DateTimeOffset: ISqlTypeFactoryWithScale;
export declare var SmallDateTime: ISqlTypeFactoryWithNoParams;
export declare var Time: ISqlTypeFactoryWithScale;
export declare var UniqueIdentifier: ISqlTypeFactoryWithNoParams;
export declare var SmallMoney: ISqlTypeFactoryWithNoParams;
export declare var Money: ISqlTypeFactoryWithNoParams;
export declare var Binary: ISqlTypeFactoryWithNoParams;
export declare var VarBinary: ISqlTypeFactoryWithLength;
export declare var Image: ISqlTypeFactoryWithNoParams;
export declare var Xml: ISqlTypeFactoryWithNoParams;
export declare var Char: ISqlTypeFactoryWithLength;
export declare var NChar: ISqlTypeFactoryWithLength;
export declare var NText: ISqlTypeFactoryWithNoParams;
export declare var TVP: ISqlTypeFactoryWithTvpType;
export declare var UDT: ISqlTypeFactoryWithNoParams;
export declare var Geography: ISqlTypeFactoryWithNoParams;
export declare var Geometry: ISqlTypeFactoryWithNoParams;
export declare var Variant: ISqlTypeFactoryWithNoParams;

export type Connection = tds.Connection;

export declare var TYPES: {
    VarChar: ISqlTypeFactoryWithLength;
    NVarChar: ISqlTypeFactoryWithLength;
    Text: ISqlTypeFactoryWithNoParams;
    Int: ISqlTypeFactoryWithNoParams;
    BigInt: ISqlTypeFactoryWithNoParams;
    TinyInt: ISqlTypeFactoryWithNoParams;
    SmallInt: ISqlTypeFactoryWithNoParams;
    Bit: ISqlTypeFactoryWithNoParams;
    Float: ISqlTypeFactoryWithNoParams;
    Numeric: ISqlTypeFactoryWithPrecisionScale;
    Decimal: ISqlTypeFactoryWithPrecisionScale;
    Real: ISqlTypeFactoryWithNoParams;
    Date: ISqlTypeFactoryWithNoParams;
    DateTime: ISqlTypeFactoryWithNoParams;
    DateTime2: ISqlTypeFactoryWithScale;
    DateTimeOffset: ISqlTypeFactoryWithScale;
    SmallDateTime: ISqlTypeFactoryWithNoParams;
    Time: ISqlTypeFactoryWithScale;
    UniqueIdentifier: ISqlTypeFactoryWithNoParams;
    SmallMoney: ISqlTypeFactoryWithNoParams;
    Money: ISqlTypeFactoryWithNoParams;
    Binary: ISqlTypeFactoryWithNoParams;
    VarBinary: ISqlTypeFactoryWithLength;
    Image: ISqlTypeFactoryWithNoParams;
    Xml: ISqlTypeFactoryWithNoParams;
    Char: ISqlTypeFactoryWithLength;
    NChar: ISqlTypeFactoryWithLength;
    NText: ISqlTypeFactoryWithNoParams;
    TVP: ISqlTypeFactoryWithTvpType;
    UDT: ISqlTypeFactoryWithNoParams;
    Geography: ISqlTypeFactoryWithNoParams;
    Geometry: ISqlTypeFactoryWithNoParams;
    Variant: ISqlTypeFactoryWithNoParams;
};

export declare var MAX: number;
export declare var fix: boolean;
export declare var Promise: any;

interface IMap extends Array<{ js: any; sql: any }> {
    register(jstype: any, sql: any): void;
}

export declare var map: IMap;

export declare var DRIVERS: string[];
export interface IColumnMetadata {
    [name: string]: {
        index: number;
        name: string;
        length: number;
        type: (() => ISqlType) | ISqlType;
        udt?: any;
        scale?: number | undefined;
        precision?: number | undefined;
        nullable: boolean;
        caseSensitive: boolean;
        identity: boolean;
        readOnly: boolean;
    };
}
export interface IResult<T> {
    recordsets: T extends any[] ? { [P in keyof T]: IRecordSet<T[P]> } : Array<IRecordSet<T>>;
    recordset: IRecordSet<T extends any[] ? T[0] : T>;
    rowsAffected: number[];
    output: { [key: string]: any };
}

export interface IBulkResult {
    rowsAffected: number;
}

export interface IProcedureResult<T> extends IResult<T> {
    returnValue: any;
}
export interface IRecordSet<T> extends Array<T> {
    columns: IColumnMetadata;
    toTable(name?: string): Table;
}

type IIsolationLevel = number;

export declare var ISOLATION_LEVEL: {
    READ_UNCOMMITTED: IIsolationLevel;
    READ_COMMITTED: IIsolationLevel;
    REPEATABLE_READ: IIsolationLevel;
    SERIALIZABLE: IIsolationLevel;
    SNAPSHOT: IIsolationLevel;
};

export interface IOptions extends Omit<tds.ConnectionOptions, "useColumnNames"> {
    beforeConnect?: void | undefined;
    connectionString?: string | undefined;
    trustedConnection?: boolean | undefined;
}

export declare var pool: ConnectionPool;

export interface PoolOpts<T> extends Omit<PoolOptions<T>, "create" | "destroy" | "min" | "max"> {
    create?: CallbackOrPromise<T> | undefined;
    destroy?: ((resource: T) => any) | undefined;
    min?: number | undefined;
    max?: number | undefined;
}

export interface config {
    driver?: string | undefined;
    user?: string | undefined;
    password?: string | undefined;
    server: string;
    port?: number | undefined;
    domain?: string | undefined;
    database?: string | undefined;
    connectionTimeout?: number | undefined;
    requestTimeout?: number | undefined;
    stream?: boolean | undefined;
    parseJSON?: boolean | undefined;
    options?: IOptions | undefined;
    pool?: PoolOpts<Connection> | undefined;
    arrayRowMode?: boolean | undefined;
    authentication?: tds.ConnectionAuthentication | undefined;
    /**
     * Invoked before opening the connection. The parameter conn is the configured
     * tedious Connection. It can be used for attaching event handlers.
     */
    beforeConnect?: ((conn: Connection) => void) | undefined;
}

export declare class MSSQLError extends Error {
    constructor(message: Error | string, code?: string);
    public code: string;
    public name: string;
    public originalError?: Error | undefined;
}

export declare class ConnectionPool extends events.EventEmitter {
    public readonly connected: boolean;
    public readonly connecting: boolean;
    public readonly healthy: boolean;
    public readonly driver: string;
    public readonly size: number;
    public readonly available: number;
    public readonly pending: number;
    public readonly borrowed: number;
    public readonly pool: Pool<Connection>;
    public static parseConnectionString(
        connectionString: string,
    ): config & { options: IOptions; pool: Partial<PoolOpts<Connection>> };
    public constructor(config: config, callback?: (err?: any) => void);
    public constructor(connectionString: string, callback?: (err?: any) => void);
    public query(command: string): Promise<IResult<any>>;
    public query(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<any>>;
    public query<Entity>(command: string): Promise<IResult<Entity>>;
    public query<Entity>(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<Entity>>;
    public query<Entity>(command: string, callback: (err?: Error, recordset?: IResult<Entity>) => void): void;
    public batch(batch: string): Promise<IResult<any>>;
    public batch(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<any>>;
    public batch(batch: string, callback: (err?: Error, recordset?: IResult<any>) => void): void;
    public batch<Entity>(batch: string): Promise<IResult<Entity>>;
    public batch<Entity>(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<Entity>>;
    public connect(): Promise<ConnectionPool>;
    public connect(callback: (err: any) => void): void;
    public close(): Promise<void>;
    public close(callback: (err: any) => void): void;
    public request(): Request;
    public transaction(): Transaction;
}

export declare class ConnectionError extends MSSQLError {}

export interface IColumnOptions {
    nullable?: boolean | undefined;
    primary?: boolean | undefined;
    identity?: boolean | undefined;
    readOnly?: boolean | undefined;
    length?: number | undefined;
}

export interface IColumn extends ISqlType {
    name: string;
    nullable: boolean;
    primary: boolean;
}

declare class columns extends Array<IColumn> {
    public add(name: string, type: (() => ISqlType) | ISqlType, options?: IColumnOptions): number;
}

type IRow = Array<string | number | boolean | Date | Buffer | undefined | null>;

declare class rows extends Array<IRow> {
    public add(...row: IRow): number;
}

export declare class Table {
    public create: boolean;
    public columns: columns;
    public rows: rows;
    public constructor(tableName?: string);
    public schema?: string | undefined;
    public database?: string | undefined;
    public name?: string | undefined;
    public path?: string | undefined;
    public temporary?: boolean | undefined;
}

interface IRequestParameters {
    [name: string]: {
        name: string;
        type: (() => ISqlType) | ISqlType;
        io: number;
        value: any;
        length: number;
        scale: number;
        precision: number;
        tvpType: any;
    };
}

/**
 * Options object to be passed through to driver (currently tedious only)
 */
export interface IBulkOptions {
    /** Honors constraints during bulk load, using T-SQL CHECK_CONSTRAINTS. (default: false) */
    checkConstraints?: boolean | undefined;
    /** Honors insert triggers during bulk load, using the T-SQL FIRE_TRIGGERS. (default: false) */
    fireTriggers?: boolean | undefined;
    /** Honors null value passed, ignores the default values set on table, using T-SQL KEEP_NULLS. (default: false) */
    keepNulls?: boolean | undefined;
    /** Places a bulk update(BU) lock on table while performing bulk load, using T-SQL TABLOCK. (default: false) */
    tableLock?: boolean | undefined;
}

export declare class Request extends events.EventEmitter {
    public transaction: Transaction;
    public pstatement: PreparedStatement;
    public parameters: IRequestParameters;
    public verbose: boolean;
    public canceled: boolean;
    public multiple: boolean;
    public stream: boolean;
    public arrayRowMode: boolean;
    public constructor(connection?: ConnectionPool);
    public constructor(transaction: Transaction);
    public constructor(preparedStatement: PreparedStatement);
    public execute(procedure: string): Promise<IProcedureResult<any>>;
    public execute<Entity>(procedure: string): Promise<IProcedureResult<Entity>>;
    public execute<Entity>(
        procedure: string,
        callback: (err?: any, recordsets?: IProcedureResult<Entity>, returnValue?: any) => void,
    ): void;
    public input(name: string, value: any): Request;
    public input(name: string, type: (() => ISqlType) | ISqlType, value: any): Request;
    public replaceInput(name: string, value: any): Request;
    public replaceInput(name: string, type: (() => ISqlType) | ISqlType, value: any): Request;
    public output(name: string, type: (() => ISqlType) | ISqlType, value?: any): Request;
    public pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
    public query(command: string): Promise<IResult<any>>;
    public query(command: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<any>>;
    public query<Entity>(command: string): Promise<IResult<Entity>>;
    public query<Entity>(command: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<Entity>>;
    public query<Entity>(command: string, callback: (err?: Error, recordset?: IResult<Entity>) => void): void;
    public batch(batch: string): Promise<IResult<any>>;
    public batch(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<any>>;
    public batch(batch: string, callback: (err?: Error, recordset?: IResult<any>) => void): void;
    public batch<Entity>(batch: string): Promise<IResult<Entity>>;
    public batch<Entity>(strings: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<Entity>>;
    public batch<Entity>(batch: string, callback: (err?: any, recordset?: IResult<Entity>) => void): void;
    public bulk(table: Table): Promise<IBulkResult>;
    public bulk(table: Table, options: IBulkOptions): Promise<IBulkResult>;
    public bulk(table: Table, callback: (err: Error, result: IBulkResult) => void): void;
    public bulk(table: Table, options: IBulkOptions, callback: (err: Error, result: IBulkResult) => void): void;
    public cancel(): void;
    public pause(): boolean;
    public resume(): boolean;
    public toReadableStream(streamOptions?: ReadableOptions): Readable;
}

export declare class RequestError extends MSSQLError {
    public number?: number | undefined;
    public lineNumber?: number | undefined;
    public state?: string | undefined;
    public class?: string | undefined;
    public serverName?: string | undefined;
    public procName?: string | undefined;
}

export declare class Transaction extends events.EventEmitter {
    public isolationLevel: IIsolationLevel;
    public constructor(connection?: ConnectionPool);
    /**
     * Begin a transaction.
     * @param [isolationLevel] - Controls the locking and row versioning behavior of TSQL statements issued by a connection.
     * @param [callback] A callback which is called after transaction has began, or an error has occurred. If omited, method returns Promise.
     */
    public begin(isolationLevel?: IIsolationLevel): Promise<Transaction>;
    public begin(
        isolationLevel?: IIsolationLevel,
        callback?: (err?: ConnectionError | TransactionError) => void,
    ): Transaction;
    public commit(): Promise<void>;
    public commit(callback: (err?: any) => void): void;
    public rollback(): Promise<void>;
    public rollback(callback: (err?: any) => void): void;
    public request(): Request;
}

export declare class TransactionError extends MSSQLError {}

export declare class PreparedStatement extends events.EventEmitter {
    public transaction: Transaction;
    public prepared: boolean;
    public statement: string;
    public parameters: IRequestParameters;
    public stream: any;
    public constructor(connection?: ConnectionPool);
    public constructor(transaction: Transaction);
    public input(name: string, type: (() => ISqlType) | ISqlType): PreparedStatement;
    public output(name: string, type: (() => ISqlType) | ISqlType): PreparedStatement;
    public prepare(statement?: string): Promise<void>;
    public prepare(statement?: string, callback?: (err?: Error) => void): PreparedStatement;
    public execute(values: Object): Promise<IProcedureResult<any>>;
    public execute<Entity>(values: Object): Promise<IProcedureResult<Entity>>;
    public execute(values: Object, callback: (err?: Error, result?: IProcedureResult<any>) => void): Request;
    public execute<Entity>(values: Object, callback: (err?: Error, result?: IProcedureResult<Entity>) => void): Request;
    public unprepare(): Promise<void>;
    public unprepare(callback: (err?: Error) => void): PreparedStatement;
}

export declare class PreparedStatementError extends MSSQLError {}

/**
 * Open global connection pool.
 * @param config Connection configuration object or connection string
 */
export declare function connect(config: config | string): Promise<ConnectionPool>;

/**
 * Open global connection pool.
 * @param config Connection configuration object or connection string.
 * @param callback A callback which is called after connection has established, or an error has occurred
 */
export declare function connect(config: config | string, callback?: (err?: Error) => void): void;

export declare function query(command: string): Promise<IResult<any>>;
export declare function query(command: TemplateStringsArray, ...interpolations: any[]): Promise<IResult<any>>;
export declare function query<Entity>(command: string): Promise<IResult<Entity>>;
export declare function query<Entity>(
    command: TemplateStringsArray,
    ...interpolations: any[]
): Promise<IResult<Entity>>;
export declare function query<Entity>(
    command: string,
    callback: (err?: Error, recordset?: IResult<Entity>) => void,
): void;
