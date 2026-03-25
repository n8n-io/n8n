import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
/**
 * Configuration for the Axios `request` method.
 */
export interface RetryConfig {
    /**
     * The number of times to retry the request.  Defaults to 3.
     */
    retry?: number;
    /**
     * The number of retries already attempted.
     */
    currentRetryAttempt?: number;
    /**
     * The amount of time to initially delay the retry.  Defaults to 100.
     */
    retryDelay?: number;
    /**
     * The instance of the axios object to which the interceptor is attached.
     */
    instance?: AxiosInstance;
    /**
     * The HTTP Methods that will be automatically retried.
     * Defaults to ['GET','PUT','HEAD','OPTIONS','DELETE']
     */
    httpMethodsToRetry?: string[];
    /**
     * The HTTP response status codes that will automatically be retried.
     * Defaults to: [[100, 199], [429, 429], [500, 599]]
     */
    statusCodesToRetry?: number[][];
    /**
     * Function to invoke when a retry attempt is made.
     */
    onRetryAttempt?: (err: AxiosError) => void;
    /**
     * Function to invoke which determines if you should retry
     */
    shouldRetry?: (err: AxiosError) => boolean;
    /**
     * When there is no response, the number of retries to attempt. Defaults to 2.
     */
    noResponseRetries?: number;
    /**
     * Backoff Type; 'linear', 'static' or 'exponential'.
     */
    backoffType?: 'linear' | 'static' | 'exponential';
    /**
     * Whether to check for 'Retry-After' header in response and use value as delay. Defaults to true.
     */
    checkRetryAfter?: boolean;
    /**
     * Max permitted Retry-After value (in ms) - rejects if greater. Defaults to 5 mins.
     */
    maxRetryAfter?: number;
    /**
     * Ceiling for calculated delay (in ms) - delay will not exceed this value.
     */
    maxRetryDelay?: number;
}
export declare type RaxConfig = {
    raxConfig: RetryConfig;
} & AxiosRequestConfig;
/**
 * Attach the interceptor to the Axios instance.
 * @param instance The optional Axios instance on which to attach the
 * interceptor.
 * @returns The id of the interceptor attached to the axios instance.
 */
export declare function attach(instance?: AxiosInstance): number;
/**
 * Eject the Axios interceptor that is providing retry capabilities.
 * @param interceptorId The interceptorId provided in the config.
 * @param instance The axios instance using this interceptor.
 */
export declare function detach(interceptorId: number, instance?: AxiosInstance): void;
/**
 * Determine based on config if we should retry the request.
 * @param err The AxiosError passed to the interceptor.
 */
export declare function shouldRetryRequest(err: AxiosError): boolean;
/**
 * Acquire the raxConfig object from an AxiosError if available.
 * @param err The Axios error with a config object.
 */
export declare function getConfig(err: AxiosError): RetryConfig | undefined;
declare module 'axios' {
    interface AxiosRequestConfig {
        raxConfig?: RetryConfig;
    }
}
