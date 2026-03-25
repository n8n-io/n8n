import { SignatureV4CryptoInit, SignatureV4Init } from "@smithy/signature-v4";
import {
  AwsCredentialIdentity,
  HttpRequest,
  RequestPresigner,
  RequestPresigningArguments,
  RequestSigner,
  RequestSigningArguments,
} from "@smithy/types";
export type SignatureV4MultiRegionInit = SignatureV4Init &
  SignatureV4CryptoInit & {
    runtime?: string;
  };
export declare class SignatureV4MultiRegion
  implements RequestPresigner, RequestSigner
{
  private sigv4aSigner?;
  private readonly sigv4Signer;
  private readonly signerOptions;
  static sigv4aDependency(): "none" | "js" | "crt";
  constructor(options: SignatureV4MultiRegionInit);
  sign(
    requestToSign: HttpRequest,
    options?: RequestSigningArguments
  ): Promise<HttpRequest>;
  signWithCredentials(
    requestToSign: HttpRequest,
    credentials: AwsCredentialIdentity,
    options?: RequestSigningArguments
  ): Promise<HttpRequest>;
  presign(
    originalRequest: HttpRequest,
    options?: RequestPresigningArguments
  ): Promise<HttpRequest>;
  presignWithCredentials(
    originalRequest: HttpRequest,
    credentials: AwsCredentialIdentity,
    options?: RequestPresigningArguments
  ): Promise<HttpRequest>;
  private getSigv4aSigner;
}
