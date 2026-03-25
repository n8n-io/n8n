import { BasePineconeError } from './base';
/** @internal */
export type FailedRequestInfo = {
    status: number;
    url?: string;
    body?: string;
    message?: string;
};
/** This error is thrown when API requests return with status 400. Typically this is due to some aspect of the request being incorrect or invalid.
 *
 * Some examples when this error could occur:
 * - While attempting to create an index with no available quota in your project.
 * - While upserting records that do not match the `dimension` of your index
 * - While attempting to create an index using an invalid name ("!@#$%")
 */
export declare class PineconeBadRequestError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/**
 * This error occurs when API requests are attempted using invalid configurations such as a mispelled or revoked API key.
 *
 * Log in to https://app.pinecone.io to verify you have configured the { @link Pinecone }
 * client using the correct values.
 */
export declare class PineconeAuthorizationError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/**
 * This error is thrown when interacting with a resource such as an index or collection
 * that cannot be found.
 */
export declare class PineconeNotFoundError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/**
 * This error is thrown when attempting to create a resource such as an index or
 * collection with a name that is already in use.
 * */
export declare class PineconeConflictError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/**
 * This error indicates API responses are returning with status 500 and
 * something is wrong with Pinecone. Check the [status page](https://status.pinecone.io/)
 * for information about current or recent outages.
 *
 * @see [Pinecone's status page](https://status.pinecone.io/)
 */
export declare class PineconeInternalServerError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
export declare class PineconeMaxRetriesExceededError extends BasePineconeError {
    constructor(retries: number);
}
/**
 * This error indicates API responses are returning with status 503 and
 * Pinecone itself is down. Check the [status page](https://status.pinecone.io/)
 * for information about current or recent outages.
 *
 * The difference between this error (503) and a PineconeInternalServerError (500) is that this error does NOT indicate
 * that the server is _unable_ to process the request, just that the server will not process the request.
 *
 * @see [Pinecone's status page](https://status.pinecone.io/)
 */
export declare class PineconeUnavailableError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/**
 * This error is thrown when you are attempting to use a feature that is
 * not implemented or unavailable to you on your current plan. Free indexes
 * only support a subset of Pinecone's capabilities, and if you are seeing
 * these exceptions then you should consult the
 * [pricing page](https://www.pinecone.io/pricing/) to see whether upgrading
 * makes sense for your use case.
 */
export declare class PineconeNotImplementedError extends BasePineconeError {
    constructor(requestInfo: FailedRequestInfo);
}
/**
 * This catch-all exception is thrown when a request error that is not
 * specifically mapped to another exception is thrown.
 */
export declare class PineconeUnmappedHttpError extends BasePineconeError {
    constructor(failedRequest: FailedRequestInfo);
}
/** @internal */
export declare const mapHttpStatusError: (failedRequestInfo: FailedRequestInfo) => PineconeBadRequestError | PineconeAuthorizationError | PineconeNotFoundError | PineconeConflictError | PineconeInternalServerError | PineconeUnavailableError | PineconeNotImplementedError;
