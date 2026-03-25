import { AuthScheme, AwsCredentialIdentity, HttpRequest as IHttpRequest, HttpResponse, HttpSigner, RequestSigner } from "@smithy/types";
import { AwsSdkSigV4AAuthResolvedConfig } from "./resolveAwsSdkSigV4AConfig";
/**
 * @internal
 */
interface AwsSdkSigV4Config extends AwsSdkSigV4AAuthResolvedConfig {
    systemClockOffset: number;
    signer: (authScheme?: AuthScheme) => Promise<RequestSigner>;
}
/**
 * @internal
 */
interface AwsSdkSigV4AuthSigningProperties {
    config: AwsSdkSigV4Config;
    signer: RequestSigner;
    signingRegion?: string;
    signingRegionSet?: string[];
    signingName?: string;
}
/**
 * @internal
 */
export declare const validateSigningProperties: (signingProperties: Record<string, unknown>) => Promise<AwsSdkSigV4AuthSigningProperties>;
/**
 * Note: this is not a signing algorithm implementation. The sign method
 * accepts the real signer as an input parameter.
 * @internal
 */
export declare class AwsSdkSigV4Signer implements HttpSigner {
    sign(httpRequest: IHttpRequest, 
    /**
     * `identity` is bound in {@link resolveAWSSDKSigV4Config}
     */
    identity: AwsCredentialIdentity, signingProperties: Record<string, unknown>): Promise<IHttpRequest>;
    errorHandler(signingProperties: Record<string, unknown>): (error: Error) => never;
    successHandler(httpResponse: HttpResponse | unknown, signingProperties: Record<string, unknown>): void;
}
/**
 * @internal
 * @deprecated renamed to {@link AwsSdkSigV4Signer}
 */
export declare const AWSSDKSigV4Signer: typeof AwsSdkSigV4Signer;
export {};
