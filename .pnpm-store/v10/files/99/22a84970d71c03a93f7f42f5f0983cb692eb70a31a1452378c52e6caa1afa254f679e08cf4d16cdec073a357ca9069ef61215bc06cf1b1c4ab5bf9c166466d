// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { credentialLogger, formatError } from "../util/logging.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { CredentialUnavailableError } from "../errors.js";
import { createHash } from "node:crypto";
import { ensureScopes } from "../util/scopeUtils.js";
import { readFile } from "node:fs/promises";
import { tracingClient } from "../util/tracing.js";
const credentialName = "OnBehalfOfCredential";
const logger = credentialLogger(credentialName);
/**
 * Enables authentication to Microsoft Entra ID using the [On Behalf Of flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-on-behalf-of-flow).
 */
export class OnBehalfOfCredential {
    tenantId;
    additionallyAllowedTenantIds;
    msalClient;
    sendCertificateChain;
    certificatePath;
    clientSecret;
    userAssertionToken;
    clientAssertion;
    constructor(options) {
        const { clientSecret } = options;
        const { certificatePath, sendCertificateChain } = options;
        const { getAssertion } = options;
        const { tenantId, clientId, userAssertionToken, additionallyAllowedTenants: additionallyAllowedTenantIds, } = options;
        if (!tenantId) {
            throw new CredentialUnavailableError(`${credentialName}: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        if (!clientId) {
            throw new CredentialUnavailableError(`${credentialName}: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        if (!clientSecret && !certificatePath && !getAssertion) {
            throw new CredentialUnavailableError(`${credentialName}: You must provide one of clientSecret, certificatePath, or a getAssertion callback but none were provided. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        if (!userAssertionToken) {
            throw new CredentialUnavailableError(`${credentialName}: userAssertionToken is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
        }
        this.certificatePath = certificatePath;
        this.clientSecret = clientSecret;
        this.userAssertionToken = userAssertionToken;
        this.sendCertificateChain = sendCertificateChain;
        this.clientAssertion = getAssertion;
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(additionallyAllowedTenantIds);
        this.msalClient = createMsalClient(clientId, this.tenantId, {
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
     * @param options - The options used to configure the underlying network requests.
     */
    async getToken(scopes, options = {}) {
        return tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = ensureScopes(scopes);
            if (this.certificatePath) {
                const clientCertificate = await this.buildClientCertificate(this.certificatePath);
                return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, clientCertificate, newOptions);
            }
            else if (this.clientSecret) {
                return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, this.clientSecret, options);
            }
            else if (this.clientAssertion) {
                return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, this.clientAssertion, options);
            }
            else {
                // this is an invalid scenario and is a bug, as the constructor should have thrown an error if neither clientSecret nor certificatePath nor clientAssertion were provided
                throw new Error("Expected either clientSecret or certificatePath or clientAssertion to be defined.");
            }
        });
    }
    async buildClientCertificate(certificatePath) {
        try {
            const parts = await this.parseCertificate({ certificatePath }, this.sendCertificateChain);
            return {
                thumbprint: parts.thumbprint,
                thumbprintSha256: parts.thumbprintSha256,
                privateKey: parts.certificateContents,
                x5c: parts.x5c,
            };
        }
        catch (error) {
            logger.info(formatError("", error));
            throw error;
        }
    }
    async parseCertificate(configuration, sendCertificateChain) {
        const certificatePath = configuration.certificatePath;
        const certificateContents = await readFile(certificatePath, "utf8");
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
        const thumbprint = createHash("sha1") // CodeQL [SM04514] Needed for backward compatibility reason
            .update(Buffer.from(publicKeys[0], "base64"))
            .digest("hex")
            .toUpperCase();
        const thumbprintSha256 = createHash("sha256")
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
}
//# sourceMappingURL=onBehalfOfCredential.js.map