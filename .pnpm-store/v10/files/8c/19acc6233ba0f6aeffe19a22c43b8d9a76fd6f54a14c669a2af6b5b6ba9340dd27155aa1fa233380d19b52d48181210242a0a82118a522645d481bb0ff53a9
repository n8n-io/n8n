import type { AuthScheme } from "./auth/schemes.js";
/**
 * A HttpHeaders collection represented as a simple JSON object.
 */
export type RawHttpHeaders = {
    [headerName: string]: string;
};
/**
 * A HttpHeaders collection for input, represented as a simple JSON object.
 */
export type RawHttpHeadersInput = Record<string, string | number | boolean>;
/**
 * Represents a set of HTTP headers on a request/response.
 * Header names are treated as case insensitive.
 */
export interface HttpHeaders extends Iterable<[string, string]> {
    /**
     * Returns the value of a specific header or undefined if not set.
     * @param name - The name of the header to retrieve.
     */
    get(name: string): string | undefined;
    /**
     * Returns true if the specified header exists.
     * @param name - The name of the header to check.
     */
    has(name: string): boolean;
    /**
     * Sets a specific header with a given value.
     * @param name - The name of the header to set.
     * @param value - The value to use for the header.
     */
    set(name: string, value: string | number | boolean): void;
    /**
     * Removes a specific header from the collection.
     * @param name - The name of the header to delete.
     */
    delete(name: string): void;
    /**
     * Accesses a raw JS object that acts as a simple map
     * of header names to values.
     */
    toJSON(options?: {
        preserveCase?: boolean;
    }): RawHttpHeaders;
}
/**
 * A part of the request body in a multipart request.
 */
export interface BodyPart {
    /**
     * The headers for this part of the multipart request.
     */
    headers: HttpHeaders;
    /**
     * The body of this part of the multipart request.
     */
    body: ((() => ReadableStream<Uint8Array>) | (() => NodeJS.ReadableStream)) | ReadableStream<Uint8Array> | NodeJS.ReadableStream | Uint8Array | Blob;
}
/**
 * A request body consisting of multiple parts.
 */
export interface MultipartRequestBody {
    /**
     * The parts of the request body.
     */
    parts: BodyPart[];
    /**
     * The boundary separating each part of the request body.
     * If not specified, a random boundary will be generated.
     *
     * When specified, '--' will be prepended to the boundary in the request to ensure the boundary follows the specification.
     */
    boundary?: string;
}
/**
 * Types of bodies supported on the request.
 * NodeJS.ReadableStream and () =\> NodeJS.ReadableStream is Node only.
 * Blob, ReadableStream<Uint8Array>, and () =\> ReadableStream<Uint8Array> are browser only.
 */
export type RequestBodyType = NodeJS.ReadableStream | (() => NodeJS.ReadableStream) | ReadableStream<Uint8Array> | (() => ReadableStream<Uint8Array>) | Blob | ArrayBuffer | ArrayBufferView | FormData | string | null;
/**
 * An interface compatible with NodeJS's `http.Agent`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export interface Agent {
    /**
     * Destroy any sockets that are currently in use by the agent.
     */
    destroy(): void;
    /**
     * For agents with keepAlive enabled, this sets the maximum number of sockets that will be left open in the free state.
     */
    maxFreeSockets: number;
    /**
     * Determines how many concurrent sockets the agent can have open per origin.
     */
    maxSockets: number;
    /**
     * An object which contains queues of requests that have not yet been assigned to sockets.
     */
    requests: unknown;
    /**
     * An object which contains arrays of sockets currently in use by the agent.
     */
    sockets: unknown;
}
/**
 * Metadata about a request being made by the pipeline.
 */
