import { ApiResponse } from '@qdrant/openapi-typescript-fetch';
declare class CustomError extends Error {
    constructor(message: string);
}
export declare class QdrantClientUnexpectedResponseError extends CustomError {
    static forResponse(response: ApiResponse<unknown>): QdrantClientUnexpectedResponseError;
}
export declare class QdrantClientConfigError extends CustomError {
}
export declare class QdrantClientTimeoutError extends CustomError {
}
export declare class QdrantClientResourceExhaustedError extends CustomError {
    retry_after: number;
    constructor(message: string, retryAfter: string);
}
export {};
