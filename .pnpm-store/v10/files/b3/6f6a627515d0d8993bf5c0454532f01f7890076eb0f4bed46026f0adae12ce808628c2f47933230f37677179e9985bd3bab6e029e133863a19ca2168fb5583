import { AwsSdkSigV4ASigner, AwsSdkSigV4Signer } from "@aws-sdk/core";
import { SignatureV4MultiRegion } from "@aws-sdk/signature-v4-multi-region";
import { NoOpLogger } from "@smithy/smithy-client";
import { parseUrl } from "@smithy/url-parser";
import { fromBase64, toBase64 } from "@smithy/util-base64";
import { getAwsChunkedEncodingStream, sdkStreamMixin } from "@smithy/util-stream";
import { fromUtf8, toUtf8 } from "@smithy/util-utf8";
import { defaultS3HttpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider";
import { defaultEndpointResolver } from "./endpoint/endpointResolver";
export const getRuntimeConfig = (config) => {
    return {
        apiVersion: "2006-03-01",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        getAwsChunkedEncodingStream: config?.getAwsChunkedEncodingStream ?? getAwsChunkedEncodingStream,
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultS3HttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new AwsSdkSigV4Signer(),
            },
            {
                schemeId: "aws.auth#sigv4a",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"),
                signer: new AwsSdkSigV4ASigner(),
            },
        ],
        logger: config?.logger ?? new NoOpLogger(),
        sdkStreamMixin: config?.sdkStreamMixin ?? sdkStreamMixin,
        serviceId: config?.serviceId ?? "S3",
        signerConstructor: config?.signerConstructor ?? SignatureV4MultiRegion,
        signingEscapePath: config?.signingEscapePath ?? false,
        urlParser: config?.urlParser ?? parseUrl,
        useArnRegion: config?.useArnRegion ?? false,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8,
    };
};
