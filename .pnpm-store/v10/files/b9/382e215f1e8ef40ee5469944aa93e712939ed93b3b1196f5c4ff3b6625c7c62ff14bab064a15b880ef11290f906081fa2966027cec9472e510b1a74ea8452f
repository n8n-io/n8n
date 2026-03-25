import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { CertificateParts } from "../msal/types.js";
import type { ClientCertificateCredentialOptions } from "./clientCertificateCredentialOptions.js";
import type { ClientCertificateCredentialPEMConfiguration, ClientCertificatePEMCertificate, ClientCertificatePEMCertificatePath } from "./clientCertificateCredentialModels.js";
/**
 * Enables authentication to Microsoft Entra ID using a PEM-encoded
 * certificate that is assigned to an App Registration. More information
 * on how to configure certificate authentication can be found here:
 *
 * https://learn.microsoft.com/azure/active-directory/develop/active-directory-certificate-credentials#register-your-certificate-with-azure-ad
 *
 */
export declare class ClientCertificateCredential implements TokenCredential {
    private tenantId;
    private additionallyAllowedTenantIds;
    private certificateConfiguration;
    private sendCertificateChain?;
    private msalClient;
    /**
     * Creates an instance of the ClientCertificateCredential with the details
     * needed to authenticate against Microsoft Entra ID with a certificate.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param certificatePath - The path to a PEM-encoded public/private key certificate on the filesystem.
     * Ensure that certificate is in PEM format and contains both the public and private keys.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, certificatePath: string, options?: ClientCertificateCredentialOptions);
    /**
     * Creates an instance of the ClientCertificateCredential with the details
     * needed to authenticate against Microsoft Entra ID with a certificate.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param configuration - Other parameters required, including the path of the certificate on the filesystem.
     *                        If the type is ignored, we will throw the value of the path to a PEM certificate.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, configuration: ClientCertificatePEMCertificatePath, options?: ClientCertificateCredentialOptions);
    /**
     * Creates an instance of the ClientCertificateCredential with the details
     * needed to authenticate against Microsoft Entra ID with a certificate.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param configuration - Other parameters required, including the PEM-encoded certificate as a string.
     *                        If the type is ignored, we will throw the value of the PEM-encoded certificate.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, configuration: ClientCertificatePEMCertificate, options?: ClientCertificateCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    private buildClientCertificate;
}
/**
 * Parses a certificate into its relevant parts
 *
 * @param certificateConfiguration - The certificate contents or path to the certificate
 * @param sendCertificateChain - true if the entire certificate chain should be sent for SNI, false otherwise
 * @returns The parsed certificate parts and the certificate contents
 */
export declare function parseCertificate(certificateConfiguration: ClientCertificateCredentialPEMConfiguration, sendCertificateChain: boolean): Promise<Omit<CertificateParts, "privateKey"> & {
    certificateContents: string;
}>;
//# sourceMappingURL=clientCertificateCredential.d.ts.map