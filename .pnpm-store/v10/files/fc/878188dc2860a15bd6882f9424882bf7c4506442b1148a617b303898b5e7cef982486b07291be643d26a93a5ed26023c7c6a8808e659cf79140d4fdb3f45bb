
import { TlsOptions } from "tls";
/**
 * Postgres specific connection credential options.
 */
export interface PostgresConnectionCredentialsOptions {
    /**
     * Connection url where perform connection to.
     */
    readonly url?: string;
    /**
     * Database host.
     */
    readonly host?: string;
    /**
     * Database host port.
     */
    readonly port?: number;
    /**
     * Database username.
     */
    readonly username?: string;
    /**
     * Database password.
     */
    readonly password?: string | (() => string) | (() => Promise<string>);
    /**
     * Database name to connect to.
     */
    readonly database?: string;
    /**
     * Object with ssl parameters
     */
    readonly ssl?: boolean | TlsOptions;
    /**
     * sets the application_name var to help db administrators identify
     * the service using this connection. Defaults to 'undefined'
     */
    readonly applicationName?: string;
}
