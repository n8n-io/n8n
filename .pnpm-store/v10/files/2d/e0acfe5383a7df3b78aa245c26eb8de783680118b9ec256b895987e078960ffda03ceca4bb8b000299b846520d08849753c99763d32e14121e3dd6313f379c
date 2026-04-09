import { AbortSignalLike } from "@azure/abort-controller";
import { LroError } from "../poller/models.js";
/**
 * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
 */
export type LroResourceLocationConfig = "azure-async-operation" | "location" | "original-uri";
/**
 * The type of a LRO response body. This is just a convenience type for checking the status of the operation.
 */
export interface ResponseBody extends Record<string, unknown> {
    /** The status of the operation. */
    status?: unknown;
    /** The state of the provisioning process */
    provisioningState?: unknown;
    /** The properties of the provisioning process */
    properties?: {
        provisioningState?: unknown;
    } & Record<string, unknown>;
    /** The error if the operation failed */
    error?: Partial<LroError>;
    /** The location of the created resource */
    resourceLocation?: string;
}
/**
 * Simple type of the raw response.
 */
export interface RawResponse {
    /** The HTTP status code */
    statusCode: number;
    /** A HttpHeaders collection in the response represented as a simple JSON object where all header names have been normalized to be lower-case. */
    headers: {
        [headerName: string]: string;
    };
    /** The parsed response body */
    body?: unknown;
}
/**
 * The type of the response of a LRO.
 */
export interface LroResponse<T = unknown> {
    /** The flattened response */
    flatResponse: T;
    /** The raw response */
    rawResponse: RawResponse;
}
/**
 * Description of a long running operation.
 */
export interface LongRunningOperation<T = unknown> {
    /**
     * The request path. This should be set if the operation is a PUT and needs
     * to poll from the same request path.
     */
    requestPath?: string;
    /**
     * The HTTP request method. This should be set if the operation is a PUT or a
     * DELETE.
     */
    requestMethod?: string;
    /**
     * A function that can be used to send initial request to the service.
     */
    sendInitialRequest: () => Promise<LroResponse<unknown>>;
    /**
     * A function that can be used to poll for the current status of a long running operation.
     */
    sendPollRequest: (path: string, options?: {
        abortSignal?: AbortSignalLike;
    }) => Promise<LroResponse<T>>;
}
export type HttpOperationMode = "OperationLocation" | "ResourceLocation" | "Body";
/**
 * Options for `createPoller`.
 */
export interface CreateHttpPollerOptions<TResult, TState> {
    /**
     * Defines how much time the poller is going to wait before making a new request to the service.
     */
    intervalInMs?: number;
    /**
     * A serialized poller which can be used to resume an existing paused Long-Running-Operation.
     */
    restoreFrom?: string;
    /**
     * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
     */
    resourceLocationConfig?: LroResourceLocationConfig;
    /**
     * A function to process the result of the LRO.
     */
    processResult?: (result: unknown, state: TState) => TResult;
    /**
     * A function to process the state of the LRO.
     */
    updateState?: (state: TState, response: LroResponse) => void;
    /**
     * A function to be called each time the operation location is updated by the
     * service.
     */
    withOperationLocation?: (operationLocation: string) => void;
    /**
     * Control whether to throw an exception if the operation failed or was canceled.
     */
    resolveOnUnsuccessful?: boolean;
}
//# sourceMappingURL=models.d.ts.map