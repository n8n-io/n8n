import type { PipelineRetryOptions } from "../interfaces.js";
import type { PipelinePolicy } from "../pipeline.js";
/**
 * Name of the {@link defaultRetryPolicy}
 */
export declare const defaultRetryPolicyName = "defaultRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export interface DefaultRetryPolicyOptions extends PipelineRetryOptions {
}
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
export declare function defaultRetryPolicy(options?: DefaultRetryPolicyOptions): PipelinePolicy;
//# sourceMappingURL=defaultRetryPolicy.d.ts.map