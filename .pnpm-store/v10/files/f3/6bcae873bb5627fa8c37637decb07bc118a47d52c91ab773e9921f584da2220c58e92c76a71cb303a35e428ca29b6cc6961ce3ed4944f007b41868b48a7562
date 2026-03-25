class WeaviateError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
/**
 * Is thrown if the input to a function is invalid.
 */
export class WeaviateInvalidInputError extends WeaviateError {
    constructor(message) {
        super(`Invalid input provided: ${message}`);
    }
}
/**
 * Is thrown if a query (either gRPC or GraphQL) to Weaviate fails in any way.
 */
export class WeaviateQueryError extends WeaviateError {
    constructor(message, protocolType) {
        super(`Query call with protocol ${protocolType} failed with message: ${message}`);
    }
}
/**
 * Is thrown if a gRPC delete many request to Weaviate fails in any way.
 */
export class WeaviateDeleteManyError extends WeaviateError {
    constructor(message) {
        super(`Delete many failed with message: ${message}`);
    }
}
/**
 * Is thrown if a gRPC tenants get to Weaviate fails in any way.
 */
export class WeaviateTenantsGetError extends WeaviateError {
    constructor(message) {
        super(`Tenants get failed with message: ${message}`);
    }
}
/**
 * Is thrown if a gRPC batch query to Weaviate fails in any way.
 */
export class WeaviateBatchError extends WeaviateError {
    constructor(message) {
        super(`Batch objects insert failed with message: ${message}`);
    }
}
/**
 * Is thrown if the gRPC health check against Weaviate fails.
 */
export class WeaviateGRPCUnavailableError extends WeaviateError {
    constructor(address) {
        const grpcMsg = `Please check that the server address and port: ${address} are correct.`;
        const msg = `Weaviate makes use of a high-speed gRPC API as well as a REST API.
      Unfortunately, the gRPC health check against Weaviate could not be completed.

      This error could be due to one of several reasons:
        - The gRPC traffic at the specified port is blocked by a firewall.
        - gRPC is not enabled or incorrectly configured on the server or the client.
            - ${grpcMsg}
        - your connection is unstable or has a high latency. In this case you can:
            - increase init-timeout in weaviate.connectToLocal({timeout: {init: X}})'
            - disable startup checks by connecting using 'skipInitChecks=true'
    `;
        super(msg);
    }
}
/**
 * Is thrown if data returned by Weaviate cannot be processed by the client.
 */
export class WeaviateDeserializationError extends WeaviateError {
    constructor(message) {
        super(`Converting data from Weaviate failed with message: ${message}`);
    }
}
/**
 * Is thrown if data to be sent to Weaviate cannot be processed by the client.
 */
export class WeaviateSerializationError extends WeaviateError {
    constructor(message) {
        super(`Converting data to Weaviate failed with message: ${message}`);
    }
}
/**
 * Is thrown if Weaviate returns an unexpected status code.
 */
export class WeaviateUnexpectedStatusCodeError extends WeaviateError {
    constructor(code, message) {
        super(`The request to Weaviate failed with status code: ${code} and message: ${message}`);
        this.code = code;
    }
}
export class WeaviateUnexpectedResponseError extends WeaviateError {
    constructor(message) {
        super(`The response from Weaviate was unexpected: ${message}`);
    }
}
/**
 * Is thrown when a backup creation or restoration fails.
 */
export class WeaviateBackupFailed extends WeaviateError {
    constructor(message, kind) {
        super(`Backup ${kind} failed with message: ${message}`);
    }
}
/**
 * Is thrown when a backup creation or restoration fails.
 */
export class WeaviateBackupCanceled extends WeaviateError {
    constructor(kind) {
        super(`Backup ${kind} was canceled`);
    }
}
export class WeaviateBackupCancellationError extends WeaviateError {
    constructor(message) {
        super(`Backup cancellation failed with message: ${message}`);
    }
}
/**
 * Is thrown if the Weaviate server does not support a feature that the client is trying to use.
 */
export class WeaviateUnsupportedFeatureError extends WeaviateError {
}
/**
 * Is thrown if the Weaviate server was not able to start up.
 */
export class WeaviateStartUpError extends WeaviateError {
    constructor(message) {
        super(`Weaviate startup failed with message: ${message}`);
    }
}
/**
 * Is thrown if a request to Weaviate times out.
 */
export class WeaviateRequestTimeoutError extends WeaviateError {
    constructor(message) {
        super(`Weaviate request timed out with message: ${message}`);
    }
}
/**
 * Is thrown if a request to Weaviate fails with a forbidden status code due to insufficient permissions.
 */
export class WeaviateInsufficientPermissionsError extends WeaviateError {
    constructor(code, message) {
        super(`Forbidden: ${message}`);
        this.code = code;
    }
}
export class WeaviateUnauthenticatedError extends WeaviateError {
    constructor(message) {
        super(`Unauthenticated: ${message}`);
    }
}
