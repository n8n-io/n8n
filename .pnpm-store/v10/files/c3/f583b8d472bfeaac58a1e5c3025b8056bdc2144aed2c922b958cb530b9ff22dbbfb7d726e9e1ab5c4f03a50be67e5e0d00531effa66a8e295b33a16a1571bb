"use strict";
// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GaxiosError = exports.GAXIOS_ERROR_SYMBOL = void 0;
exports.defaultErrorRedactor = defaultErrorRedactor;
const extend_1 = __importDefault(require("extend"));
const util_cjs_1 = __importDefault(require("./util.cjs"));
const pkg = util_cjs_1.default.pkg;
/**
 * Support `instanceof` operator for `GaxiosError`s in different versions of this library.
 *
 * @see {@link GaxiosError[Symbol.hasInstance]}
 */
exports.GAXIOS_ERROR_SYMBOL = Symbol.for(`${pkg.name}-gaxios-error`);
class GaxiosError extends Error {
    config;
    response;
    /**
     * An error code.
     * Can be a system error code, DOMException error name, or any error's 'code' property where it is a `string`.
     *
     * It is only a `number` when the cause is sourced from an API-level error (AIP-193).
     *
     * @see {@link https://nodejs.org/api/errors.html#errorcode error.code}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#error_names DOMException#error_names}
     * @see {@link https://google.aip.dev/193#http11json-representation AIP-193}
     *
     * @example
     * 'ECONNRESET'
     *
     * @example
     * 'TimeoutError'
     *
     * @example
     * 500
     */
    code;
    /**
     * An HTTP Status code.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/status Response#status}
     *
     * @example
     * 500
     */
    status;
    /**
     * @deprecated use {@link GaxiosError.cause} instead.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause Error#cause}
     *
     * @privateRemarks
     *
     * We will want to remove this property later as the modern `cause` property is better suited
     * for displaying and relaying nested errors. Keeping this here makes the resulting
     * error log larger than it needs to be.
     *
     */
    error;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[Symbol.hasInstance]}
     * @see {@link https://github.com/microsoft/TypeScript/issues/13965#issuecomment-278570200}
     * @see {@link https://stackoverflow.com/questions/46618852/require-and-instanceof}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/@@hasInstance#reverting_to_default_instanceof_behavior}
     */
    [exports.GAXIOS_ERROR_SYMBOL] = pkg.version;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[GAXIOS_ERROR_SYMBOL]}
     */
    static [Symbol.hasInstance](instance) {
        if (instance &&
            typeof instance === 'object' &&
            exports.GAXIOS_ERROR_SYMBOL in instance &&
            instance[exports.GAXIOS_ERROR_SYMBOL] === pkg.version) {
            return true;
        }
        // fallback to native
        return Function.prototype[Symbol.hasInstance].call(GaxiosError, instance);
    }
    constructor(message, config, response, cause) {
        super(message, { cause });
        this.config = config;
        this.response = response;
        this.error = cause instanceof Error ? cause : undefined;
        // deep-copy config as we do not want to mutate
        // the existing config for future retries/use
        this.config = (0, extend_1.default)(true, {}, config);
        if (this.response) {
            this.response.config = (0, extend_1.default)(true, {}, this.response.config);
        }
        if (this.response) {
            try {
                this.response.data = translateData(this.config.responseType, 
                // workaround for `node-fetch`'s `.data` deprecation...
                this.response?.bodyUsed ? this.response?.data : undefined);
            }
            catch {
                // best effort - don't throw an error within an error
                // we could set `this.response.config.responseType = 'unknown'`, but
                // that would mutate future calls with this config object.
            }
            this.status = this.response.status;
        }
        if (cause instanceof DOMException) {
            // The DOMException's equivalent to code is its name
            // E.g.: name = `TimeoutError`, code = number
            // https://developer.mozilla.org/en-US/docs/Web/API/DOMException/name
            this.code = cause.name;
        }
        else if (cause &&
            typeof cause === 'object' &&
            'code' in cause &&
            (typeof cause.code === 'string' || typeof cause.code === 'number')) {
            this.code = cause.code;
        }
    }
    /**
     * An AIP-193 conforming error extractor.
     *
     * @see {@link https://google.aip.dev/193#http11json-representation AIP-193}
     *
     * @internal
     * @expiremental
     *
     * @param res the response object
     * @returns the extracted error information
     */
    static extractAPIErrorFromResponse(res, defaultErrorMessage = 'The request failed') {
        let message = defaultErrorMessage;
        // Use res.data as the error message
        if (typeof res.data === 'string') {
            message = res.data;
        }
        if (res.data &&
            typeof res.data === 'object' &&
            'error' in res.data &&
            res.data.error &&
            !res.ok) {
            if (typeof res.data.error === 'string') {
                return {
                    message: res.data.error,
                    code: res.status,
                    status: res.statusText,
                };
            }
            if (typeof res.data.error === 'object') {
                // extract status from data.message
                message =
                    'message' in res.data.error &&
                        typeof res.data.error.message === 'string'
                        ? res.data.error.message
                        : message;
                // extract status from data.error
                const status = 'status' in res.data.error &&
                    typeof res.data.error.status === 'string'
                    ? res.data.error.status
                    : res.statusText;
                // extract code from data.error
                const code = 'code' in res.data.error && typeof res.data.error.code === 'number'
                    ? res.data.error.code
                    : res.status;
                if ('errors' in res.data.error &&
                    Array.isArray(res.data.error.errors)) {
                    const errorMessages = [];
                    for (const e of res.data.error.errors) {
                        if (typeof e === 'object' &&
                            'message' in e &&
                            typeof e.message === 'string') {
                            errorMessages.push(e.message);
                        }
                    }
                    return Object.assign({
                        message: errorMessages.join('\n') || message,
                        code,
                        status,
                    }, res.data.error);
                }
                return Object.assign({
                    message,
                    code,
                    status,
                }, res.data.error);
            }
        }
        return {
            message,
            code: res.status,
            status: res.statusText,
        };
    }
}
exports.GaxiosError = GaxiosError;
function translateData(responseType, data) {
    switch (responseType) {
        case 'stream':
            return data;
        case 'json':
            return JSON.parse(JSON.stringify(data));
        case 'arraybuffer':
            return JSON.parse(Buffer.from(data).toString('utf8'));
        case 'blob':
            return JSON.parse(data.text());
        default:
            return data;
    }
}
/**
 * An experimental error redactor.
 *
 * @param config Config to potentially redact properties of
 * @param response Config to potentially redact properties of
 *
 * @experimental
 */
