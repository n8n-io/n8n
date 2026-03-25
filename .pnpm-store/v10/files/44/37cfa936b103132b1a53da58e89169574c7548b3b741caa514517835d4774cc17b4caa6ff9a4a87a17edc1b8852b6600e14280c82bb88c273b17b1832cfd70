"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientCertificateCredential = void 0;
exports.parseCertificate = parseCertificate;
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const node_crypto_1 = require("node:crypto");
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const logging_js_1 = require("../util/logging.js");
const promises_1 = require("node:fs/promises");
const tracing_js_1 = require("../util/tracing.js");
const credentialName = "ClientCertificateCredential";
const logger = (0, logging_js_1.credentialLogger)(credentialName);
/**
 * Enables authentication to Microsoft Entra ID using a PEM-encoded
 * certificate that is assigned to an App Registration. More information
 * on how to configure certificate authentication can be found here:
 *
 * https://learn.microsoft.com/azure/active-directory/develop/active-directory-certificate-credentials#register-your-certificate-with-azure-ad
 *
 */
class ClientCertificateCredential {
    tenantId;
    additionallyAllowedTenantIds;
    certificateConfiguration;
    sendCertificateChain;
    msalClient;
    constructor(tenantId, clientId, certificatePathOrConfiguration, options = {}) {
        if (!tenantId || !clientId) {
            throw new Error(`${credentialName}: tenantId and clientId are required parameters.`);
        }
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        this.sendCertificateChain = options.sendCertificateChain;
        this.certificateConfiguration = {
            ...(typeof certificatePathOrConfiguration === "string"
                ? {
                    certificatePath: certificatePathOrConfiguration,
                }
                : certificatePathOrConfiguration),
        };
        const certificate = this.certificateConfiguration
            .certificate;
        const certificatePath = this.certificateConfiguration
            .certificatePath;
        if (!this.certificateConfiguration || !(certificate || certificatePath)) {
            throw new Error(`${credentialName}: Provide either a PEM certificate in string form, or the path to that certificate in the filesystem. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        if (certificate && certificatePath) {
            throw new Error(`${credentialName}: To avoid unexpected behaviors, providing both the contents of a PEM certificate and the path to a PEM certificate is forbidden. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: options,
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options = {}) {
        return tracing_js_1.tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
            const certificate = await this.buildClientCertificate();
            return this.msalClient.getTokenByClientCertificate(arrayScopes, certificate, newOptions);
        });
    }
    async buildClientCertificate() {
        const parts = await parseCertificate(this.certificateConfiguration, this.sendCertificateChain ?? false);
        let privateKey;
        if (this.certificateConfiguration.certificatePassword !== undefined) {
            privateKey = (0, node_crypto_1.createPrivateKey)({
                key: parts.certificateContents,
                passphrase: this.certificateConfiguration.certificatePassword,
                format: "pem",
            })
                .export({
                format: "pem",
                type: "pkcs8",
            })
                .toString();
        }
        else {
            privateKey = parts.certificateContents;
        }
        return {
            thumbprint: parts.thumbprint,
            thumbprintSha256: parts.thumbprintSha256,
            privateKey,
            x5c: parts.x5c,
        };
    }
}
exports.ClientCertificateCredential = ClientCertificateCredential;
/**
 * Parses a certificate into its relevant parts
 *
 * @param certificateConfiguration - The certificate contents or path to the certificate
 * @param sendCertificateChain - true if the entire certificate chain should be sent for SNI, false otherwise
 * @returns The parsed certificate parts and the certificate contents
 */
async function parseCertificate(certificateConfiguration, sendCertificateChain) {
    const certificate = certificateConfiguration.certificate;
    const certificatePath = certificateConfiguration
        .certificatePath;
    const certificateContents = certificate || (await (0, promises_1.readFile)(certificatePath, "utf8"));
    const x5c = sendCertificateChain ? certificateContents : undefined;
    const certificatePattern = /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/g;
    const publicKeys = [];
    // Match all possible certificates, in the order they are in the file. These will form the chain that is used for x5c
    let match;
    do {
        match = certificatePattern.exec(certificateContents);
        if (match) {
            publicKeys.push(match[3]);
        }
    } while (match);
    if (publicKeys.length === 0) {
        throw new Error("The file at the specified path does not contain a PEM-encoded certificate.");
    }
    const thumbprint = (0, node_crypto_1.createHash)("sha1") // CodeQL [SM04514] Needed for backward compatibility reason
        .update(Buffer.from(publicKeys[0], "base64"))
        .digest("hex")
        .toUpperCase();
    const thumbprintSha256 = (0, node_crypto_1.createHash)("sha256")
        .update(Buffer.from(publicKeys[0], "base64"))
        .digest("hex")
        .toUpperCase();
    return {
        certificateContents,
        thumbprintSha256,
        thumbprint,
        x5c,
    };
}
//# sourceMappingURL=clientCertificateCredential.js.map