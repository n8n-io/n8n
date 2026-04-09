/**
 * Common error response for all Azure Resource Manager APIs to return error details for failed
 * operations. (This also follows the OData error response format.).
 */
export interface ErrorResponse {
    /** The error object. */
    error?: ErrorDetail;
}
/** The error detail. */
export interface ErrorDetail {
    /**
     * The error code. NOTE: This property will not be serialized. It can only be populated by the
     * server.
     */
    readonly code?: string;
    /**
     * The error message. NOTE: This property will not be serialized. It can only be populated by the
     * server.
     */
    readonly message?: string;
    /**
     * The error target. NOTE: This property will not be serialized. It can only be populated by the
     * server.
     */
    readonly target?: string;
    /**
     * The error details. NOTE: This property will not be serialized. It can only be populated by the
     * server.
     */
    readonly details?: ErrorDetail[];
    /**
     * The error additional info. NOTE: This property will not be serialized. It can only be populated
     * by the server.
     */
    readonly additionalInfo?: ErrorAdditionalInfo[];
}
/** The resource management error additional info. */
export interface ErrorAdditionalInfo {
    /**
     * The additional info type. NOTE: This property will not be serialized. It can only be populated
     * by the server.
     */
    readonly type?: string;
    /**
     * The additional info. NOTE: This property will not be serialized. It can only be populated by
     * the server.
     */
    readonly info?: Record<string, unknown>;
}
//# sourceMappingURL=errorModels.d.ts.map