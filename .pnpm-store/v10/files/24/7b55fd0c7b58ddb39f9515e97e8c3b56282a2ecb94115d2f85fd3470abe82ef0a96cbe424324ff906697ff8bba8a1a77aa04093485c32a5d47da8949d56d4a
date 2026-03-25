import type { AxiosError, AxiosRequestConfig, AxiosInstance, AxiosStatic, AxiosResponse } from 'axios';
export interface IAxiosRetryConfig {
    /**
     * The number of times to retry before failing
     * default: 3
     */
    retries?: number;
    /**
     * Defines if the timeout should be reset between retries
     * default: false
     */
    shouldResetTimeout?: boolean;
    /**
     * A callback to further control if a request should be retried.
     * default: it retries if it is a network error or a 5xx error on an idempotent request (GET, HEAD, OPTIONS, PUT or DELETE).
     */
    retryCondition?: (error: AxiosError) => boolean | Promise<boolean>;
    /**
     * A callback to further control the delay between retry requests. By default there is no delay.
     */
    retryDelay?: (retryCount: number, error: AxiosError) => number;
    /**
     * A callback to get notified when a retry occurs, the number of times it has occurred, and the error
     */
    onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void> | void;
    /**
     * After all the retries are failed, this callback will be called with the last error
     * before throwing the error.
     */
    onMaxRetryTimesExceeded?: (error: AxiosError, retryCount: number) => Promise<void> | void;
    /**
     * A callback to define whether a response should be resolved or rejected. If null is passed, it will fallback to
     * the axios default (only 2xx status codes are resolved).
     */
    validateResponse?: ((response: AxiosResponse) => boolean) | null;
}
export interface IAxiosRetryConfigExtended extends IAxiosRetryConfig {
    /**
     * The number of times the request was retried
     */
    retryCount?: number;
    /**
     * The last time the request was retried (timestamp in milliseconds)
     */
    lastRequestTime?: number;
}
export interface IAxiosRetryReturn {
    /**
     * The interceptorId for the request interceptor
     */
    requestInterceptorId: number;
    /**
     * The interceptorId for the response interceptor
     */
    responseInterceptorId: number;
}
export interface AxiosRetry {
    (axiosInstance: AxiosStatic | AxiosInstance, axiosRetryConfig?: IAxiosRetryConfig): IAxiosRetryReturn;
    isNetworkError(error: AxiosError): boolean;
    isRetryableError(error: AxiosError): boolean;
    isSafeRequestError(error: AxiosError): boolean;
    isIdempotentRequestError(error: AxiosError): boolean;
    isNetworkOrIdempotentRequestError(error: AxiosError): boolean;
    exponentialDelay(retryNumber?: number, error?: AxiosError, delayFactor?: number): number;
    linearDelay(delayFactor?: number): (retryNumber: number, error: AxiosError | undefined) => number;
}
declare module 'axios' {
    interface AxiosRequestConfig {
        'axios-retry'?: IAxiosRetryConfigExtended;
    }
}
export declare const namespace = "axios-retry";
export declare function isNetworkError(error: any): boolean;
export declare function isRetryableError(error: AxiosError): boolean;
export declare function isSafeRequestError(error: AxiosError): boolean;
export declare function isIdempotentRequestError(error: AxiosError): boolean;
export declare function isNetworkOrIdempotentRequestError(error: AxiosError): boolean;
export declare function retryAfter(error?: AxiosError | undefined): number;
export declare function exponentialDelay(retryNumber?: number, error?: AxiosError | undefined, delayFactor?: number): number;
/**
 * Linear delay
 * @param {number | undefined} delayFactor - delay factor in milliseconds (default: 100)
 * @returns {function} (retryNumber: number, error: AxiosError | undefined) => number
 */
export declare function linearDelay(delayFactor?: number | undefined): (retryNumber: number, error: AxiosError | undefined) => number;
export declare const DEFAULT_OPTIONS: Required<IAxiosRetryConfig>;
declare const axiosRetry: AxiosRetry;
export default axiosRetry;
