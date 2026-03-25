import {
  AwsCredentialIdentity,
  HttpRequest as IHttpRequest,
} from "@smithy/types";
import { AwsSdkSigV4Signer } from "./AwsSdkSigV4Signer";
export declare class AwsSdkSigV4ASigner extends AwsSdkSigV4Signer {
  sign(
    httpRequest: IHttpRequest,
    identity: AwsCredentialIdentity,
    signingProperties: Record<string, unknown>
  ): Promise<IHttpRequest>;
}
