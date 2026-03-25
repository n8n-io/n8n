// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
const BrowserNotSupportedError = new Error("ClientCertificateCredential is not supported in the browser.");
const logger = credentialLogger("ClientCertificateCredential");
/**
 * Enables authentication to Microsoft Entra ID using a PEM-encoded
 * certificate that is assigned to an App Registration.
 */
export class ClientCertificateCredential {
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
//# sourceMappingURL=clientCertificateCredential-browser.mjs.map