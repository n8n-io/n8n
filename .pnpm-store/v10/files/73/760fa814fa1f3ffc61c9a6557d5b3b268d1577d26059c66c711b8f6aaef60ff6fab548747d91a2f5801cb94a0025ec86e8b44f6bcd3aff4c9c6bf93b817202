"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = exports.linearDelay = exports.exponentialDelay = exports.retryAfter = exports.isNetworkOrIdempotentRequestError = exports.isIdempotentRequestError = exports.isSafeRequestError = exports.isRetryableError = exports.isNetworkError = exports.namespace = void 0;
const is_retry_allowed_1 = __importDefault(require("is-retry-allowed"));
exports.namespace = 'axios-retry';
function isNetworkError(error) {
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
    return (0, is_retry_allowed_1.default)(error);
}
exports.isNetworkError = isNetworkError;
const SAFE_HTTP_METHODS = ['get', 'head', 'options'];
const IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);
function isRetryableError(error) {
    return (error.code !== 'ECONNABORTED' &&
        (!error.response ||
            error.response.status === 429 ||
            (error.response.status >= 500 && error.response.status <= 599)));
}
exports.isRetryableError = isRetryableError;
function isSafeRequestError(error) {
    var _a;
    if (!((_a = error.config) === null || _a === void 0 ? void 0 : _a.method)) {
        // Cannot determine if the request can be retried
        return false;
    }
    return isRetryableError(error) && SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1;
}
exports.isSafeRequestError = isSafeRequestError;
function isIdempotentRequestError(error) {
    var _a;
    if (!((_a = error.config) === null || _a === void 0 ? void 0 : _a.method)) {
        // Cannot determine if the request can be retried
        return false;
    }
    return isRetryableError(error) && IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1;
}
exports.isIdempotentRequestError = isIdempotentRequestError;
function isNetworkOrIdempotentRequestError(error) {
    return isNetworkError(error) || isIdempotentRequestError(error);
}
exports.isNetworkOrIdempotentRequestError = isNetworkOrIdempotentRequestError;
function retryAfter(error = undefined) {
    var _a;
    const retryAfterHeader = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.headers['retry-after'];
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
exports.retryAfter = retryAfter;
function noDelay(_retryNumber = 0, error = undefined) {
    return Math.max(0, retryAfter(error));
}
function exponentialDelay(retryNumber = 0, error = undefined, delayFactor = 100) {
    const calculatedDelay = Math.pow(2, retryNumber) * delayFactor;
    const delay = Math.max(calculatedDelay, retryAfter(error));
    const randomSum = delay * 0.2 * Math.random(); // 0-20% of the delay
    return delay + randomSum;
}
exports.exponentialDelay = exponentialDelay;
/**
 * Linear delay
 * @param {number | undefined} delayFactor - delay factor in milliseconds (default: 100)
 * @returns {function} (retryNumber: number, error: AxiosError | undefined) => number
 */
function linearDelay(delayFactor = 100) {
    return (retryNumber = 0, error = undefined) => {
        const delay = retryNumber * delayFactor;
        return Math.max(delay, retryAfter(error));
    };
}
exports.linearDelay = linearDelay;
exports.DEFAULT_OPTIONS = {
    retries: 3,
    retryCondition: isNetworkOrIdempotentRequestError,
    retryDelay: noDelay,
    shouldResetTimeout: false,
    onRetry: () => { },
    onMaxRetryTimesExceeded: () => { },
    validateResponse: null
};
function getRequestOptions(config, defaultOptions) {
    return Object.assign(Object.assign(Object.assign({}, exports.DEFAULT_OPTIONS), defaultOptions), config[exports.namespace]);
}
function setCurrentState(config, defaultOptions, resetLastRequestTime = false) {
    const currentState = getRequestOptions(config, defaultOptions || {});
    currentState.retryCount = currentState.retryCount || 0;
    if (!currentState.lastRequestTime || resetLastRequestTime) {
        currentState.lastRequestTime = Date.now();
    }
    config[exports.namespace] = currentState;
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
function shouldRetry(currentState, error) {
    return __awaiter(this, void 0, void 0, function* () {
        const { retries, retryCondition } = currentState;
        const shouldRetryOrPromise = (currentState.retryCount || 0) < retries && retryCondition(error);
        // This could be a promise
        if (typeof shouldRetryOrPromise === 'object') {
            try {
                const shouldRetryPromiseResult = yield shouldRetryOrPromise;
                // keep return true unless shouldRetryPromiseResult return false for compatibility
                return shouldRetryPromiseResult !== false;
            }
            catch (_err) {
                return false;
            }
        }
        return shouldRetryOrPromise;
    });
}
function handleRetry(axiosInstance, currentState, error, config) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
        yield onRetry(currentState.retryCount, error, config);
        if ((_a = config.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
            return Promise.resolve(axiosInstance(config));
        }
        return new Promise((resolve) => {
            var _a;
            const abortListener = () => {
                clearTimeout(timeout);
                resolve(axiosInstance(config));
            };
            const timeout = setTimeout(() => {
                var _a;
                resolve(axiosInstance(config));
                if ((_a = config.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener) {
                    config.signal.removeEventListener('abort', abortListener);
                }
            }, delay);
            if ((_a = config.signal) === null || _a === void 0 ? void 0 : _a.addEventListener) {
                config.signal.addEventListener('abort', abortListener, { once: true });
            }
        });
    });
}
function handleMaxRetryTimesExceeded(currentState, error) {
    return __awaiter(this, void 0, void 0, function* () {
        if (currentState.retryCount >= currentState.retries)
            yield currentState.onMaxRetryTimesExceeded(error, currentState.retryCount);
    });
}
const axiosRetry = (axiosInstance, defaultOptions) => {
    const requestInterceptorId = axiosInstance.interceptors.request.use((config) => {
        var _a;
        setCurrentState(config, defaultOptions, true);
        if ((_a = config[exports.namespace]) === null || _a === void 0 ? void 0 : _a.validateResponse) {
            // by setting this, all HTTP responses will be go through the error interceptor first
            config.validateStatus = () => false;
        }
        return config;
    });
    const responseInterceptorId = axiosInstance.interceptors.response.use(null, (error) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { config } = error;
        // If we have no information to retry the request
        if (!config) {
            return Promise.reject(error);
        }
        const currentState = setCurrentState(config, defaultOptions);
        if (error.response && ((_a = currentState.validateResponse) === null || _a === void 0 ? void 0 : _a.call(currentState, error.response))) {
            // no issue with response
            return error.response;
        }
        if (yield shouldRetry(currentState, error)) {
            return handleRetry(axiosInstance, currentState, error, config);
        }
        yield handleMaxRetryTimesExceeded(currentState, error);
        return Promise.reject(error);
    }));
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
exports.default = axiosRetry;
