import isRetryAllowed from 'is-retry-allowed';
export const namespace = 'axios-retry';
export function isNetworkError(error) {
    const CODE_EXCLUDE_LIST = ['ERR_CANCELED', 'ECONNABORTED'];
    if (error.response) {
        return false;
    }
    if (!error.code) {
        return false;
    }
    // Prevents retrying timed out & cancelled requests
    if (CODE_EXCLUDE_LIST.includes(error.code)) {
        return false;
    }
    // Prevents retrying unsafe errors
    return isRetryAllowed(error);
}
const SAFE_HTTP_METHODS = ['get', 'head', 'options'];
const IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);
export function isRetryableError(error) {
    return (error.code !== 'ECONNABORTED' &&
        (!error.response ||
            error.response.status === 429 ||
            (error.response.status >= 500 && error.response.status <= 599)));
}
export function isSafeRequestError(error) {
    if (!error.config?.method) {
        // Cannot determine if the request can be retried
        return false;
    }
    return isRetryableError(error) && SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1;
}
export function isIdempotentRequestError(error) {
    if (!error.config?.method) {
        // Cannot determine if the request can be retried
        return false;
    }
    return isRetryableError(error) && IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1;
}
export function isNetworkOrIdempotentRequestError(error) {
    return isNetworkError(error) || isIdempotentRequestError(error);
}
export function retryAfter(error = undefined) {
    const retryAfterHeader = error?.response?.headers['retry-after'];
    if (!retryAfterHeader) {
        return 0;
    }
    // if the retry after header is a number, convert it to milliseconds
    let retryAfterMs = (Number(retryAfterHeader) || 0) * 1000;
    // If the retry after header is a date, get the number of milliseconds until that date
    if (retryAfterMs === 0) {
        retryAfterMs = (new Date(retryAfterHeader).valueOf() || 0) - Date.now();
    }
    return Math.max(0, retryAfterMs);
}
function noDelay(_retryNumber = 0, error = undefined) {
    return Math.max(0, retryAfter(error));
}
export function exponentialDelay(retryNumber = 0, error = undefined, delayFactor = 100) {
    const calculatedDelay = 2 ** retryNumber * delayFactor;
    const delay = Math.max(calculatedDelay, retryAfter(error));
    const randomSum = delay * 0.2 * Math.random(); // 0-20% of the delay
    return delay + randomSum;
}
/**
 * Linear delay
 * @param {number | undefined} delayFactor - delay factor in milliseconds (default: 100)
 * @returns {function} (retryNumber: number, error: AxiosError | undefined) => number
 */
