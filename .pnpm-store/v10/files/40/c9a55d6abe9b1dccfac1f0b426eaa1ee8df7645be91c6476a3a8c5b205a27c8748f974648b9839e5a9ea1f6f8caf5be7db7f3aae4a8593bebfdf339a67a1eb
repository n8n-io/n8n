"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = isNetworkError;
/* eslint-disable */
// @ts-nocheck
// is-network-error vendored to avoid import issues
// Source: https://github.com/sindresorhus/is-network-error
const objectToString = Object.prototype.toString;
const isError = (value) => objectToString.call(value) === "[object Error]";
const errorMessages = new Set([
    "network error", // Chrome
    "Failed to fetch", // Chrome
    "NetworkError when attempting to fetch resource.", // Firefox
    "The Internet connection appears to be offline.", // Safari 16
    "Network request failed", // `cross-fetch`
    "fetch failed", // Undici (Node.js)
    "terminated", // Undici (Node.js)
    " A network error occurred.", // Bun (WebKit)
    "Network connection lost", // Cloudflare Workers (fetch)
]);
function isNetworkError(error) {
    const isValid = error &&
        isError(error) &&
        error.name === "TypeError" &&
        typeof error.message === "string";
    if (!isValid) {
        return false;
    }
    const { message, stack } = error;
    // Safari 17+ has generic message but no stack for network errors
    if (message === "Load failed") {
        return (stack === undefined ||
            // Sentry adds its own stack trace to the fetch error, so also check for that
            "__sentry_captured__" in error);
    }
    // Deno network errors start with specific text
    if (message.startsWith("error sending request for url")) {
        return true;
    }
    // Standard network error messages
    return errorMessages.has(message);
}
