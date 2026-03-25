// Type definitions for aws4 1.11
// Project: https://github.com/mhart/aws4
// Definitions by: Andrew Crites <https://github.com/ajcrites>
//                 Alexandre Szymocha <https://github.com/Aksamyt>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 3.9

/// <reference types="node" />

import { OutgoingHttpHeaders, RequestOptions } from 'http';

export interface Request extends RequestOptions {
    /** Defaults to {@link RequestSigner.createHost}() if possible. */
    host?: string;
    /** Equivalent to {@link host} */
    hostname?: string;
    /** Defaults to `"GET"`, or `"POST"` if there is a {@link body}. */
    method?: string;
    /** Defaults to `/`. */
    path?: string;
    /** Defaults to `""`. */
    body?: string | Buffer;
    /** Defaults to {@link RequestSigner.matchHost}()[0], or `""`. */
    service?: string;
    /** Defaults to {@link RequestSigner.matchHost}()[1], or `"us-east-1"`. */
    region?: string;
    /** To sign the query instead of adding an Authorization header, defaults to false. */
    signQuery?: boolean;
    /**
     * Some headers have a default value:
     * - `Host`: Defaults to {@link hostname}, {@link host}, or
     *   {@link RequestSigner.createHost}()
     * - `Content-Type`: defaults to
     *   `"application/x-www-form-urlencoded; charset=utf-8"`
     *   if there is a {@link body}
     * - `Date`: used to calculate the signature date if given, defaults to
     * `new Date()`
     */
    headers?: OutgoingHttpHeaders;
    /** If true, signing the Request won’t mutate the headers. */
    doNotModifyHeaders?: boolean;
    /** If true, {@link path} won’t be encoded in the signature. */
    doNotEncodePath?: boolean;
}

export interface Credentials {
    /** Equivalent to the env vars `AWS_ACCESS_KEY_ID` and `AWS_ACCESS_KEY`. */
    accessKeyId?: string;
    /** Equivalent to the env vars `AWS_SECRET_ACCESS_KEY` and `AWS_SECRET_KEY`. */
    secretAccessKey?: string;
    /** Equivalent to the env var `AWS_SESSION_TOKEN`. */
    sessionToken?: string;
}

export class RequestSigner {
    constructor(requestOptions: string | Request, credentials?: Credentials);

    request: Request;
    credentials: Credentials;
    service: string;
    region: string;

    /**
     * `true` if {@link service} is `"codecommit"` and {@link request}.method
     * is `"GIT"`.
     */
    isCodeCommitGit: boolean;

    /**
     * Set by:
     * - {@link prepareRequest}
     * - {@link sign}
     * - {@link canonicalString}
     * - {@link parsePath}
     */
    parsedPath?: {
        path: string;
        query: Record<string, string | string[]>;
    };

    /**
     * Used as a cache by {@link getDateTime} and {@link getDate}.
     * Setting it will shortcut those functions.
     *
     * Set by:
     * - {@link prepareRequest}
     * - {@link getDateTime}
     * - {@link sign}
     */
    datetime?: string;

    /**
     * Extract the service code and region code from a Host name.
     * @returns two element string tuple with values [service, region].
     */
    matchHost(host: string): [string, string];

    /**
     * https://docs.aws.amazon.com/general/latest/gr/rande.html
     */
    isSingleRegion(): boolean;

    /**
     * Compute the Host name from the {@link service} and the {@link region}.
     */
    createHost(): string;

    /**
     * Generate the Authorization header value.
     */
    authHeader(): string;

    /**
     * Generate a string representation of {@link request}.headers:
     * - one header per line, formatted as `<key>:<value>`
     * - lines are sorted.
     * - `<key>` is in lowercase and is trimmed.
     * - `<value>` is trimmed, and contiguous whitespaces are reduced to a
     *   single space character ` `.
     *
     * These headers are filtered out:
     * - `authorization`
     * - `connection`
     * - `x-amzn-trace-id`
     * - `user-agent`
     * - `expect`
     * - `presigned-expires`
     * - `range`
     */
    canonicalHeaders(): string;

    /**
     * Generates a list of the header names of {@link request}.headers separated
     * by `;`.
     *
     * These headers are filtered out:
     * - `authorization`
     * - `connection`
     * - `x-amzn-trace-id`
     * - `user-agent`
     * - `expect`
     * - `presigned-expires`
     * - `range`
     */
    signedHeaders(): string;

    /**
     * Generate the “credential scope” part of the signature.
     */
    credentialString(): string;

    /**
     * Extract credentials from the environment, if found.
     */
    defaultCredentials(): Credentials;

    /**
     * Parse {@link request}.path and store the results in {@link parsedPath}.
     */
    parsePath(): void;

    /**
     * **Will throw if {@link parsedPath} is undefined!**
     *
     * Rebuild the path from {@link parsedPath}.
     */
    formatPath(): string;

    /**
     * Sign the Request. The Request is returned for convenience.
     */
    sign(): Request;

    /**
     * Calls {@link parsePath}.
     * Prepare the Request by setting the required headers,
     * or query parameters if {@link request}.signQuery is true.
     */
    prepareRequest(): void;

    /**
     * If {@link datetime} is set, it is returned without further processing.
     *
     * Else, parse the `Date` header from {@link request}.headers,
     * or get the current date, and format it as (ISO 8601):
     * ```
     * YYYYMMDDThhmmssZ
     * ```
     * If {@link isCodeCommitGit} is `true`, then the trailing `Z` is removed.
     *
     * The result is stored to {@link datetime} before being returned.
     */
    getDateTime(): string;

    /**
     * If {@link datetime} is set, its first 8 characters are returned.
     *
     * Else, call {@link getDateTime} and return the first 8 characters.
     */
    getDate(): string;

    /**
     * Generate a string representation of the Request.
     * https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
     */
    canonicalString(): string;

    /**
     * Compute the Request HMAC signature.
     */
    signature(): string;

    /**
     * Generate the raw data to be signed.
     * https://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
     */
    stringToSign(): string;
}

/**
 * Calculates and populates any necessary AWS headers and/or request options on
 * `requestOptions`. Returns `requestOptions` as a convenience for chaining.
 */
export function sign(requestOptions: string | Request, credentials?: Credentials): Request;