export interface PipelineRequest {
    /**
     * List of authentication schemes used for this specific request.
     * These schemes define how the request will be authenticated.
     * If provided, these schemes override the client level authentication schemes.
     *
     * If no auth schemes are provided at client or request level, defaults to no auth.
     */
    authSchemes?: AuthScheme[];
    /**
     * The URL to make the request to.
     */
    url: string;
    /**
     * The HTTP method to use when making the request.
     */
    method: HttpMethods;
    /**
     * The HTTP headers to use when making the request.
     */
    headers: HttpHeaders;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * If the request is terminated, an `AbortError` is thrown.
     * Defaults to 0, which disables the timeout.
     */
    timeout: number;
    /**
     * Indicates whether the user agent should send cookies from the other domain in the case of cross-origin requests.
     * Defaults to false.
     */
    withCredentials: boolean;
    /**
     * A unique identifier for the request. Used for logging and tracing.
     */
    requestId: string;
    /**
     * The HTTP body content (if any)
     */
    body?: RequestBodyType;
    /**
     * Body for a multipart request.
     */
    multipartBody?: MultipartRequestBody;
    /**
     * To simulate a browser form post
     */
    formData?: FormDataMap;
    /**
     * A list of response status codes whose corresponding PipelineResponse body should be treated as a stream.
     * When streamResponseStatusCodes contains the value Number.POSITIVE_INFINITY any status would be treated as a stream.
     */
    streamResponseStatusCodes?: Set<number>;
    /**
     * Proxy configuration.
     */
    proxySettings?: ProxySettings;
    /**
     * If the connection should not be reused.
     */
    disableKeepAlive?: boolean;
    /**
     * Used to abort the request later.
     */
    abortSignal?: AbortSignal;
    /**
     * Callback which fires upon upload progress.
     */
    onUploadProgress?: (progress: TransferProgressEvent) => void;
    /** Callback which fires upon download progress. */
    onDownloadProgress?: (progress: TransferProgressEvent) => void;
    /** Set to true if the request is sent over HTTP instead of HTTPS */
    allowInsecureConnection?: boolean;
    /**
     * NODEJS ONLY
     *
     * A Node-only option to provide a custom `http.Agent`/`https.Agent`.
     * Does nothing when running in the browser.
     */
    agent?: Agent;
    /**
     * BROWSER ONLY
     *
     * A browser only option to enable browser Streams. If this option is set and a response is a stream
     * the response will have a property `browserStream` instead of `blobBody` which will be undefined.
     *
     * Default value is false
     */
    enableBrowserStreams?: boolean;
    /** Settings for configuring TLS authentication */
    tlsSettings?: TlsSettings;
    /**
     * Additional options to set on the request. This provides a way to override
     * existing ones or provide request properties that are not declared.
     *
     * For possible valid properties, see
     *   - NodeJS https.request options:  https://nodejs.org/api/http.html#httprequestoptions-callback
     *   - Browser RequestInit: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
     *
     * WARNING: Options specified here will override any properties of same names when request is sent by {@link HttpClient}.
     */
    requestOverrides?: Record<string, unknown>;
}
/**
 * Metadata about a response received by the pipeline.
 */
export interface PipelineResponse {
    /**
     * The request that generated this response.
     */
    request: PipelineRequest;
    /**
     * The HTTP status code of the response.
     */
    status: number;
    /**
     * The HTTP response headers.
     */
    headers: HttpHeaders;
    /**
     * The response body as text (string format)
     */
    bodyAsText?: string | null;
    /**
     * BROWSER ONLY
     *
     * The response body as a browser Blob.
     * Always undefined in node.js.
     */
    blobBody?: Promise<Blob>;
    /**
     * BROWSER ONLY
     *
     * The response body as a browser ReadableStream.
     * Always undefined in node.js.
     */
    browserStreamBody?: ReadableStream<Uint8Array>;
    /**
     * NODEJS ONLY
     *
     * The response body as a node.js Readable stream.
     * Always undefined in the browser.
     */
    readableStreamBody?: NodeJS.ReadableStream;
}
/**
 * A simple interface for making a pipeline request and receiving a response.
 */
export type SendRequest = (request: PipelineRequest) => Promise<PipelineResponse>;
/**
 * The required interface for a client that makes HTTP requests
 * on behalf of a pipeline.
 */
export interface HttpClient {
    /**
     * The method that makes the request and returns a response.
     */
    sendRequest: SendRequest;
}
/**
 * Fired in response to upload or download progress.
 */
export type TransferProgressEvent = {
    /**
     * The number of bytes loaded so far.
     */
    loadedBytes: number;
};
/**
 * Supported HTTP methods to use when making requests.
 */
export type HttpMethods = "GET" | "PUT" | "POST" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE";
/**
 * Options to configure a proxy for outgoing requests (Node.js only).
 */
export interface ProxySettings {
    /**
     * The proxy's host address.
     * Must include the protocol (e.g., http:// or https://).
     */
    host: string;
    /**
     * The proxy host's port.
     */
    port: number;
    /**
     * The user name to authenticate with the proxy, if required.
     */
    username?: string;
    /**
     * The password to authenticate with the proxy, if required.
     */
    password?: string;
}
/**
 * Each form data entry can be a string, Blob, or a File. If you wish to pass a file with a name but do not have
 * access to the File class, you can use the createFile helper to create one.
 */
export type FormDataValue = string | Blob | File;
/**
 * A simple object that provides form data, as if from a browser form.
 */
