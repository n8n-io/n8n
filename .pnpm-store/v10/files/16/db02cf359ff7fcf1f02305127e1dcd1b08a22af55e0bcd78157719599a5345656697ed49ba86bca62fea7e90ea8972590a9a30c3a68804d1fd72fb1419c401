import { LoggerOptions, SignedHttpRequestParameters } from "@azure/msal-common/browser";
export type SignedHttpRequestOptions = {
    loggerOptions: LoggerOptions;
};
export declare class SignedHttpRequest {
    private popTokenGenerator;
    private cryptoOps;
    private shrParameters;
    private logger;
    constructor(shrParameters: SignedHttpRequestParameters, shrOptions?: SignedHttpRequestOptions);
    /**
     * Generates and caches a keypair for the given request options.
     * @returns Public key digest, which should be sent to the token issuer.
     */
    generatePublicKeyThumbprint(): Promise<string>;
    /**
     * Generates a signed http request for the given payload with the given key.
     * @param payload Payload to sign (e.g. access token)
     * @param publicKeyThumbprint Public key digest (from generatePublicKeyThumbprint API)
     * @param claims Additional claims to include/override in the signed JWT
     * @returns Pop token signed with the corresponding private key
     */
    signRequest(payload: string, publicKeyThumbprint: string, claims?: object): Promise<string>;
    /**
     * Removes cached keys from browser for given public key thumbprint
     * @param publicKeyThumbprint Public key digest (from generatePublicKeyThumbprint API)
     * @returns If keys are properly deleted
     */
    removeKeys(publicKeyThumbprint: string): Promise<boolean>;
}
//# sourceMappingURL=SignedHttpRequest.d.ts.map