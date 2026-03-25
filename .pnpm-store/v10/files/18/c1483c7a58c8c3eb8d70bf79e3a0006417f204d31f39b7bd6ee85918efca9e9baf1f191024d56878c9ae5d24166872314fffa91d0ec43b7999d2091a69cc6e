import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { HttpRequest, RequestPresigner, RequestSigner, RequestSigningArguments } from "@smithy/types";
/**
 * @public
 */
export type OptionalCrtSignerV4 = {
    /**
     * This constructor is not typed so as not to require a type import
     * from the signature-v4-crt package.
     *
     * The true type is CrtSignerV4 from \@aws-sdk/signature-v4-crt.
     */
    new (options: any): RequestPresigner & RequestSigner & {
        signWithCredentials(requestToSign: HttpRequest, credentials: AwsCredentialIdentity, options: RequestSigningArguments): Promise<HttpRequest>;
    };
};
/**
 * @public
 *
 * \@aws-sdk/signature-v4-crt will install the constructor in this
 * container if it is installed.
 *
 * This avoids a runtime-require being interpreted statically by bundlers.
 *
 */
export declare const signatureV4CrtContainer: {
    CrtSignerV4: null | OptionalCrtSignerV4;
};