function defaultErrorRedactor(data) {
    const REDACT = '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.';
    function redactHeaders(headers) {
        if (!headers)
            return;
        headers.forEach((_, key) => {
            // any casing of `Authentication`
            // any casing of `Authorization`
            // anything containing secret, such as 'client secret'
            if (/^authentication$/i.test(key) ||
                /^authorization$/i.test(key) ||
                /secret/i.test(key))
                headers.set(key, REDACT);
        });
    }
    function redactString(obj, key) {
        if (typeof obj === 'object' &&
            obj !== null &&
            typeof obj[key] === 'string') {
            const text = obj[key];
            if (/grant_type=/i.test(text) ||
                /assertion=/i.test(text) ||
                /secret/i.test(text)) {
                obj[key] = REDACT;
            }
        }
    }
    function redactObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        else if (obj instanceof FormData ||
            obj instanceof URLSearchParams ||
            // support `node-fetch` FormData/URLSearchParams
            ('forEach' in obj && 'set' in obj)) {
            obj.forEach((_, key) => {
                if (['grant_type', 'assertion'].includes(key) || /secret/.test(key)) {
                    obj.set(key, REDACT);
                }
            });
        }
        else {
            if ('grant_type' in obj) {
                obj['grant_type'] = REDACT;
            }
            if ('assertion' in obj) {
                obj['assertion'] = REDACT;
            }
            if ('client_secret' in obj) {
                obj['client_secret'] = REDACT;
            }
        }
    }
    if (data.config) {
        redactHeaders(data.config.headers);
        redactString(data.config, 'data');
        redactObject(data.config.data);
        redactString(data.config, 'body');
        redactObject(data.config.body);
        if (data.config.url.searchParams.has('token')) {
            data.config.url.searchParams.set('token', REDACT);
        }
        if (data.config.url.searchParams.has('client_secret')) {
            data.config.url.searchParams.set('client_secret', REDACT);
        }
    }
    if (data.response) {
        defaultErrorRedactor({ config: data.response.config });
        redactHeaders(data.response.headers);
        // workaround for `node-fetch`'s `.data` deprecation...
        if (data.response.bodyUsed) {
            redactString(data.response, 'data');
            redactObject(data.response.data);
        }
    }
    return data;
}
//# sourceMappingURL=common.js.map