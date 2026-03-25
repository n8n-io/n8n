"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.fetcher = void 0;
const qs_1 = __importDefault(require("qs"));
const runtime_1 = require("../runtime");
const INITIAL_RETRY_DELAY = 1;
const MAX_RETRY_DELAY = 60;
const DEFAULT_MAX_RETRIES = 2;
function fetcherImpl(args) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {};
        if (args.body !== undefined && args.contentType != null) {
            headers["Content-Type"] = args.contentType;
        }
        if (args.headers != null) {
            for (const [key, value] of Object.entries(args.headers)) {
                if (value != null) {
                    headers[key] = value;
                }
            }
        }
        const url = Object.keys((_a = args.queryParameters) !== null && _a !== void 0 ? _a : {}).length > 0
            ? `${args.url}?${qs_1.default.stringify(args.queryParameters, { arrayFormat: "repeat" })}`
            : args.url;
        let body = undefined;
        const maybeStringifyBody = (body) => {
            if (body instanceof Uint8Array) {
                return body;
            }
            else if (args.contentType === "application/x-www-form-urlencoded" && typeof args.body === "string") {
                return args.body;
            }
            else {
                return JSON.stringify(body);
            }
        };
        if (runtime_1.RUNTIME.type === "node") {
            if (args.body instanceof (yield Promise.resolve().then(() => __importStar(require("formdata-node")))).FormData) {
                // @ts-expect-error
                body = args.body;
            }
            else {
                body = maybeStringifyBody(args.body);
            }
        }
        else {
            if (args.body instanceof (yield Promise.resolve().then(() => __importStar(require("form-data")))).default) {
                // @ts-expect-error
                body = args.body;
            }
            else {
                body = maybeStringifyBody(args.body);
            }
        }
        // In Node.js environments, the SDK always uses`node-fetch`.
        // If not in Node.js the SDK uses global fetch if available,
        // and falls back to node-fetch.
        const fetchFn = runtime_1.RUNTIME.type === "node"
            ? // `.default` is required due to this issue:
                // https://github.com/node-fetch/node-fetch/issues/450#issuecomment-387045223
                (yield Promise.resolve().then(() => __importStar(require("node-fetch")))).default
            : typeof fetch == "function"
                ? fetch
                : (yield Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
            const signals = [];
            // Add timeout signal
            let timeoutAbortId = undefined;
            if (args.timeoutMs != null) {
                const { signal, abortId } = getTimeoutSignal(args.timeoutMs);
                timeoutAbortId = abortId;
                signals.push(signal);
            }
            // Add arbitrary signal
            if (args.abortSignal != null) {
                signals.push(args.abortSignal);
            }
            const response = yield fetchFn(url, {
                method: args.method,
                headers,
                body,
                signal: anySignal(signals),
                credentials: args.withCredentials ? "include" : undefined,
            });
            if (timeoutAbortId != null) {
                clearTimeout(timeoutAbortId);
            }
            return response;
        });
        try {
            let response = yield makeRequest();
            for (let i = 0; i < ((_b = args.maxRetries) !== null && _b !== void 0 ? _b : DEFAULT_MAX_RETRIES); ++i) {
                if (response.status === 408 ||
                    response.status === 409 ||
                    response.status === 429 ||
                    response.status >= 500) {
                    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(i, 2), MAX_RETRY_DELAY);
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                    response = yield makeRequest();
                }
                else {
                    break;
                }
            }
            let body;
            if (response.body != null && args.responseType === "blob") {
                body = yield response.blob();
            }
            else if (response.body != null && args.responseType === "streaming") {
                body = response.body;
            }
            else if (response.body != null && args.responseType === "text") {
                body = yield response.text();
            }
            else {
                const text = yield response.text();
                if (text.length > 0) {
                    try {
                        body = JSON.parse(text);
                    }
                    catch (err) {
                        return {
                            ok: false,
                            error: {
                                reason: "non-json",
                                statusCode: response.status,
                                rawBody: text,
                            },
                        };
                    }
                }
            }
            if (response.status >= 200 && response.status < 400) {
                return {
                    ok: true,
                    body: body,
                    headers: response.headers,
                };
            }
            else {
                return {
                    ok: false,
                    error: {
                        reason: "status-code",
                        statusCode: response.status,
                        body,
                    },
                };
            }
        }
        catch (error) {
            if (args.abortSignal != null && args.abortSignal.aborted) {
                return {
                    ok: false,
                    error: {
                        reason: "unknown",
                        errorMessage: "The user aborted a request",
                    },
                };
            }
            else if (error instanceof Error && error.name === "AbortError") {
                return {
                    ok: false,
                    error: {
                        reason: "timeout",
                    },
                };
            }
            else if (error instanceof Error) {
                return {
                    ok: false,
                    error: {
                        reason: "unknown",
                        errorMessage: error.message,
                    },
                };
            }
            return {
                ok: false,
                error: {
                    reason: "unknown",
                    errorMessage: JSON.stringify(error),
                },
            };
        }
    });
}
const TIMEOUT = "timeout";
function getTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const abortId = setTimeout(() => controller.abort(TIMEOUT), timeoutMs);
    return { signal: controller.signal, abortId };
}
/**
 * Returns an abort signal that is getting aborted when
 * at least one of the specified abort signals is aborted.
 *
 * Requires at least node.js 18.
 */
function anySignal(...args) {
    // Allowing signals to be passed either as array
    // of signals or as multiple arguments.
    const signals = (args.length === 1 && Array.isArray(args[0]) ? args[0] : args);
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted) {
            // Exiting early if one of the signals
            // is already aborted.
            controller.abort(signal === null || signal === void 0 ? void 0 : signal.reason);
            break;
        }
        // Listening for signals and removing the listeners
        // when at least one symbol is aborted.
        signal.addEventListener("abort", () => controller.abort(signal === null || signal === void 0 ? void 0 : signal.reason), {
            signal: controller.signal,
        });
    }
    return controller.signal;
}
exports.fetcher = fetcherImpl;
