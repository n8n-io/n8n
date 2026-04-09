import type { DeserializationPolicyOptions } from "./deserializationPolicy.js";
import type { InternalPipelineOptions, Pipeline } from "@azure/core-rest-pipeline";
import type { SerializationPolicyOptions } from "./serializationPolicy.js";
import type { TokenCredential } from "@azure/core-auth";
/**
 * Options for creating a Pipeline to use with ServiceClient.
 * Mostly for customizing the auth policy (if using token auth) or
 * the deserialization options when using XML.
 */
export interface InternalClientPipelineOptions extends InternalPipelineOptions {
    /**
     * Options to customize bearerTokenAuthenticationPolicy.
     */
    credentialOptions?: {
        credentialScopes: string | string[];
        credential: TokenCredential;
    };
    /**
     * Options to customize deserializationPolicy.
     */
    deserializationOptions?: DeserializationPolicyOptions;
    /**
     * Options to customize serializationPolicy.
     */
    serializationOptions?: SerializationPolicyOptions;
}
/**
 * Creates a new Pipeline for use with a Service Client.
 * Adds in deserializationPolicy by default.
 * Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
 * @param options - Options to customize the created pipeline.
 */
export declare function createClientPipeline(options?: InternalClientPipelineOptions): Pipeline;
//# sourceMappingURL=pipeline.d.ts.map