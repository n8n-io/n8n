// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("ClientAssertionCredential is not supported in the browser.");
const logger = credentialLogger("ClientAssertionCredential");
/**
 * Authenticates a service principal with a JWT assertion.
 */
export class ClientAssertionCredential {
    /**
     * Only available in Node.js
     */
    constructor() {
        logger.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
    getToken() {
        logger.getToken.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
}
//# sourceMappingURL=clientAssertionCredential-browser.mjs.map