// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("AzureDeveloperCliCredential is not supported in the browser.");
const logger = credentialLogger("AzureDeveloperCliCredential");
/**
 * This credential will use the currently logged-in user login information
 * via the Azure Developer CLI ('azd') commandline tool.
 */
export class AzureDeveloperCliCredential {
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
//# sourceMappingURL=azureDeveloperCliCredential-browser.mjs.map