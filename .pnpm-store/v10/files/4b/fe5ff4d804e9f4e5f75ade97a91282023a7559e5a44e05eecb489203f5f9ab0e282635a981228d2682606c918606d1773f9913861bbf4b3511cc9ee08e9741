import type { OperationArguments, OperationRequest, OperationSpec, SerializerOptions, XmlOptions } from "./interfaces.js";
import type { PipelinePolicy } from "@azure/core-rest-pipeline";
/**
 * The programmatic identifier of the serializationPolicy.
 */
export declare const serializationPolicyName = "serializationPolicy";
/**
 * Options to configure API request serialization.
 */
export interface SerializationPolicyOptions {
    /**
     * A function that is able to write XML. Required for XML support.
     */
    stringifyXML?: (obj: any, opts?: XmlOptions) => string;
    /**
     * Configures behavior of xml parser and builder.
     */
    serializerOptions?: SerializerOptions;
}
/**
 * This policy handles assembling the request body and headers using
 * an OperationSpec and OperationArguments on the request.
 */
export declare function serializationPolicy(options?: SerializationPolicyOptions): PipelinePolicy;
/**
 * @internal
 */
export declare function serializeHeaders(request: OperationRequest, operationArguments: OperationArguments, operationSpec: OperationSpec): void;
/**
 * @internal
 */
export declare function serializeRequestBody(request: OperationRequest, operationArguments: OperationArguments, operationSpec: OperationSpec, stringifyXML?: (obj: any, opts?: XmlOptions) => string): void;
//# sourceMappingURL=serializationPolicy.d.ts.map