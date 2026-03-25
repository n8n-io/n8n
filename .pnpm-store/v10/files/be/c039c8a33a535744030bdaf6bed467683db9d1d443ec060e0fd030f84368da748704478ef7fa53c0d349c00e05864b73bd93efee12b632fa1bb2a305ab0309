import type { AwsCredentialIdentity, HttpRequest as IHttpRequest } from "@smithy/types";
import { AwsSdkSigV4Signer } from "./AwsSdkSigV4Signer";
/**
 * @internal
 * Note: this is not a signing algorithm implementation. The sign method
 * accepts the real signer as an input parameter.
 */
export declare class AwsSdkSigV4ASigner extends AwsSdkSigV4Signer {
    sign(httpRequest: IHttpRequest, identity: AwsCredentialIdentity, signingProperties: Record<string, unknown>): Promise<IHttpRequest>;
}
