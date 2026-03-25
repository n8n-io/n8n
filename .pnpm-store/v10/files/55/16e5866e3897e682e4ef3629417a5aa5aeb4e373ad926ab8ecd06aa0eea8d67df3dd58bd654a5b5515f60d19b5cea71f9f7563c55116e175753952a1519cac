// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { logger } from "../../log.js";
// Ensure the warining is only emitted once
let insecureConnectionWarningEmmitted = false;
/**
 * Checks if the request is allowed to be sent over an insecure connection.
 *
 * A request is allowed to be sent over an insecure connection when:
 * - The `allowInsecureConnection` option is set to `true`.
 * - The request has the `allowInsecureConnection` property set to `true`.
 * - The request is being sent to `localhost` or `127.0.0.1`
 */
function allowInsecureConnection(request, options) {
    if (options.allowInsecureConnection && request.allowInsecureConnection) {
        const url = new URL(request.url);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            return true;
        }
    }
    return false;
}
/**
 * Logs a warning about sending a token over an insecure connection.
 *
 * This function will emit a node warning once, but log the warning every time.
 */
function emitInsecureConnectionWarning() {
    const warning = "Sending token over insecure transport. Assume any token issued is compromised.";
    logger.warning(warning);
    if (typeof (process === null || process === void 0 ? void 0 : process.emitWarning) === "function" && !insecureConnectionWarningEmmitted) {
        insecureConnectionWarningEmmitted = true;
        process.emitWarning(warning);
    }
}
/**
 * Ensures that authentication is only allowed over HTTPS unless explicitly allowed.
 * Throws an error if the connection is not secure and not explicitly allowed.
 */
export function ensureSecureConnection(request, options) {
    if (!request.url.toLowerCase().startsWith("https://")) {
        if (allowInsecureConnection(request, options)) {
            emitInsecureConnectionWarning();
        }
        else {
            throw new Error("Authentication is not permitted for non-TLS protected (non-https) URLs when allowInsecureConnection is false.");
        }
    }
}
//# sourceMappingURL=checkInsecureConnection.js.map