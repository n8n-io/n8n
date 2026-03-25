// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("AzureCliCredential is not supported in the browser.");
const logger = credentialLogger("AzureCliCredential");
/**
 * This credential will use the currently logged-in user login information
 * via the Azure CLI ('az') commandline tool.
 */
export class AzureCliCredential {
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
//# sourceMappingURL=azureCliCredential-browser.mjs.map