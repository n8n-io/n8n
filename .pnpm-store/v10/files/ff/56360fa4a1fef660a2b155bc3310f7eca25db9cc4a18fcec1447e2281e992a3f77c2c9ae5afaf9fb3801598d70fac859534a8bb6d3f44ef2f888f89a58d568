import * as pg from "./index.js";

declare const PG: {
    defaults: typeof pg.defaults;
    Client: typeof pg.Client;
    ClientBase: typeof pg.ClientBase;
    Events: typeof pg.Events;
    Query: typeof pg.Query;
    Pool: typeof pg.Pool;
    Connection: typeof pg.Connection;
    types: typeof pg.types;
    DatabaseError: typeof pg.DatabaseError;
    TypeOverrides: typeof pg.TypeOverrides;
    escapeIdentifier: typeof pg.escapeIdentifier;
    escapeLiteral: typeof pg.escapeLiteral;
    Result: typeof pg.Result;
    native: typeof pg.native;
};

declare namespace PG {
    type QueryConfigValues<T> = pg.QueryConfigValues<T>;
    type ClientConfig = pg.ClientConfig;
    type ConnectionConfig = pg.ConnectionConfig;
    type Defaults = pg.Defaults;
    type PoolConfig = pg.PoolConfig;
    type QueryConfig<I = any[]> = pg.QueryConfig<I>;
    type CustomTypesConfig = pg.CustomTypesConfig;
    type Submittable = pg.Submittable;
    type QueryArrayConfig<I = any[]> = pg.QueryArrayConfig<I>;
    type FieldDef = pg.FieldDef;
    type QueryResultBase = pg.QueryResultBase;
    type QueryResultRow = pg.QueryResultRow;
    type QueryResult<R extends QueryResultRow = any> = pg.QueryResult<R>;
    type QueryArrayResult<R extends any[] = any[]> = pg.QueryArrayResult<R>;
    type Notification = pg.Notification;
    type ResultBuilder<R extends QueryResultRow = any> = pg.ResultBuilder<R>;
    type QueryParse = pg.QueryParse;
    type BindConfig = pg.BindConfig;
    type ExecuteConfig = pg.ExecuteConfig;
    type MessageConfig = pg.MessageConfig;
    type PoolOptions = pg.PoolOptions;
    type PoolClient = pg.PoolClient;

    type ClientBase = pg.ClientBase;
    type Client = pg.Client;
    type Query = pg.Query;
    type Events = pg.Events;
    type Pool = pg.Pool;
    type Connection = pg.Connection;
    type DatabaseError = pg.DatabaseError;
    type TypeOverrides = pg.TypeOverrides;
    type Result = pg.Result;
}

export * from "./index.js";
export default PG;
