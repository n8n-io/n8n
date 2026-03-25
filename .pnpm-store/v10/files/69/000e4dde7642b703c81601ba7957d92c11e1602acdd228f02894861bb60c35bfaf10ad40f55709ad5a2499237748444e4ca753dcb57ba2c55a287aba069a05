declare class WeaviateError extends Error {
    message: string;
    constructor(message: string);
}
/**
 * Is thrown if the input to a function is invalid.
 */
export declare class WeaviateInvalidInputError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if a query (either gRPC or GraphQL) to Weaviate fails in any way.
 */
export declare class WeaviateQueryError extends WeaviateError {
    constructor(message: string, protocolType: 'GraphQL' | 'gRPC');
}
/**
 * Is thrown if a gRPC delete many request to Weaviate fails in any way.
 */
export declare class WeaviateDeleteManyError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if a gRPC tenants get to Weaviate fails in any way.
 */
export declare class WeaviateTenantsGetError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if a gRPC batch query to Weaviate fails in any way.
 */
export declare class WeaviateBatchError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if the gRPC health check against Weaviate fails.
 */
export declare class WeaviateGRPCUnavailableError extends WeaviateError {
    constructor(address: string);
}
/**
 * Is thrown if data returned by Weaviate cannot be processed by the client.
 */
export declare class WeaviateDeserializationError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if data to be sent to Weaviate cannot be processed by the client.
 */
export declare class WeaviateSerializationError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if Weaviate returns an unexpected status code.
 */
export declare class WeaviateUnexpectedStatusCodeError extends WeaviateError {
    code: number;
    constructor(code: number, message: string);
}
export declare class WeaviateUnexpectedResponseError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown when a backup creation or restoration fails.
 */
export declare class WeaviateBackupFailed extends WeaviateError {
    constructor(message: string, kind: 'creation' | 'restoration');
}
/**
 * Is thrown when a backup creation or restoration fails.
 */
export declare class WeaviateBackupCanceled extends WeaviateError {
    constructor(kind: 'creation' | 'restoration');
}
export declare class WeaviateBackupCancellationError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if the Weaviate server does not support a feature that the client is trying to use.
 */
export declare class WeaviateUnsupportedFeatureError extends WeaviateError {
}
/**
 * Is thrown if the Weaviate server was not able to start up.
 */
export declare class WeaviateStartUpError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if a request to Weaviate times out.
 */
export declare class WeaviateRequestTimeoutError extends WeaviateError {
    constructor(message: string);
}
/**
 * Is thrown if a request to Weaviate fails with a forbidden status code due to insufficient permissions.
 */
export declare class WeaviateInsufficientPermissionsError extends WeaviateError {
    code: number;
    constructor(code: number, message: string);
}
export declare class WeaviateUnauthenticatedError extends WeaviateError {
    constructor(message: string);
}
export {};