export function linearDelay(delayFactor = 100) {
    return (retryNumber = 0, error = undefined) => {
        const delay = retryNumber * delayFactor;
        return Math.max(delay, retryAfter(error));
    };
}
export const DEFAULT_OPTIONS = {
    retries: 3,
    retryCondition: isNetworkOrIdempotentRequestError,
    retryDelay: noDelay,
    shouldResetTimeout: false,
    onRetry: () => { },
    onMaxRetryTimesExceeded: () => { },
    validateResponse: null
};
function getRequestOptions(config, defaultOptions) {
    return { ...DEFAULT_OPTIONS, ...defaultOptions, ...config[namespace] };
}
function setCurrentState(config, defaultOptions, resetLastRequestTime = false) {
    const currentState = getRequestOptions(config, defaultOptions || {});
    currentState.retryCount = currentState.retryCount || 0;
    if (!currentState.lastRequestTime || resetLastRequestTime) {
        currentState.lastRequestTime = Date.now();
    }
    config[namespace] = currentState;
    return currentState;
}
function fixConfig(axiosInstance, config) {
    // @ts-ignore
    if (axiosInstance.defaults.agent === config.agent) {
        // @ts-ignore
        delete config.agent;
    }
    if (axiosInstance.defaults.httpAgent === config.httpAgent) {
        delete config.httpAgent;
    }
    if (axiosInstance.defaults.httpsAgent === config.httpsAgent) {
        delete config.httpsAgent;
    }
}
async function shouldRetry(currentState, error) {
    const { retries, retryCondition } = currentState;
    const shouldRetryOrPromise = (currentState.retryCount || 0) < retries && retryCondition(error);
    // This could be a promise
    if (typeof shouldRetryOrPromise === 'object') {
        try {
            const shouldRetryPromiseResult = await shouldRetryOrPromise;
            // keep return true unless shouldRetryPromiseResult return false for compatibility
            return shouldRetryPromiseResult !== false;
        }
        catch (_err) {
            return false;
        }
    }
    return shouldRetryOrPromise;
}
async function handleRetry(axiosInstance, currentState, error, config) {
    currentState.retryCount += 1;
    const { retryDelay, shouldResetTimeout, onRetry } = currentState;
    const delay = retryDelay(currentState.retryCount, error);
    // Axios fails merging this configuration to the default configuration because it has an issue
    // with circular structures: https://github.com/mzabriskie/axios/issues/370
    fixConfig(axiosInstance, config);
    if (!shouldResetTimeout && config.timeout && currentState.lastRequestTime) {
        const lastRequestDuration = Date.now() - currentState.lastRequestTime;
        const timeout = config.timeout - lastRequestDuration - delay;
        if (timeout <= 0) {
            return Promise.reject(error);
        }
        config.timeout = timeout;
    }
    config.transformRequest = [(data) => data];
    await onRetry(currentState.retryCount, error, config);
    if (config.signal?.aborted) {
        return Promise.resolve(axiosInstance(config));
    }
    return new Promise((resolve) => {
        const abortListener = () => {
            clearTimeout(timeout);
            resolve(axiosInstance(config));
        };
        const timeout = setTimeout(() => {
            resolve(axiosInstance(config));
            if (config.signal?.removeEventListener) {
                config.signal.removeEventListener('abort', abortListener);
            }
        }, delay);
        if (config.signal?.addEventListener) {
            config.signal.addEventListener('abort', abortListener, { once: true });
        }
    });
}
async function handleMaxRetryTimesExceeded(currentState, error) {
    if (currentState.retryCount >= currentState.retries)
        await currentState.onMaxRetryTimesExceeded(error, currentState.retryCount);
}
const axiosRetry = (axiosInstance, defaultOptions) => {
    const requestInterceptorId = axiosInstance.interceptors.request.use((config) => {
        setCurrentState(config, defaultOptions, true);
        if (config[namespace]?.validateResponse) {
            // by setting this, all HTTP responses will be go through the error interceptor first
            config.validateStatus = () => false;
        }
        return config;
    });
    const responseInterceptorId = axiosInstance.interceptors.response.use(null, async (error) => {
        const { config } = error;
        // If we have no information to retry the request
        if (!config) {
            return Promise.reject(error);
        }
        const currentState = setCurrentState(config, defaultOptions);
        if (error.response && currentState.validateResponse?.(error.response)) {
            // no issue with response
            return error.response;
        }
        if (await shouldRetry(currentState, error)) {
            return handleRetry(axiosInstance, currentState, error, config);
        }
        await handleMaxRetryTimesExceeded(currentState, error);
        return Promise.reject(error);
    });
    return { requestInterceptorId, responseInterceptorId };
};
// Compatibility with CommonJS
axiosRetry.isNetworkError = isNetworkError;
axiosRetry.isSafeRequestError = isSafeRequestError;
axiosRetry.isIdempotentRequestError = isIdempotentRequestError;
axiosRetry.isNetworkOrIdempotentRequestError = isNetworkOrIdempotentRequestError;
axiosRetry.exponentialDelay = exponentialDelay;
axiosRetry.linearDelay = linearDelay;
axiosRetry.isRetryableError = isRetryableError;
export default axiosRetry;
