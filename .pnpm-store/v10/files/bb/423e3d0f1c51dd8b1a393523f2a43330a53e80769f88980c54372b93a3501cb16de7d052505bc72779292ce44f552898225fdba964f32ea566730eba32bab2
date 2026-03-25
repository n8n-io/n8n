import { BasePineconeError } from './base';
import type { ErrorContext } from '../pinecone-generated-ts-fetch/db_control';
/**
 * This error is thrown when the client attempts to make a
 * request and never receives any response.
 *
 * This could be due to:
 * - Network problems which prevent the request from being completed.
 * - An outage of Pinecone's APIs. See [Pinecone's status page](https://status.pinecone.io/) to find out whether there is an ongoing incident.
 *
 * The `cause` property will contain a reference to the underlying error. Inspect its value to find out more about the root cause of the error.
 * ```
 * import { Pinecone } from '@pinecone-database/pinecone';
 *
 * const p = new Pinecone({ apiKey: 'invalid-api-key-value' })
 *
 * try {
 *  await p.listIndexes();
 * } catch (e) {
 *  console.log(e.name); // PineconeConnectionError
 *  console.log(e.cause); // Error [FetchError]: The request failed and the interceptors did not return an alternative response
 *  console.log(e.cause.cause); // TypeError: fetch failed
 *  console.log(e.cause.cause.cause); // Error: getaddrinfo ENOTFOUND controller.wrong-environment.pinecone.io
 * }
 * ```
 *
 * @see [Pinecone's status page](https://status.pinecone.io/)
 * */
export declare class PineconeConnectionError extends BasePineconeError {
    constructor(e: Error, url?: string);
}
/**
 * This error is thrown any time a request to the Pinecone API fails.
 *
 * The `cause` property will contain a reference to the underlying error. Inspect its value to find out more about the root cause.
 */
export declare class PineconeRequestError extends BasePineconeError {
    constructor(context: ErrorContext);
}
