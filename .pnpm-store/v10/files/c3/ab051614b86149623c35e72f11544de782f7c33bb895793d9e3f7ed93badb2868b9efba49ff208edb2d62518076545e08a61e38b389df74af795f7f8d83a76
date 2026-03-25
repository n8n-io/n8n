import { AwsCredentialIdentity } from "@aws-sdk/types";
import {
  HttpRequest,
  RequestPresigner,
  RequestSigner,
  RequestSigningArguments,
} from "@smithy/types";
export type OptionalCrtSignerV4 = {
  new (options: any): RequestPresigner &
    RequestSigner & {
      signWithCredentials(
        requestToSign: HttpRequest,
        credentials: AwsCredentialIdentity,
        options: RequestSigningArguments
      ): Promise<HttpRequest>;
    };
};
export declare const signatureV4CrtContainer: {
  CrtSignerV4: null | OptionalCrtSignerV4;
};
