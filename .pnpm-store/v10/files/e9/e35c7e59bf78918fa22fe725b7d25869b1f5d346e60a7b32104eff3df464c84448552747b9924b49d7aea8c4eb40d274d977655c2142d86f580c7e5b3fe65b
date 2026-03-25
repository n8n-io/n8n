import { SerializerOptions, XmlOptions } from "./interfaces.js";
import { PipelinePolicy } from "@azure/core-rest-pipeline";
/**
 * The programmatic identifier of the deserializationPolicy.
 */
export declare const deserializationPolicyName = "deserializationPolicy";
/**
 * Options to configure API response deserialization.
 */
export interface DeserializationPolicyOptions {
    /**
     * Configures the expected content types for the deserialization of
     * JSON and XML response bodies.
     */
    expectedContentTypes?: DeserializationContentTypes;
    /**
     * A function that is able to parse XML. Required for XML support.
     */
    parseXML?: (str: string, opts?: XmlOptions) => Promise<any>;
    /**
     * Configures behavior of xml parser and builder.
     */
    serializerOptions?: SerializerOptions;
}
/**
 * The content-types that will indicate that an operation response should be deserialized in a
 * particular way.
 */
export interface DeserializationContentTypes {
    /**
     * The content-types that indicate that an operation response should be deserialized as JSON.
     * Defaults to [ "application/json", "text/json" ].
     */
    json?: string[];
    /**
     * The content-types that indicate that an operation response should be deserialized as XML.
     * Defaults to [ "application/xml", "application/atom+xml" ].
     */
    xml?: string[];
}
/**
 * This policy handles parsing out responses according to OperationSpecs on the request.
 */
export declare function deserializationPolicy(options?: DeserializationPolicyOptions): PipelinePolicy;
//# sourceMappingURL=deserializationPolicy.d.ts.map