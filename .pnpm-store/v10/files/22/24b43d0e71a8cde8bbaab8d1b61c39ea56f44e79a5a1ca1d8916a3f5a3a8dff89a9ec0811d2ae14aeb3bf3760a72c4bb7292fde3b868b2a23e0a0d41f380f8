// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("AzurePipelinesCredential is not supported in the browser.");
const logger = credentialLogger("AzurePipelinesCredential");
/**
 * Enables authentication to Microsoft Entra ID using a PEM-encoded
 * certificate that is assigned to an App Registration.
 */
export class AzurePipelinesCredential {
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
//# sourceMappingURL=azurePipelinesCredential-browser.mjs.map