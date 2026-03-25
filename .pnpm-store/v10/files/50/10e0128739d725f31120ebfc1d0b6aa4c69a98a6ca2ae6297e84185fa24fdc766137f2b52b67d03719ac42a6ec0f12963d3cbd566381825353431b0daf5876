// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { retryPolicy } from "@azure/core-rest-pipeline";
import { calculateRetryDelay } from "@azure/core-util";
// Matches the default retry configuration in expontentialRetryStrategy.ts
const DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 1000 * 64;
// For 410 responses, we need at least 70 seconds total retry duration
// With 5 retries using exponential backoff: delays of d, 2d, 4d, 8d, 16d sum to 31d
// Accounting for jitter (which can reduce delays by 20%), we need 31d * 0.8 >= 70
// So we need d >= 70/24.8 = 2.82 seconds. Using 3 seconds to be safe.
const MIN_DELAY_FOR_410_MS = 3000;
/**
 * An additional policy that retries on 404 and 410 errors. The default retry policy does not retry on
 * 404s or 410s, but the IMDS endpoint can return these when the token is not yet available or when
 * the identity is still being set up. This policy will retry on 404s and 410s with an exponential backoff.
 * For 410 responses, it uses a minimum 3-second initial delay to ensure at least 70 seconds total duration.
 *
 * @param msiRetryConfig - The retry configuration for the MSI credential.
 * @returns - The policy that will retry on 404s and 410s.
 */
export function imdsRetryPolicy(msiRetryConfig) {
    return retryPolicy([
        {
            name: "imdsRetryPolicy",
            retry: ({ retryCount, response }) => {
                if (response?.status !== 404 && response?.status !== 410) {
                    return { skipStrategy: true };
                }
                // For 410 responses, use a minimum 3-second delay to ensure at least 70 seconds total retry duration
                const initialDelayMs = response?.status === 410
                    ? Math.max(MIN_DELAY_FOR_410_MS, msiRetryConfig.startDelayInMs)
                    : msiRetryConfig.startDelayInMs;
                return calculateRetryDelay(retryCount, {
                    retryDelayInMs: initialDelayMs,
                    maxRetryDelayInMs: DEFAULT_CLIENT_MAX_RETRY_INTERVAL,
                });
            },
        },
    ], {
        maxRetries: msiRetryConfig.maxRetries,
    });
}
//# sourceMappingURL=imdsRetryPolicy.js.map