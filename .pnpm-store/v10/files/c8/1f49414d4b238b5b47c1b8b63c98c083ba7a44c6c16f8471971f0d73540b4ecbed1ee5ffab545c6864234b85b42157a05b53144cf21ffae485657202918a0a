import { KeyValuePair, FieldSchema, SparseFloatVector, FieldData } from '../';
import { Pool } from 'generic-pool';
/**
 * Failover handler type for global cluster support.
 * When attached to a pool, promisify will call this on UNAVAILABLE errors
 * after all interceptor retries are exhausted.
 * Should return a new pool to retry with, or null if no failover occurred.
 */
export type FailoverHandler = (error: any) => Promise<Pool<any> | null>;
/** Well-known property key for attaching a failover handler to a pool. */
export declare const FAILOVER_HANDLER_KEY = "__failoverHandler";
/**
 * Attach a failover handler to a pool for global cluster support.
 */
export declare function setPoolFailoverHandler(pool: Pool<any>, handler: FailoverHandler): void;
/**
 * Promisify a function call with optional timeout, metadata, and global cluster failover.
 * @param pool - The pool of gRPC clients
 * @param target - The name of the target function to call
 * @param params - The parameters to pass to the target function (may contain client_request_id or client-request-id)
 * @param timeout - Optional timeout in milliseconds
 * @param requestMetadata - Optional metadata to include in the request (e.g., client-request-id). If not provided, will be extracted from params automatically.
 * @returns A Promise that resolves with the result of the target function call
 */
export declare function promisify(pool: Pool<any>, target: string, params: any, timeout: number, requestMetadata?: {
    'client-request-id'?: string;
    client_request_id?: string;
}): Promise<any>;
export declare const findKeyValue: (obj: KeyValuePair[], key: string) => string | number | undefined;
export declare const sleep: (time: number) => Promise<unknown>;
/**
 * Returns the query iterator expression based on the provided parameters.
 *
 * @param params - The parameters for generating the query iterator expression.
 * @param params.expr - The expression to be combined with the iterator expression.
 * @param params.pkField - The primary key field schema.
 * @param params.page - The current page number.
 * @param params.pageCache - The cache of previous pages.
 * @returns The query iterator expression.
 */
export declare const getQueryIteratorExpr: (params: {
    expr: string;
    pkField: FieldSchema;
    lastPKId: string | number;
}) => string;
export declare const getPKFieldExpr: (data: {
    pkField: FieldSchema;
    value: string | number;
    condition?: string;
    expr?: string;
}) => string;
export declare const getSparseDim: (data: SparseFloatVector[]) => number;
export declare const getValidDataArray: (data: FieldData[], length: number) => boolean[];
/**
 * Extracts request metadata (traceid) from request data.
 * Supports both client_request_id and client-request-id formats.
 * Priority: client_request_id > client-request-id (JavaScript/TypeScript convention)
 * @param data - Request data that may contain traceid
 * @returns Request metadata object or undefined if no traceid provided
 */
export declare const extractRequestMetadata: (data: any) => {
    'client-request-id': string;
} | undefined;
