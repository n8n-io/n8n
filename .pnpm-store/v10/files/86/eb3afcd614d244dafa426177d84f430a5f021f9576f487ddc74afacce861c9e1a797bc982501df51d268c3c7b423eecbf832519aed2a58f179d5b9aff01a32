/// <reference types="node" />

import events = require("events");
import stream = require("stream");
import pgTypes = require("pg-types");
import { NoticeMessage } from "pg-protocol/dist/messages";

import { ConnectionOptions } from "tls";

export type QueryConfigValues<T> = T extends Array<infer U> ? T : never;

export interface ClientConfig {
    user?: string | undefined;
    database?: string | undefined;
    password?: string | (() => string | Promise<string>) | undefined;
    port?: number | undefined;
    host?: string | undefined;
    connectionString?: string | undefined;
    keepAlive?: boolean | undefined;
    stream?: () => stream.Duplex | stream.Duplex | undefined;
    statement_timeout?: false | number | undefined;
    ssl?: boolean | ConnectionOptions | undefined;
    query_timeout?: number | undefined;
    keepAliveInitialDelayMillis?: number | undefined;
    idle_in_transaction_session_timeout?: number | undefined;
    application_name?: string | undefined;
    connectionTimeoutMillis?: number | undefined;
    types?: CustomTypesConfig | undefined;
    options?: string | undefined;
}

export type ConnectionConfig = ClientConfig;

export interface Defaults extends ClientConfig {
    poolSize?: number | undefined;
    poolIdleTimeout?: number | undefined;
    reapIntervalMillis?: number | undefined;
    binary?: boolean | undefined;
    parseInt8?: boolean | undefined;
    parseInputDatesAsUTC?: boolean | undefined;
}

export interface PoolConfig extends ClientConfig {
    // properties from module 'node-pool'
    max?: number | undefined;
    min?: number | undefined;
    idleTimeoutMillis?: number | undefined;
    log?: ((...messages: any[]) => void) | undefined;
    Promise?: PromiseConstructorLike | undefined;
    allowExitOnIdle?: boolean | undefined;
    maxUses?: number | undefined;
}

export interface QueryConfig<I = any[]> {
    name?: string | undefined;
    text: string;
    values?: QueryConfigValues<I>;
    types?: CustomTypesConfig | undefined;
}

export interface CustomTypesConfig {
    getTypeParser: typeof pgTypes.getTypeParser;
}

export interface Submittable {
    submit: (connection: Connection) => void;
}

export interface QueryArrayConfig<I = any[]> extends QueryConfig<I> {
    rowMode: "array";
}

export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
}

export interface QueryResultBase {
    command: string;
    rowCount: number | null;
    oid: number;
    fields: FieldDef[];
}

export interface QueryResultRow {
    [column: string]: any;
}

export interface QueryResult<R extends QueryResultRow = any> extends QueryResultBase {
    rows: R[];
}

export interface QueryArrayResult<R extends any[] = any[]> extends QueryResultBase {
    rows: R[];
}

export interface Notification {
    processId: number;
    channel: string;
    payload?: string | undefined;
}

export interface ResultBuilder<R extends QueryResultRow = any> extends QueryResult<R> {
    addRow(row: R): void;
}

export interface QueryParse {
    name: string;
    text: string;
    types: string[];
}

type ValueMapper = (param: any, index: number) => any;

export interface BindConfig {
    portal?: string | undefined;
    statement?: string | undefined;
    binary?: string | undefined;
    values?: Array<Buffer | null | undefined | string> | undefined;
    valueMapper?: ValueMapper | undefined;
}

export interface ExecuteConfig {
    portal?: string | undefined;
    rows?: string | undefined;
}

export interface MessageConfig {
    type: string;
    name?: string | undefined;
}

export function escapeIdentifier(str: string): string;

export function escapeLiteral(str: string): string;

export class Connection extends events.EventEmitter {
    readonly stream: stream.Duplex;

    constructor(config?: ConnectionConfig);

    bind(config: BindConfig | null, more: boolean): void;
    execute(config: ExecuteConfig | null, more: boolean): void;
    parse(query: QueryParse, more: boolean): void;

    query(text: string): void;

    describe(msg: MessageConfig, more: boolean): void;
    close(msg: MessageConfig, more: boolean): void;

    flush(): void;
    sync(): void;
    end(): void;
}

/**
 * {@link https://node-postgres.com/apis/pool}
 */
export class Pool extends events.EventEmitter {
    /**
     * Every field of the config object is entirely optional.
     * The config passed to the pool is also passed to every client
     * instance within the pool when the pool creates that client.
     */
    constructor(config?: PoolConfig);

    readonly totalCount: number;
    readonly idleCount: number;
    readonly waitingCount: number;

