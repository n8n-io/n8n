import { ConnectionOptions } from "tls";
import { ConnectionConfig } from "..";

interface ConnectionParametersConfig extends
    Pick<
        ConnectionConfig,
        | "user"
        | "database"
        | "password"
        | "port"
        | "host"
        | "options"
        | "ssl"
        | "application_name"
        | "statement_timeout"
        | "idle_in_transaction_session_timeout"
        | "query_timeout"
    >
{
    binary?: unknown;
    client_encoding?: unknown;
    replication?: unknown;
    isDomainSocket?: unknown;
    fallback_application_name?: unknown;
    lock_timeout?: unknown;
    connect_timeout?: unknown;
    keepalives?: unknown;
    keepalives_idle?: unknown;
}

export = ConnectionParameters;
declare class ConnectionParameters implements ConnectionParametersConfig {
    user?: string | undefined;
    database?: string | undefined;
    password?: string | (() => string | Promise<string>) | undefined;
    port?: number | undefined;
    host?: string | undefined;
    statement_timeout?: false | number | undefined;
    ssl?: boolean | ConnectionOptions | undefined;
    query_timeout?: number | undefined;
    idle_in_transaction_session_timeout?: number | undefined;
    application_name?: string | undefined;
    options?: string | undefined;

    binary?: unknown;
    client_encoding?: unknown;
    replication?: unknown;
    isDomainSocket?: unknown;
    fallback_application_name?: unknown;
    lock_timeout?: unknown;
    connect_timeout?: unknown;
    keepalives?: unknown;
    keepalives_idle?: unknown;

    constructor(config?: string | ConnectionParametersConfig);

    getLibpqConnectionString<TResult>(cb: (err: Error | null, params: string | null) => TResult): TResult;
}
