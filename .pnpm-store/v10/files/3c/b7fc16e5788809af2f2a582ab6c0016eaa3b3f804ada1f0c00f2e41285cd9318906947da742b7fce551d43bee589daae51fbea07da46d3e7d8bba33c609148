import type { HttpClient, PipelineRequest, PipelineResponse, SendRequest } from "./interfaces.js";
/**
 * Policies are executed in phases.
 * The execution order is:
 * 1. Serialize Phase
 * 2. Policies not in a phase
 * 3. Deserialize Phase
 * 4. Retry Phase
 * 5. Sign Phase
 */
export type PipelinePhase = "Deserialize" | "Serialize" | "Retry" | "Sign";
/**
 * Options when adding a policy to the pipeline.
 * Used to express dependencies on other policies.
 */
export interface AddPolicyOptions {
    /**
     * Policies that this policy must come before.
     */
    beforePolicies?: string[];
    /**
     * Policies that this policy must come after.
     */
    afterPolicies?: string[];
    /**
     * The phase that this policy must come after.
     */
    afterPhase?: PipelinePhase;
    /**
     * The phase this policy belongs to.
     */
    phase?: PipelinePhase;
}
/**
 * A pipeline policy manipulates a request as it travels through the pipeline.
 * It is conceptually a middleware that is allowed to modify the request before
 * it is made as well as the response when it is received.
 */
export interface PipelinePolicy {
    /**
     * The policy name. Must be a unique string in the pipeline.
     */
    name: string;
    /**
     * The main method to implement that manipulates a request/response.
     * @param request - The request being performed.
     * @param next - The next policy in the pipeline. Must be called to continue the pipeline.
     */
    sendRequest(request: PipelineRequest, next: SendRequest): Promise<PipelineResponse>;
}
/**
 * Represents a pipeline for making a HTTP request to a URL.
 * Pipelines can have multiple policies to manage manipulating each request
 * before and after it is made to the server.
 */
export interface Pipeline {
    /**
     * Add a new policy to the pipeline.
     * @param policy - A policy that manipulates a request.
     * @param options - A set of options for when the policy should run.
     */
    addPolicy(policy: PipelinePolicy, options?: AddPolicyOptions): void;
    /**
     * Remove a policy from the pipeline.
     * @param options - Options that let you specify which policies to remove.
     */
    removePolicy(options: {
        name?: string;
        phase?: PipelinePhase;
    }): PipelinePolicy[];
    /**
     * Uses the pipeline to make a HTTP request.
     * @param httpClient - The HttpClient that actually performs the request.
     * @param request - The request to be made.
     */
    sendRequest(httpClient: HttpClient, request: PipelineRequest): Promise<PipelineResponse>;
    /**
     * Returns the current set of policies in the pipeline in the order in which
     * they will be applied to the request. Later in the list is closer to when
     * the request is performed.
     */
    getOrderedPolicies(): PipelinePolicy[];
    /**
     * Duplicates this pipeline to allow for modifying an existing one without mutating it.
     */
    clone(): Pipeline;
}
/**
 * Creates a totally empty pipeline.
 * Useful for testing or creating a custom one.
 */
export declare function createEmptyPipeline(): Pipeline;
//# sourceMappingURL=pipeline.d.ts.map