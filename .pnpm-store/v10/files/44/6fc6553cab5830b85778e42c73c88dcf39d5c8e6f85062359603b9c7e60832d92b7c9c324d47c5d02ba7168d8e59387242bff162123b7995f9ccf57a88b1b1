import type { HttpClient, Pipeline } from "@azure/core-rest-pipeline";
import type { KeyCredential, TokenCredential } from "@azure/core-auth";
import type { ClientOptions } from "./common.js";
/**
 * Optional parameters for adding a credential policy to the pipeline.
 */
export interface AddCredentialPipelinePolicyOptions {
    /**
     * Options related to the client.
     */
    clientOptions?: ClientOptions;
    /**
     * The credential to use.
     */
    credential?: TokenCredential | KeyCredential;
}
/**
 * Adds a credential policy to the pipeline if a credential is provided. If none is provided, no policy is added.
 */
export declare function addCredentialPipelinePolicy(pipeline: Pipeline, endpoint: string, options?: AddCredentialPipelinePolicyOptions): void;
/**
 * Creates a default rest pipeline to re-use accross Rest Level Clients
 */
export declare function createDefaultPipeline(endpoint: string, credential?: TokenCredential | KeyCredential, options?: ClientOptions): Pipeline;
export declare function getCachedDefaultHttpsClient(): HttpClient;
//# sourceMappingURL=clientHelpers.d.ts.map