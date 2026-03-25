import { SignatureV4CryptoInit, SignatureV4Init } from "@smithy/signature-v4";
import { AwsCredentialIdentity, HttpRequest, RequestPresigner, RequestPresigningArguments, RequestSigner, RequestSigningArguments } from "@smithy/types";
/**
 * @internal
 */
export type SignatureV4MultiRegionInit = SignatureV4Init & SignatureV4CryptoInit & {
    runtime?: string;
};
/**
 * A SigV4-compatible signer for S3 service. In order to support SigV4a algorithm according to the operation input
 * dynamically, the signer wraps native module SigV4a signer and JS SigV4 signer. It signs the request with SigV4a
 * algorithm if the request needs to be signed with `*` region. Otherwise, it signs the request with normal SigV4
 * signer.
 * @internal
 */
export declare class SignatureV4MultiRegion implements RequestPresigner, RequestSigner {
    private sigv4aSigner?;
    private readonly sigv4Signer;
    private readonly signerOptions;
    constructor(options: SignatureV4MultiRegionInit);
    sign(requestToSign: HttpRequest, options?: RequestSigningArguments): Promise<HttpRequest>;
    /**
     * Sign with alternate credentials to the ones provided in the constructor.
     * Note: This is only supported for SigV4a when using the CRT implementation.
     */
    signWithCredentials(requestToSign: HttpRequest, credentials: AwsCredentialIdentity, options?: RequestSigningArguments): Promise<HttpRequest>;
    /**
     * Presign a request.
     * Note: This is only supported for SigV4a when using the CRT implementation.
     */
    presign(originalRequest: HttpRequest, options?: RequestPresigningArguments): Promise<HttpRequest>;
    presignWithCredentials(originalRequest: HttpRequest, credentials: AwsCredentialIdentity, options?: RequestPresigningArguments): Promise<HttpRequest>;
    private getSigv4aSigner;
}