export type FormDataMap = {
    [key: string]: FormDataValue | FormDataValue[];
};
/**
 * Options that control how to retry failed requests.
 */
export interface PipelineRetryOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * The amount of delay in milliseconds between retry attempts. Defaults to 1000
     * (1 second). The delay increases exponentially with each retry up to a maximum
     * specified by maxRetryDelayInMs.
     */
    retryDelayInMs?: number;
    /**
     * The maximum delay in milliseconds allowed before retrying an operation. Defaults
     * to 64000 (64 seconds).
     */
    maxRetryDelayInMs?: number;
}
/**
 * Represents a certificate credential for authentication.
 */
export interface CertificateCredential {
    /**
     * Optionally override the trusted CA certificates. Default is to trust
     * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
     * replaced when CAs are explicitly specified using this option.
     */
    ca?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     *  Cert chains in PEM format. One cert chain should be provided per
     *  private key. Each cert chain should consist of the PEM formatted
     *  certificate for a provided private key, followed by the PEM
     *  formatted intermediate certificates (if any), in order, and not
     *  including the root CA (the root CA must be pre-known to the peer,
     *  see ca). When providing multiple cert chains, they do not have to
     *  be in the same order as their private keys in key. If the
     *  intermediate certificates are not provided, the peer will not be
     *  able to validate the certificate, and the handshake will fail.
     */
    cert?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     * Private keys in PEM format. PEM allows the option of private keys
     * being encrypted. Encrypted keys will be decrypted with
     * options.passphrase. Multiple keys using different algorithms can be
     * provided either as an array of unencrypted key strings or buffers,
     * or an array of objects in the form `{pem: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted keys will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    key?: string | Buffer | Array<Buffer | KeyObject> | undefined;
    /**
     * Shared passphrase used for a single private key and/or a PFX.
     */
    passphrase?: string | undefined;
    /**
     * PFX or PKCS12 encoded private key and certificate chain. pfx is an
     * alternative to providing key and cert individually. PFX is usually
     * encrypted, if it is, passphrase will be used to decrypt it. Multiple
     * PFX can be provided either as an array of unencrypted PFX buffers,
     * or an array of objects in the form `{buf: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted PFX will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    pfx?: string | Buffer | Array<string | Buffer | PxfObject> | undefined;
}
/**
 * Represents a certificate for TLS authentication.
 */
export interface TlsSettings {
    /**
     * Optionally override the trusted CA certificates. Default is to trust
     * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
     * replaced when CAs are explicitly specified using this option.
     */
    ca?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     *  Cert chains in PEM format. One cert chain should be provided per
     *  private key. Each cert chain should consist of the PEM formatted
     *  certificate for a provided private key, followed by the PEM
     *  formatted intermediate certificates (if any), in order, and not
     *  including the root CA (the root CA must be pre-known to the peer,
     *  see ca). When providing multiple cert chains, they do not have to
     *  be in the same order as their private keys in key. If the
     *  intermediate certificates are not provided, the peer will not be
     *  able to validate the certificate, and the handshake will fail.
     */
    cert?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     * Private keys in PEM format. PEM allows the option of private keys
     * being encrypted. Encrypted keys will be decrypted with
     * options.passphrase. Multiple keys using different algorithms can be
     * provided either as an array of unencrypted key strings or buffers,
     * or an array of objects in the form `{pem: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted keys will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    key?: string | Buffer | Array<Buffer | KeyObject> | undefined;
    /**
     * Shared passphrase used for a single private key and/or a PFX.
     */
    passphrase?: string | undefined;
    /**
     * PFX or PKCS12 encoded private key and certificate chain. pfx is an
     * alternative to providing key and cert individually. PFX is usually
     * encrypted, if it is, passphrase will be used to decrypt it. Multiple
     * PFX can be provided either as an array of unencrypted PFX buffers,
     * or an array of objects in the form `{buf: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted PFX will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    pfx?: string | Buffer | Array<string | Buffer | PxfObject> | undefined;
}
/**
 * An interface compatible with NodeJS's `tls.KeyObject`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export interface KeyObject {
    /**
     * Private keys in PEM format.
     */
    pem: string | Buffer;
    /**
     * Optional passphrase.
     */
    passphrase?: string | undefined;
}
/**
 * An interface compatible with NodeJS's `tls.PxfObject`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export interface PxfObject {
    /**
     * PFX or PKCS12 encoded private key and certificate chain.
     */
    buf: string | Buffer;
    /**
     * Optional passphrase.
     */
    passphrase?: string | undefined;
}
//# sourceMappingURL=interfaces.d.ts.map