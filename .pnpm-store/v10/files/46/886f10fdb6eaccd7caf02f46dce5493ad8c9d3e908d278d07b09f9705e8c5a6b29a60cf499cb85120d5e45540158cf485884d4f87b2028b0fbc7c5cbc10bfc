// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("AuthorizationCodeCredential is not supported in the browser. InteractiveBrowserCredential is more appropriate for this use case.");
const logger = credentialLogger("AuthorizationCodeCredential");
export class AuthorizationCodeCredential {
    constructor() {
        logger.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
    getToken() {
        logger.getToken.info(formatError("", BrowserNotSupportedError));
        throw BrowserNotSupportedError;
    }
}
//# sourceMappingURL=authorizationCodeCredential-browser.mjs.map