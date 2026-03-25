// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../../util/logging.js";
const BrowserNotSupportedError = new Error("ManagedIdentityCredential is not supported in the browser.");
const logger = credentialLogger("ManagedIdentityCredential");
export class ManagedIdentityCredential {
    constructor() {
        logger.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
    async getToken() {
        logger.getToken.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
}
//# sourceMappingURL=index-browser.mjs.map