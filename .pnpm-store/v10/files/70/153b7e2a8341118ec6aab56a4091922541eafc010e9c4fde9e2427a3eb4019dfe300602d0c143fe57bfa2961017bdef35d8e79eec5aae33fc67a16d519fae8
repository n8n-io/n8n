import { GaxiosOptions, GaxiosPromise } from 'gaxios';
interface Transporter {
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
}
interface TokenOptions {
    /**
     * Path to a .json, .pem, or .p12 key file.
     */
    keyFile?: string;
    /**
     * The raw private key value.
     */
    key?: string;
    /**
     * The service account email address.
     */
    email?: string;
    /**
     * The issuer claim for the JWT.
     */
    iss?: string;
    /**
     * The subject claim for the JWT. This is used for impersonation.
     */
    sub?: string;
    /**
     * The space-delimited list of scopes for the requested token.
     */
    scope?: string | string[];
    /**
     * Additional claims to include in the JWT payload.
     */
    additionalClaims?: {
        [key: string]: any;
    };
    /**
     * Eagerly refresh unexpired tokens when they are within this many
     * milliseconds from expiring.
     * Defaults to 0.
     */
    eagerRefreshThresholdMillis?: number;
    transporter?: Transporter;
}
export { Transporter, TokenOptions };
