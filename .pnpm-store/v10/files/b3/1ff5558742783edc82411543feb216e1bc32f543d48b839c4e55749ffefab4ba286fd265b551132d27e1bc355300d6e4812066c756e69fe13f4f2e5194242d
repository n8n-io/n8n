import { bytes, JSONValue } from ".";
import { Selection } from "./html";

/**
 * Make DELETE  request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/del/
 * @param url - Request URL.
 * @param body - Discouraged. Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 */
export function del<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make HEAD request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/head/
 * @param url - Request URL.
 * @param params - Request parameters.
 * @returns Resulting response.
 * @example
 * http.head('https://test.k6.io')
 */
export function head<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make GET request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/get/
 * @param url - Request URL.
 * @param params - Request parameters.
 * @returns Resulting response.
 * @example
 * http.get('https://k6.io')
 */
export function get<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make OPTIONS request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/options/
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 */
export function options<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make PATCH request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/patch/
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 */
export function patch<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make POST request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 * @example
 * let formData = {name: 'k6'};
 * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
 * http.post(url, formData, { headers: headers });
 */
export function post<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make PUT request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/put/
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 */
export function put<RT extends ResponseType | undefined>(
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/request/
 * @param method - HTTP method.
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 * @example
 * let formData = {name: 'k6'};
 * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
 * http.request('POST', url, formData, { headers: headers });
 */
export function request<RT extends ResponseType | undefined>(
    method: string,
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): RefinedResponse<RT>;

/**
 * Make async request.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/asyncrequest/
 * @param method - HTTP method.
 * @param url - Request URL.
 * @param body - Request body. Object form encoded.
 * @param params - Request parameters.
 * @returns Resulting response.
 * @example
 * let formData = {name: 'k6'};
 * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
 * http.asyncRequest('POST', url, formData, { headers: headers });
 */
export function asyncRequest<RT extends ResponseType | undefined>(
    method: string,
    url: string | HttpURL,
    body?: RequestBody | null,
    params?: RefinedParams<RT> | null,
): Promise<RefinedResponse<RT>>;

/**
 * Batch multiple HTTP requests together,
 * to issue them in parallel over multiple TCP connections.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/batch/
 * @param requests - Request specifications.
 * @returns Resulting responses.
 * @example
 * let req1 = {
 *    method: 'GET',
 *    url: 'https://httpbin.org/get',
 * };
 * let req2 = {
 *   method: 'POST',
 *   url: 'https://httpbin.org/post',
 *   body: {
 *     hello: 'world!',
 *   },
 *   params: {
 *     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 *   },
 * };
 * let responses = http.batch([req1, req2]);
 */
export function batch<Q extends BatchRequests>(requests: Q): BatchResponses<Q>;

/**
 * Create a file object used for building multipart requests (file uploads).
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/file/
 * @param data - File data.
 * @param filename - Filename. Included in MIME message.
 * @param contentType - Content type. Included in MIME message.
 * @returns File data object.
 * @example
 * let binFile = open('/path/to/file.bin', 'b');
 *
 * export default function() {
 *   let f = http.file(binFile, 'test.bin');
 *   console.log(md5(f.data, 'hex'));
 *   console.log(f.filename);
 *   console.log(f.content_type);
 * }
 */
export function file(data: string | bytes | ArrayBuffer, filename?: string, contentType?: string): FileData;

/**
 * Get active cookie jar.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar
 * @returns Active cookie jar.
 * @example
 * let jar = http.cookieJar();
 */
export function cookieJar(): CookieJar;

/**
 * Returns a callback to be used with setResponseCallback to mark responses
 * as expected based only on their status codes.
 * https://staging.k6.io/docs/javascript-api/k6-http/expectedstatuses-statuses
 */
export function expectedStatuses(...param: Array<number | ExpectedStatusesObject>): ExpectedStatusesCallback;

/**
 * Set the response callback to be called to determine if a response was expected/successful or not.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/setresponsecallback/
 */
export function setResponseCallback(responseCallback: ExpectedStatusesCallback): void;

// === SSL/TLS versions ===
// ------------------------

export const SSL_3_0 = "ssl3.0";

export const TLS_1_0 = "tls1.0";

export const TLS_1_1 = "tls1.1";

export const TLS_1_2 = "tls1.2";

export const TLS_1_3 = "tls1.3";

// === OCSP statuses ===
// ---------------------

export const OCSP_STATUS_GOOD = "good";

export const OCSP_STATUS_REVOKED = "revoked";

export const OCSP_STATUS_SERVER_FAILED = "server_failed";

export const OCSP_STATUS_UNKNOWN = "unknown";

// === OCSP revocation reasons ===
// -------------------------------

export const OCSP_REASON_AA_COMPROMISE = "aa_compromise";

export const OCSP_REASON_AFFILIATION_CHANGED = "affiliation_changed";

export const OCSP_REASON_CA_COMPROMISE = "ca_compromise";

export const OCSP_REASON_CERTIFICATE_HOLD = "certificate_hold";

export const OCSP_REASON_CESSATION_OF_OPERATION = "cessation_of_operation";

export const OCSP_REASON_KEY_COMPROMISE = "key_compromise";

export const OCSP_REASON_PRIVILEGE_WITHDRAWN = "privilege_withdrawn";

export const OCSP_REASON_REMOVE_FROM_CRL = "remove_from_crl";

export const OCSP_REASON_SUPERSEDED = "superseded";

export const OCSP_REASON_UNSPECIFIED = "unspecified";

// === Params ===
// --------------

/**
 * Request parameters.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/
 */
export interface Params {
    /** Authentication method. */
    auth?: AuthMethod;

    /** Request body compression. */
    compression?: string;

    /** Request scoped cookies. */
    cookies?: { [name: string]: ParamsCookieValue };

    /** Request headers. */
    headers?: { [name: string]: string };

    /** Cookie jar to override default VU cookie jar with. */
    jar?: CookieJar;

    /** Maximum redirects to follow. */
    redirects?: number;

    /** Response type. */
    responseType?: ResponseType;

    /** Response time metric tags. */
    tags?: { [name: string]: string };

    /** Request timeout. */
    timeout?: string | number;

    /** Sets a ResponseCallback only for this request. */
    responseCallback?: ExpectedStatusesCallback;
}

/**
 * Request parameters with refined response type.
 * Used to infer response body type.
 */
export interface RefinedParams<RT extends ResponseType | undefined> extends Params {
    responseType?: RT;
}

/**
 * Request authentication method.
 */
export type AuthMethod = "basic" | "digest" | "ntlm";

/**
 * Response type.
 */
export type ResponseType = "binary" | "none" | "text";

/**
 * Cookie value in request parameters.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/
 */
export type ParamsCookieValue = string | { value?: string; replace?: boolean };

// === Request body ===
// --------------------

/**
 * Request body.
 */
export type RequestBody = string | StructuredRequestBody | ArrayBuffer;

/**
 * Structured request body. May include file uploads.
 */
export interface StructuredRequestBody {
    [name: string]: string | FileData;
}

// === Batch request ===
// ---------------------

/**
 * Batch request specification.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/batch/
 */
export type BatchRequest = string | HttpURL | ArrayBatchRequest | ObjectBatchRequest;

/**
 * Array form batch request specification.
 */
export type ArrayBatchRequest = [string, string | HttpURL, (RequestBody | null)?, (Params | null)?];

/**
 * Object form batch request specification.
 */
export interface ObjectBatchRequest {
    /** Request method. */
    method: string;

    /** Request URL. */
    url: string | HttpURL;

    /** Request body. */
    body?: RequestBody | null;

    /** Requset parameters. */
    params?: Params | null;
}

/**
 * Set of batch request specifications.
 */
export type BatchRequests = BatchRequest[] | { [name: string]: BatchRequest };

// === Refined batch request ===
// -----------------------------

/**
 * Refined batch request specification.
 * Used to infer response body type.
 */
export type RefinedBatchRequest<RT extends ResponseType | undefined> =
    | string
    | HttpURL
    | ArrayRefinedBatchRequest<RT>
    | ObjectRefinedBatchRequest<RT>;

/**
 * Array form refined batch request specification.
 */
export type ArrayRefinedBatchRequest<RT extends ResponseType | undefined> = [
    string,
    string | HttpURL,
    (RequestBody | null)?,
    (RefinedParams<RT> | null)?,
];

/**
 * Object form refined batch request specification.
 */
export interface ObjectRefinedBatchRequest<RT extends ResponseType | undefined> {
    method: string;
    url: string | HttpURL;
    body?: RequestBody | null;
    params?: RefinedParams<RT> | null;
}

// === Batch responses ===
// -----------------------

/**
 * Set of batch responses. Array or object.
 */
export type BatchResponses<Q> = {
    [K in keyof Q]: Q[K] extends RefinedBatchRequest<infer RT> ? RefinedResponse<RT> : never;
};

// === Response ===
// ----------------

/**
 * Response.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/
 */
export interface Response {
    /** Response body. */
    body: ResponseBody;

    /** Response cookies. */
    cookies: { [name: string]: ResponseCookie[] };

    /** Non-HTTP error message. */
    error: string;

    /** Error code. Present for 4xx 5xx responses and non-HTTP errors. */
    error_code: number;

    /** Response headers. */
    headers: { [name: string]: string };

    /** Online Certificate Status Protocol response. */
    ocsp: {
        /** When response signed by responder in millisecond Unix time. */
        produced_at: number;

        /** When indicated status was known correct in millisecond Unix time. */
        this_update: number;

        /** When response will be refreshed with the CA in millisecond Unix time. */
        next_update: number;

        /** Certificate revocation reason. One of `OCSP_REASON_*` constants. */
        revocation_reason: string;

        /** When certificate was revoked in millisecond Unix time. */
        revoked_at: number;

        /** Certificate status. One of `OCSP_STATUS_*` constants. */
        status: string;
    };

    /** Protocol used to perform the transfer. */
    proto: Protocol;

    /** Server IP address. */
    remote_ip: string;

    /** Remote port connected to. */
    remote_port: number;

    /** Inciting request details. */
    request: {
        /** Request body. */
        body: string;

        /** Request cookies. */
        cookies: { [name: string]: RequestCookie[] };

        /** Request headers. */
        headers: { [name: string]: string[] };

        /** Request method. */
        method: string;

        /** Request URL. */
        url: string;
    };

    /** HTTP status code. */
    status: number;

    /** HTTP status text returned by the server. */
    status_text: string;

    /** Performance timing information. */
    timings: {
        /** Milliseconds spent blocked before initiating request. */
        blocked: number;

        /** Milliseconds spent setting up TCP connection to host. */
        connecting: number;

        /** Milliseconds spent handshaking TLS session with host. */
        tls_handshaking: number;

        /** Milliseconds spent sending request. */
        sending: number;

        /** Milliseconds spent waiting for server response (TTFB). */
        waiting: number;

        /** Milliseconds spent receiving response data. */
        receiving: number;

        /** Total time in milliseconds. `sending+waiting+receiving` */
        duration: number;
    };

    /** TLS cipher suite used. */
    tls_cipher_suite: CipherSuite;

    /** TLS/SSL version used. One of `TLS_*` `SSL_*` constants. */
    tls_version: string;

    /** Fetched URL. May differ from request URL due to redirects. */
    url: string;

    /**
     * Click link on page.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/response-clicklink/
     * @param selector - Selector expression locating link to click.
     * @param params - Parameters for link click request.
     * @returns Link click response.
     */
    clickLink<RT extends ResponseType | undefined>(args?: {
        selector?: string;
        params?: RefinedParams<RT> | null;
    }): RefinedResponse<RT>;

    /**
     * Parse body as HTML. Optionally filter by selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/response-html
     * @param selector - Selector expression.
     * @returns Document node or selected elements.
     * @example
     * let res = http.get("https://stackoverflow.com");
     * let doc = res.html();
     */
    html(selector?: string): Selection;

    /**
     * Parse body as JSON. Optionally filter by selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/response-json/
     * @param selector - GJSON expression.
     * @returns Parse result if successful, `undefined` if unsuccessful.
     * @example
     * let res = http.get(url);
     * res.json();
     */
    json(selector?: string): JSONValue;

    /**
     * Submit form on page.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/response-submitform/
     * @param formSelector - Selector expression locating form to submit.
     * @param fields - Form field values.
     * @param submitSelector - Selector expression locating submit button.
     * @param params - Parameters for form submission request.
     * @returns Form submission response.
     */
    submitForm<RT extends ResponseType | undefined>(args?: {
        formSelector?: string;
        fields?: { [name: string]: string };
        submitSelector?: string;
        params?: RefinedParams<RT> | null;
    }): RefinedResponse<RT>;
}

/**
 * HTTP protocol.
 */
export type Protocol = "HTTP/1.0" | "HTTP/1.1" | "HTTP/2.0";

/**
 * TLS cipher suite.
 */
export type CipherSuite =
    | "TLS_RSA_WITH_RC4_128_SHA"
    | "TLS_RSA_WITH_3DES_EDE_CBC_SHA"
    | "TLS_RSA_WITH_AES_128_CBC_SHA"
    | "TLS_RSA_WITH_AES_128_CBC_SHA256"
    | "TLS_RSA_WITH_AES_256_CBC_SHA"
    | "TLS_RSA_WITH_AES_128_GCM_SHA256"
    | "TLS_RSA_WITH_AES_256_GCM_SHA384"
    | "TLS_ECDHE_RSA_WITH_RC4_128_SHA"
    | "TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA"
    | "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA"
    | "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256"
    | "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA"
    | "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
    | "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
    | "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305"
    | "TLS_ECDHE_ECDSA_WITH_RC4_128_SHA"
    | "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA"
    | "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256"
    | "TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA"
    | "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256"
    | "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
    | "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305"
    | "TLS_AES_128_GCM_SHA256"
    | "TLS_AES_256_GCM_SHA384"
    | "TLS_CHACHA20_POLY1305_SHA256";

/**
 * Refined response.
 * Exposes body with best possible type.
 */
export interface RefinedResponse<RT extends ResponseType | undefined> extends Response {
    body: RefinedResponseBody<RT>;
}

/**
 * Response body.
 */
export type ResponseBody = string | ArrayBuffer | null;

/**
 * Refined response body.
 * Best possible type given `responseType` from request parameters.
 * @template RT - `Params.responseType` value.
 * @privateRemarks Default type is a union due to depending on program options.
 */
export type RefinedResponseBody<RT extends ResponseType | undefined> = RT extends "binary" ? ArrayBuffer
    : RT extends "none" ? null
    : RT extends "text" ? string
    : RT extends undefined ? string | null
    : never;

/**
 * Request cookie description in response.
 */
export interface RequestCookie {
    /** Name. */
    name: string;

    /** Value. */
    value: string;

    /** Whether configured to override VU cookie jar. */
    replace: boolean;
}

/**
 * Response cookie.
 */
export interface ResponseCookie {
    /** Name. */
    name: string;

    /** Value. */
    value: string;

    /** Domain allowed to receive. */
    domain: string;

    /** Scope path. */
    path: string;

    /** HTTP only. */
    httpOnly: boolean;

    /** Secure. */
    secure: boolean;

    /** Seconds until expiration. */
    maxAge: number;

    /** Expiry time in millisecond Unix time. */
    expires: number;
}

// === File data ===
// -----------------

/**
 * File data for constructing a multipart request with file uploads.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/filedata/
 */
export abstract class FileData {
    protected __brand: never;

    /** File data. */
    data: string | bytes | ArrayBuffer;

    /** Filename to include in MIME message. */
    filename?: string;

    /** Content type to include in MIME message. */
    content_type?: string;
}

// === Cookie jar ===
// ------------------

/**
 * Object for storing cookies.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/
 */
export class CookieJar {
    protected __brand: never;

    /**
     * Get cookies set for a particular URL.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/cookiejar-cookiesforurl/
     * @param url - URL for which to get cookies.
     * @returns Cookies for URL.
     */
    cookiesForURL(url: string): CookieJarCookies;

    /**
     * Set cookie.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/cookiejar-set/
     * @param url - Cookie URL.
     * @param name - Cookie name.
     * @param value - Cookie value.
     * @param options - Optional settings.
     */
    set(url: string, name: string, value: string, options?: CookieOptions | null): void;

    /**
     * Delete all cookies for the given URL.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/cookiejar-clear
     * @param url - URL to delete all cookies for.
     */

    clear(url: string): void;

    /**
     * Deletes specific cookie by name for the given URL.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/cookiejar-delete/
     * @param url - URL to delete cookie for.
     * @param name - Cookie name to delete.
     */

    delete(url: string, name: string): void;
}

/**
 * Cookies retrieved from cookie jar.
 */
export interface CookieJarCookies {
    [name: string]: string[];
}

/**
 * Optional settings when adding a cookie to a cookie jar.
 */
export interface CookieOptions {
    /** Domain allowed to receive. */
    domain?: string;

    /** Scope path. */
    path?: string;

    /** Expiry time in RFC1123 format. */
    expires?: string;

    /** Seconds until expiration. */
    max_age?: number;

    /** Secure. */
    secure?: boolean;

    /** HTTP only. */
    http_only?: boolean;
}

interface ExpectedStatusesCallback {
    [n: string]: never;
}

export interface ExpectedStatusesObject {
    min: number;
    max: number;
}

// === HTTP URL ===
// -----------------------

/**
 * Returned value from http.url method.
 */
interface HttpURL {
    __brand: "http-url";
}

/**
 * The http module contains functionality for performing HTTP transactions.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-http/
 */
declare namespace http {
    /**
     * Make DELETE  request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/del/
     * @param url - Request URL.
     * @param body - Discouraged. Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    function del<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make HEAD request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/head/
     * @param url - Request URL.
     * @param params - Request parameters.
     * @returns Resulting response.
     * @example
     * http.head('https://test.k6.io')
     */
    function head<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make GET request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/get/
     * @param url - Request URL.
     * @param params - Request parameters.
     * @returns Resulting response.
     * @example
     * http.get('https://k6.io')
     */
    function get<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make OPTIONS request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/options/
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    function options<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make PATCH request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/patch/
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    function patch<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make POST request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     * @example
     * let formData = {name: 'k6'};
     * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
     * http.post(url, formData, { headers: headers });
     */
    function post<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make PUT request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/put/
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    function put<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/request/
     * @param method - HTTP method.
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     * @example
     * let formData = {name: 'k6'};
     * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
     * http.request('POST', url, formData, { headers: headers });
     */
    function request<RT extends ResponseType | undefined>(
        method: string,
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Make async request.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/asyncrequest/
     * @param method - HTTP method.
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     * @example
     * let formData = {name: 'k6'};
     * let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
     * http.asyncRequest('POST', url, formData, { headers: headers });
     */
    function asyncRequest<RT extends ResponseType | undefined>(
        method: string,
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): Promise<RefinedResponse<RT>>;

    /**
     * Creates a URL with set name tag.
     * https://grafana.com/docs/k6/latest/using-k6/http-requests/#url-grouping
     * @param strings - Passed string values.
     * @param args - Tagged template expressions.
     * @returns HTTP URL object.
     * @example
     * http.get(http.url`http://example.com/posts/${id}`) // tags.name="http://example.com/posts/${}",
     */
    function url(strings: TemplateStringsArray, ...args: Array<string | number | boolean>): HttpURL;

    /**
     * Batch multiple HTTP requests together,
     * to issue them in parallel over multiple TCP connections.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/batch/
     * @param requests - Request specifications.
     * @returns Resulting responses.
     * @example
     * let req1 = {
     *    method: 'GET',
     *    url: 'https://httpbin.org/get',
     * };
     * let req2 = {
     *   method: 'POST',
     *   url: 'https://httpbin.org/post',
     *   body: {
     *     hello: 'world!',
     *   },
     *   params: {
     *     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     *   },
     * };
     * let responses = http.batch([req1, req2]);
     */
    function batch<Q extends BatchRequests>(requests: Q): BatchResponses<Q>;

    /**
     * Create a file object used for building multipart requests (file uploads).
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/file/
     * @param data - File data.
     * @param filename - Filename. Included in MIME message.
     * @param contentType - Content type. Included in MIME message.
     * @returns File data object.
     * @example
     * let binFile = open('/path/to/file.bin', 'b');
     *
     * export default function() {
     *   let f = http.file(binFile, 'test.bin');
     *   console.log(md5(f.data, 'hex'));
     *   console.log(f.filename);
     *   console.log(f.content_type);
     * }
     */
    function file(data: string | bytes | ArrayBuffer, filename?: string, contentType?: string): FileData;

    /**
     * Get active cookie jar.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/cookiejar/
     * @returns Active cookie jar.
     * @example
     * let jar = http.cookieJar();
     */
    function cookieJar(): CookieJar;
    /**
     * Returns a callback to be used with setResponseCallback to mark responses
     * as expected based only on their status codes.
     * https://staging.k6.io/docs/javascript-api/k6-http/expectedstatuses-statuses/
     */
    function expectedStatuses(...param: Array<number | ExpectedStatusesObject>): ExpectedStatusesCallback;

    /**
     * Set the response callback to be called to determine if a response was expected/successful or not.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-http/setresponsecallback/
     */
    function setResponseCallback(responseCallback: ExpectedStatusesCallback): void;
}

export default http;
