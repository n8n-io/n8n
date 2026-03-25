import type { FormDataMap, HttpHeaders, HttpMethods, MultipartRequestBody, PipelineRequest, ProxySettings, RequestBodyType, TransferProgressEvent } from "./interfaces.js";
import { AuthScheme } from "./auth/schemes.js";
/**
 * Settings to initialize a request.
 * Almost equivalent to Partial<PipelineRequest>, but url is mandatory.
 */
export interface PipelineRequestOptions {
    /**
     * The URL to make the request to.
     */
    url: string;
    /**
     * The HTTP method to use when making the request.
     */
    method?: HttpMethods;
    /**
     * The HTTP headers to use when making the request.
     */
    headers?: HttpHeaders;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * If the request is terminated, an `AbortError` is thrown.
     * Defaults to 0, which disables the timeout.
     */
    timeout?: number;
    /**
     * If credentials (cookies) should be sent along during an XHR.
     * Defaults to false.
     */
    withCredentials?: boolean;
    /**
     * A unique identifier for the request. Used for logging and tracing.
     */
    requestId?: string;
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
     */
    streamResponseStatusCodes?: Set<number>;
    /**
     * BROWSER ONLY
     *
     * A browser only option to enable use of the Streams API. If this option is set and streaming is used
     * (see `streamResponseStatusCodes`), the response will have a property `browserStream` instead of
     * `blobBody` which will be undefined.
     *
     * Default value is false
     */
    enableBrowserStreams?: boolean;
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
     * List of authentication schemes used for this specific request.
     * These schemes define how the request will be authenticated.
     *
     * If values are provided, these schemes override the client level authentication schemes.
     * If an empty array is provided, it explicitly specifies no authentication for the request.
     * If not provided at the request level, the client level authentication schemes will be used.
     */
    authSchemes?: AuthScheme[];
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
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
export declare function createPipelineRequest(options: PipelineRequestOptions): PipelineRequest;
//# sourceMappingURL=pipelineRequest.d.ts.map