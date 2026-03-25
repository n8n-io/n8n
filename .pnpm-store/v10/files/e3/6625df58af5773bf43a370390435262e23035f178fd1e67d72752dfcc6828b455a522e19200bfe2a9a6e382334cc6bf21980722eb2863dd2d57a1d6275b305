import { PipelinePolicy } from "@azure/core-rest-pipeline";
import { WebResourceLike } from "../util.js";
import { CompatResponse } from "../response.js";
/**
 * A compatible interface for core-http request policies
 */
export interface RequestPolicy {
    sendRequest(httpRequest: WebResourceLike): Promise<CompatResponse>;
}
/**
 * An enum for compatibility with RequestPolicy
 */
export declare enum HttpPipelineLogLevel {
    ERROR = 1,
    INFO = 3,
    OFF = 0,
    WARNING = 2
}
/**
 * An interface for compatibility with RequestPolicy
 */
export interface RequestPolicyOptionsLike {
    log(logLevel: HttpPipelineLogLevel, message: string): void;
    shouldLog(logLevel: HttpPipelineLogLevel): boolean;
}
/**
 * An interface for compatibility with core-http's RequestPolicyFactory
 */
export interface RequestPolicyFactory {
    create(nextPolicy: RequestPolicy, options: RequestPolicyOptionsLike): RequestPolicy;
}
/**
 * The name of the RequestPolicyFactoryPolicy
 */
export declare const requestPolicyFactoryPolicyName = "RequestPolicyFactoryPolicy";
/**
 * A policy that wraps policies written for core-http.
 * @param factories - An array of `RequestPolicyFactory` objects from a core-http pipeline
 */
export declare function createRequestPolicyFactoryPolicy(factories: RequestPolicyFactory[]): PipelinePolicy;
//# sourceMappingURL=requestPolicyFactoryPolicy.d.ts.map