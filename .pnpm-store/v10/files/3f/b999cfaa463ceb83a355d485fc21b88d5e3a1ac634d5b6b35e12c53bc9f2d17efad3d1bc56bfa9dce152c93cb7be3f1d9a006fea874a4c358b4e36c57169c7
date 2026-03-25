import { CryptoProvider } from "../crypto/CryptoProvider.js";
/**
 * Client assertion of type jwt-bearer used in confidential client flows
 * @public
 */
export declare class ClientAssertion {
    private jwt;
    private privateKey;
    private thumbprint;
    private useSha256;
    private expirationTime;
    private issuer;
    private jwtAudience;
    private publicCertificate;
    /**
     * Initialize the ClientAssertion class from the clientAssertion passed by the user
     * @param assertion - refer https://tools.ietf.org/html/rfc7521
     */
    static fromAssertion(assertion: string): ClientAssertion;
    /**
     * @deprecated Use fromCertificateWithSha256Thumbprint instead, with a SHA-256 thumprint
     * Initialize the ClientAssertion class from the certificate passed by the user
     * @param thumbprint - identifier of a certificate
     * @param privateKey - secret key
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static fromCertificate(thumbprint: string, privateKey: string, publicCertificate?: string): ClientAssertion;
    /**
     * Initialize the ClientAssertion class from the certificate passed by the user
     * @param thumbprint - identifier of a certificate
     * @param privateKey - secret key
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static fromCertificateWithSha256Thumbprint(thumbprint: string, privateKey: string, publicCertificate?: string): ClientAssertion;
    /**
     * Update JWT for certificate based clientAssertion, if passed by the user, uses it as is
     * @param cryptoProvider - library's crypto helper
     * @param issuer - iss claim
     * @param jwtAudience - aud claim
     */
    getJwt(cryptoProvider: CryptoProvider, issuer: string, jwtAudience: string): string;
    /**
     * JWT format and required claims specified: https://tools.ietf.org/html/rfc7523#section-3
     */
    private createJwt;
    /**
     * Utility API to check expiration
     */
    private isExpired;
    /**
     * Extracts the raw certs from a given certificate string and returns them in an array.
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static parseCertificate(publicCertificate: string): Array<string>;
}
//# sourceMappingURL=ClientAssertion.d.ts.map