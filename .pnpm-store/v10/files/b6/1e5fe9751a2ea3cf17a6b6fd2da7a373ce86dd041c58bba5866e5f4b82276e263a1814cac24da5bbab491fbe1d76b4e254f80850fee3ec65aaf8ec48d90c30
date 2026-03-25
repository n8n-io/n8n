import { AwsCredentialIdentity } from "@aws-sdk/types";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest as IHttpRequest, RequestPresigningArguments, RequestSigningArguments } from "@smithy/types";
export declare class SignatureV4S3Express extends SignatureV4 {
    /**
     * Signs with alternate provided credentials instead of those provided in the
     * constructor.
     *
     * Additionally omits the credential sessionToken and assigns it to the
     * alternate header field for S3 Express.
     */
    signWithCredentials(requestToSign: IHttpRequest, credentials: AwsCredentialIdentity, options?: RequestSigningArguments): Promise<IHttpRequest>;
    /**
     * Similar to {@link SignatureV4S3Express#signWithCredentials} but for presigning.
     */
    presignWithCredentials(requestToSign: IHttpRequest, credentials: AwsCredentialIdentity, options?: RequestPresigningArguments): Promise<IHttpRequest>;
}
