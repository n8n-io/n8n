import { AwsCredentialIdentity } from "@aws-sdk/types";
import { SignatureV4 } from "@smithy/signature-v4";
import {
  HttpRequest as IHttpRequest,
  RequestPresigningArguments,
  RequestSigningArguments,
} from "@smithy/types";
export declare class SignatureV4S3Express extends SignatureV4 {
  signWithCredentials(
    requestToSign: IHttpRequest,
    credentials: AwsCredentialIdentity,
    options?: RequestSigningArguments
  ): Promise<IHttpRequest>;
  presignWithCredentials(
    requestToSign: IHttpRequest,
    credentials: AwsCredentialIdentity,
    options?: RequestPresigningArguments
  ): Promise<IHttpRequest>;
}
