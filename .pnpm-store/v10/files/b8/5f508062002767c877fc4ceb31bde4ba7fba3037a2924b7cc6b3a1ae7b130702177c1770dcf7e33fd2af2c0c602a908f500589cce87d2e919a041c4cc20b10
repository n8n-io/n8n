import type { AwsCredentialIdentity, AwsIdentityProperties } from "@aws-sdk/types";
import type { IniSection } from "@smithy/types";
import type { FromLoginCredentialsInit } from "./types";
/**
 * Handles loading and refreshing Sign-In credentials from cached tokens.
 * @internal
 */
export declare class LoginCredentialsFetcher {
    private readonly profileData;
    private readonly init?;
    private readonly callerClientConfig?;
    private static readonly REFRESH_THRESHOLD;
    constructor(profileData: IniSection, init?: FromLoginCredentialsInit | undefined, callerClientConfig?: AwsIdentityProperties["callerClientConfig"]);
    /**
     * Loads credentials and refreshes if necessary
     */
    loadCredentials(): Promise<AwsCredentialIdentity>;
    private get logger();
    private get loginSession();
    private refresh;
    private loadToken;
    private saveToken;
    private getTokenFilePath;
    /**
     * Converts ASN.1 DER encoded ECDSA signature to raw r||s format.
     * raw format is a fixed 64-byte concatenation of r and s values (32 bytes each).
     *
     * References:
     * - ECDSA algorithm: https://thecopenhagenbook.com/cryptography/ecdsa
     * - ASN.1 DER encoding: https://www.rfc-editor.org/rfc/rfc5480#section-2.2
     *
     * @param derSignature - ASN.1 DER encoded signature from crypto.sign()
     * @returns Raw signature as 64-byte buffer (32-byte r + 32-byte s)
     */
    private derToRawSignature;
    /**
     * Creates a DPoP interceptor that updates the DPoP header with the actual resolved endpoint
     * @internal
     */
    private createDPoPInterceptor;
    private generateDpop;
}
