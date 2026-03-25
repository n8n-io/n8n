import { IHttpRequest } from "@smithy/protocol-http";
import { AuthScheme, AwsCredentialIdentity, FinalizeRequestMiddleware, Pluggable, RequestSigner } from "@smithy/types";
interface SigningProperties {
    signingRegion: string;
    signingDate: Date;
    signingService: string;
}
interface PreviouslyResolved {
    signer: (authScheme?: AuthScheme | undefined) => Promise<RequestSigner & {
        signWithCredentials(req: IHttpRequest, identity: AwsCredentialIdentity, opts?: Partial<SigningProperties>): Promise<IHttpRequest>;
    }>;
}
/**
 * @internal
 */
export declare const s3ExpressHttpSigningMiddlewareOptions: import("@smithy/types").FinalizeRequestHandlerOptions & import("@smithy/types").RelativeLocation & Omit<import("@smithy/types").HandlerOptions, "step">;
/**
 * @internal
 */
export declare const s3ExpressHttpSigningMiddleware: <Input extends object, Output extends object>(config: PreviouslyResolved) => FinalizeRequestMiddleware<any, any>;
/**
 * @internal
 */
export declare const getS3ExpressHttpSigningPlugin: (config: {
    signer: (authScheme?: AuthScheme | undefined) => Promise<RequestSigner>;
}) => Pluggable<any, any>;
export {};
