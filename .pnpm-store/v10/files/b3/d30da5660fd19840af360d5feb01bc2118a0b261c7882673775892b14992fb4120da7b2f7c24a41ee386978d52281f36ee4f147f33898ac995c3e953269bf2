import {
  AuthScheme,
  AwsCredentialIdentity,
  HttpRequest as IHttpRequest,
  HttpResponse,
  HttpSigner,
  RequestSigner,
} from "@smithy/types";
import { AwsSdkSigV4AAuthResolvedConfig } from "./resolveAwsSdkSigV4AConfig";
interface AwsSdkSigV4Config extends AwsSdkSigV4AAuthResolvedConfig {
  systemClockOffset: number;
  signer: (authScheme?: AuthScheme) => Promise<RequestSigner>;
}
interface AwsSdkSigV4AuthSigningProperties {
  config: AwsSdkSigV4Config;
  signer: RequestSigner;
  signingRegion?: string;
  signingRegionSet?: string[];
  signingName?: string;
}
export declare const validateSigningProperties: (
  signingProperties: Record<string, unknown>
) => Promise<AwsSdkSigV4AuthSigningProperties>;
export declare class AwsSdkSigV4Signer implements HttpSigner {
  sign(
    httpRequest: IHttpRequest,
    identity: AwsCredentialIdentity,
    signingProperties: Record<string, unknown>
  ): Promise<IHttpRequest>;
  errorHandler(
    signingProperties: Record<string, unknown>
  ): (error: Error) => never;
  successHandler(
    httpResponse: HttpResponse | unknown,
    signingProperties: Record<string, unknown>
  ): void;
}
export declare const AWSSDKSigV4Signer: typeof AwsSdkSigV4Signer;
export {};