    connect(): Promise<PoolClient>;
    connect(
        callback: (err: Error | undefined, client: PoolClient | undefined, done: (release?: any) => void) => void,
    ): void;

    end(): Promise<void>;
    end(callback: () => void): void;

    query<T extends Submittable>(queryStream: T): T;
    // tslint:disable:no-unnecessary-generics
    query<R extends any[] = any[], I = any[]>(
        queryConfig: QueryArrayConfig<I>,
        values?: QueryConfigValues<I>,
    ): Promise<QueryArrayResult<R>>;
    query<R extends QueryResultRow = any, I = any[]>(
        queryConfig: QueryConfig<I>,
    ): Promise<QueryResult<R>>;
    query<R extends QueryResultRow = any, I = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        values?: QueryConfigValues<I>,
    ): Promise<QueryResult<R>>;
    query<R extends any[] = any[], I = any[]>(
        queryConfig: QueryArrayConfig<I>,
        callback: (err: Error, result: QueryArrayResult<R>) => void,
    ): void;
    query<R extends QueryResultRow = any, I = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        callback: (err: Error, result: QueryResult<R>) => void,
    ): void;
    query<R extends QueryResultRow = any, I = any[]>(
        queryText: string,
        values: QueryConfigValues<I>,
        callback: (err: Error, result: QueryResult<R>) => void,
    ): void;
    // tslint:enable:no-unnecessary-generics

    on(event: "release" | "error", listener: (err: Error, client: PoolClient) => void): this;
    on(event: "connect" | "acquire" | "remove", listener: (client: PoolClient) => void): this;
}

export class ClientBase extends events.EventEmitter {
    constructor(config?: string | ClientConfig);

    connect(): Promise<void>;
    connect(callback: (err: Error) => void): void;

    query<T extends Submittable>(queryStream: T): T;
    // tslint:disable:no-unnecessary-generics
    query<R extends any[] = any[], I = any[]>(
        queryConfig: QueryArrayConfig<I>,
        values?: QueryConfigValues<I>,
    ): Promise<QueryArrayResult<R>>;
    query<R extends QueryResultRow = any, I = any>(
        queryConfig: QueryConfig<I>,
    ): Promise<QueryResult<R>>;
    query<R extends QueryResultRow = any, I = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        values?: QueryConfigValues<I>,
    ): Promise<QueryResult<R>>;
    query<R extends any[] = any[], I = any[]>(
        queryConfig: QueryArrayConfig<I>,
        callback: (err: Error, result: QueryArrayResult<R>) => void,
    ): void;
    query<R extends QueryResultRow = any, I = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        callback: (err: Error, result: QueryResult<R>) => void,
    ): void;
    query<R extends QueryResultRow = any, I = any[]>(
        queryText: string,
        values: QueryConfigValues<I>,
        callback: (err: Error, result: QueryResult<R>) => void,
    ): void;
    // tslint:enable:no-unnecessary-generics

    copyFrom(queryText: string): stream.Writable;
    copyTo(queryText: string): stream.Readable;

    pauseDrain(): void;
    resumeDrain(): void;

    escapeIdentifier: typeof escapeIdentifier;
    escapeLiteral: typeof escapeLiteral;
    setTypeParser: typeof pgTypes.setTypeParser;
    getTypeParser: typeof pgTypes.getTypeParser;

    on(event: "drain", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "notice", listener: (notice: NoticeMessage) => void): this;
    on(event: "notification", listener: (message: Notification) => void): this;
    // tslint:disable-next-line unified-signatures
    on(event: "end", listener: () => void): this;
}

export class Client extends ClientBase {
    user?: string | undefined;
    database?: string | undefined;
    port: number;
    host: string;
    password?: string | undefined;
    ssl: boolean;

    constructor(config?: string | ClientConfig);

    end(): Promise<void>;
    end(callback: (err: Error) => void): void;
}

export interface PoolClient extends ClientBase {
    release(err?: Error | boolean): void;
}

export class Query<R extends QueryResultRow = any, I extends any[] = any> extends events.EventEmitter
    implements Submittable
{
    constructor(queryTextOrConfig?: string | QueryConfig<I>, values?: QueryConfigValues<I>);
    submit: (connection: Connection) => void;
    on(event: "row", listener: (row: R, result?: ResultBuilder<R>) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "end", listener: (result: ResultBuilder<R>) => void): this;
}

export class Events extends events.EventEmitter {
    on(event: "error", listener: (err: Error, client: Client) => void): this;
}

export const types: typeof pgTypes;

export const defaults: Defaults & ClientConfig;

import * as Pg from ".";

export const native: typeof Pg | null;

export { DatabaseError } from "pg-protocol";
