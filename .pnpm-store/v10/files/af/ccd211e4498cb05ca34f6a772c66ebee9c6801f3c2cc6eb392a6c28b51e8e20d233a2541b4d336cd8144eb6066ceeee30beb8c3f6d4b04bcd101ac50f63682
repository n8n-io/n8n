import { SignatureV4MultiRegion } from "@aws-sdk/signature-v4-multi-region";
import { S3ClientConfig } from "./S3Client";
/**
 * @internal
 */
export declare const getRuntimeConfig: (config: S3ClientConfig) => {
    apiVersion: string;
    base64Decoder: import("@smithy/types").Decoder;
    base64Encoder: (_input: Uint8Array | string) => string;
    disableHostPrefix: boolean;
    endpointProvider: (endpointParams: import("./endpoint/EndpointParameters").EndpointParameters, context?: {
        logger?: import("@smithy/types").Logger;
    }) => import("@smithy/types").EndpointV2;
    extensions: import("./runtimeExtensions").RuntimeExtension[];
    getAwsChunkedEncodingStream: import("@smithy/types").GetAwsChunkedEncodingStream<any> | import("@smithy/types").GetAwsChunkedEncodingStream<import("stream").Readable>;
    httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").S3HttpAuthSchemeProvider;
    httpAuthSchemes: import("@smithy/types").HttpAuthScheme[];
    logger: import("@smithy/types").Logger;
    sdkStreamMixin: import("@smithy/types").SdkStreamMixinInjector;
    serviceId: string;
    signerConstructor: (new (options: import("@smithy/signature-v4").SignatureV4Init & import("@smithy/signature-v4").SignatureV4CryptoInit) => import("@smithy/types").RequestSigner) | typeof SignatureV4MultiRegion;
    signingEscapePath: boolean;
    urlParser: import("@smithy/types").UrlParser;
    useArnRegion: boolean | import("@smithy/types").Provider<boolean>;
    utf8Decoder: import("@smithy/types").Decoder;
    utf8Encoder: (input: Uint8Array | string) => string;
};
