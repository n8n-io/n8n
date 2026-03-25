"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeaviateUnauthenticatedError = exports.WeaviateInsufficientPermissionsError = exports.WeaviateRequestTimeoutError = exports.WeaviateStartUpError = exports.WeaviateUnsupportedFeatureError = exports.WeaviateBackupCancellationError = exports.WeaviateBackupCanceled = exports.WeaviateBackupFailed = exports.WeaviateUnexpectedResponseError = exports.WeaviateUnexpectedStatusCodeError = exports.WeaviateSerializationError = exports.WeaviateDeserializationError = exports.WeaviateGRPCUnavailableError = exports.WeaviateBatchError = exports.WeaviateTenantsGetError = exports.WeaviateDeleteManyError = exports.WeaviateQueryError = exports.WeaviateInvalidInputError = void 0;
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
class WeaviateInvalidInputError extends WeaviateError {
    constructor(message) {
        super(`Invalid input provided: ${message}`);
    }
}
exports.WeaviateInvalidInputError = WeaviateInvalidInputError;
/**
 * Is thrown if a query (either gRPC or GraphQL) to Weaviate fails in any way.
 */
class WeaviateQueryError extends WeaviateError {
    constructor(message, protocolType) {
        super(`Query call with protocol ${protocolType} failed with message: ${message}`);
    }
}
exports.WeaviateQueryError = WeaviateQueryError;
/**
 * Is thrown if a gRPC delete many request to Weaviate fails in any way.
 */
class WeaviateDeleteManyError extends WeaviateError {
    constructor(message) {
        super(`Delete many failed with message: ${message}`);
    }
}
exports.WeaviateDeleteManyError = WeaviateDeleteManyError;
/**
 * Is thrown if a gRPC tenants get to Weaviate fails in any way.
 */
class WeaviateTenantsGetError extends WeaviateError {
    constructor(message) {
        super(`Tenants get failed with message: ${message}`);
    }
}
exports.WeaviateTenantsGetError = WeaviateTenantsGetError;
/**
 * Is thrown if a gRPC batch query to Weaviate fails in any way.
 */
class WeaviateBatchError extends WeaviateError {
    constructor(message) {
        super(`Batch objects insert failed with message: ${message}`);
    }
}
exports.WeaviateBatchError = WeaviateBatchError;
/**
 * Is thrown if the gRPC health check against Weaviate fails.
 */
class WeaviateGRPCUnavailableError extends WeaviateError {
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
exports.WeaviateGRPCUnavailableError = WeaviateGRPCUnavailableError;
/**
 * Is thrown if data returned by Weaviate cannot be processed by the client.
 */
class WeaviateDeserializationError extends WeaviateError {
    constructor(message) {
        super(`Converting data from Weaviate failed with message: ${message}`);
    }
}
exports.WeaviateDeserializationError = WeaviateDeserializationError;
/**
 * Is thrown if data to be sent to Weaviate cannot be processed by the client.
 */
class WeaviateSerializationError extends WeaviateError {
    constructor(message) {
        super(`Converting data to Weaviate failed with message: ${message}`);
    }
}
exports.WeaviateSerializationError = WeaviateSerializationError;
/**
 * Is thrown if Weaviate returns an unexpected status code.
 */
class WeaviateUnexpectedStatusCodeError extends WeaviateError {
    constructor(code, message) {
        super(`The request to Weaviate failed with status code: ${code} and message: ${message}`);
        this.code = code;
    }
}
exports.WeaviateUnexpectedStatusCodeError = WeaviateUnexpectedStatusCodeError;
class WeaviateUnexpectedResponseError extends WeaviateError {
    constructor(message) {
        super(`The response from Weaviate was unexpected: ${message}`);
    }
}
exports.WeaviateUnexpectedResponseError = WeaviateUnexpectedResponseError;
/**
 * Is thrown when a backup creation or restoration fails.
 */
class WeaviateBackupFailed extends WeaviateError {
    constructor(message, kind) {
        super(`Backup ${kind} failed with message: ${message}`);
    }
}
exports.WeaviateBackupFailed = WeaviateBackupFailed;
/**
 * Is thrown when a backup creation or restoration fails.
 */
class WeaviateBackupCanceled extends WeaviateError {
    constructor(kind) {
        super(`Backup ${kind} was canceled`);
    }
}
exports.WeaviateBackupCanceled = WeaviateBackupCanceled;
class WeaviateBackupCancellationError extends WeaviateError {
    constructor(message) {
        super(`Backup cancellation failed with message: ${message}`);
    }
}
exports.WeaviateBackupCancellationError = WeaviateBackupCancellationError;
/**
 * Is thrown if the Weaviate server does not support a feature that the client is trying to use.
 */
class WeaviateUnsupportedFeatureError extends WeaviateError {
}
exports.WeaviateUnsupportedFeatureError = WeaviateUnsupportedFeatureError;
/**
 * Is thrown if the Weaviate server was not able to start up.
 */
class WeaviateStartUpError extends WeaviateError {
    constructor(message) {
        super(`Weaviate startup failed with message: ${message}`);
    }
}
exports.WeaviateStartUpError = WeaviateStartUpError;
/**
 * Is thrown if a request to Weaviate times out.
 */
class WeaviateRequestTimeoutError extends WeaviateError {
    constructor(message) {
        super(`Weaviate request timed out with message: ${message}`);
    }
}
exports.WeaviateRequestTimeoutError = WeaviateRequestTimeoutError;
/**
 * Is thrown if a request to Weaviate fails with a forbidden status code due to insufficient permissions.
 */
class WeaviateInsufficientPermissionsError extends WeaviateError {
    constructor(code, message) {
        super(`Forbidden: ${message}`);
        this.code = code;
    }
}
exports.WeaviateInsufficientPermissionsError = WeaviateInsufficientPermissionsError;
class WeaviateUnauthenticatedError extends WeaviateError {
    constructor(message) {
        super(`Unauthenticated: ${message}`);
    }
}
exports.WeaviateUnauthenticatedError = WeaviateUnauthenticatedError;
