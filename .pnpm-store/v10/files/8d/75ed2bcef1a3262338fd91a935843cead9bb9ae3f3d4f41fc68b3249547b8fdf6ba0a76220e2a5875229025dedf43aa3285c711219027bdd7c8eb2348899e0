import type { PipelinePolicy } from "@azure/core-rest-pipeline";
import type { MSIConfiguration } from "./models.js";
/**
 * An additional policy that retries on 404 and 410 errors. The default retry policy does not retry on
 * 404s or 410s, but the IMDS endpoint can return these when the token is not yet available or when
 * the identity is still being set up. This policy will retry on 404s and 410s with an exponential backoff.
 * For 410 responses, it uses a minimum 3-second initial delay to ensure at least 70 seconds total duration.
 *
 * @param msiRetryConfig - The retry configuration for the MSI credential.
 * @returns - The policy that will retry on 404s and 410s.
 */
export declare function imdsRetryPolicy(msiRetryConfig: MSIConfiguration["retryConfig"]): PipelinePolicy;
//# sourceMappingURL=imdsRetryPolicy.d.ts.map