import type { AuthorityValidationOptions } from "./authorityValidationOptions.js";
import type { CredentialPersistenceOptions } from "./credentialPersistenceOptions.js";
import type { MultiTenantTokenCredentialOptions } from "./multiTenantTokenCredentialOptions.js";
/**
 * Defines the parameters to authenticate the {@link OnBehalfOfCredential} with a secret.
 */
export interface OnBehalfOfCredentialSecretOptions {
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId: string;
    /**
     * The client (application) ID of an App Registration in the tenant.
     */
    clientId: string;
    /**
     * A client secret that was generated for the App Registration.
     */
    clientSecret: string;
    /**
     * The user assertion for the On-Behalf-Of flow.
     */
    userAssertionToken: string;
}
/**
 * Defines the parameters to authenticate the {@link OnBehalfOfCredential} with a certificate.
 */
export interface OnBehalfOfCredentialCertificateOptions {
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId: string;
    /**
     * The client (application) ID of an App Registration in the tenant.
     */
    clientId: string;
    /**
     * The path to a PEM-encoded public/private key certificate on the filesystem.
     */
    certificatePath: string;
    /**
     * The user assertion for the On-Behalf-Of flow.
     */
    userAssertionToken: string;
    /**
     * Option to include x5c header for SubjectName and Issuer name authorization.
     * Set this option to send base64 encoded public certificate in the client assertion header as an x5c claim
     */
    sendCertificateChain?: boolean;
}
/**
 * Defines the parameters to authenticate the {@link OnBehalfOfCredential} with an assertion.
 */
export interface OnBehalfOfCredentialAssertionOptions {
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId: string;
    /**
     * The client (application) ID of an App Registration in the tenant.
     */
    clientId: string;
    /**
     * A function that retrieves the client assertion for the credential to use
     */
    getAssertion: () => Promise<string>;
    /**
     * The user assertion for the On-Behalf-Of flow.
     */
    userAssertionToken: string;
}
/**
 * Optional parameters for the {@link OnBehalfOfCredential} class.
 */
export type OnBehalfOfCredentialOptions = (OnBehalfOfCredentialSecretOptions | OnBehalfOfCredentialCertificateOptions | OnBehalfOfCredentialAssertionOptions) & MultiTenantTokenCredentialOptions & CredentialPersistenceOptions & AuthorityValidationOptions;
//# sourceMappingURL=onBehalfOfCredentialOptions.d.ts.map