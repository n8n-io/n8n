import { AwsSdkSigV4Signer } from "@aws-sdk/core";
import { NoAuthSigner } from "@smithy/core";
import { IdentityProviderConfig } from "@smithy/types";
import { SigninClientConfig } from "./SigninClient";
/**
 * @internal
 */
export declare const getRuntimeConfig: (config: SigninClientConfig) => {
    apiVersion: string;
    base64Decoder: import("@smithy/types").Decoder;
    base64Encoder: (_input: Uint8Array | string) => string;
    disableHostPrefix: boolean;
    endpointProvider: (endpointParams: import("./endpoint/EndpointParameters").EndpointParameters, context?: {
        logger?: import("@smithy/types").Logger;
    }) => import("@smithy/types").EndpointV2;
    extensions: import("./runtimeExtensions").RuntimeExtension[];
    httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").SigninHttpAuthSchemeProvider;
    httpAuthSchemes: import("@smithy/types").HttpAuthScheme[] | ({
        schemeId: string;
        identityProvider: (ipc: IdentityProviderConfig) => import("@smithy/types").IdentityProvider<import("@smithy/types").Identity> | undefined;
        signer: AwsSdkSigV4Signer;
    } | {
        schemeId: string;
        identityProvider: (ipc: IdentityProviderConfig) => import("@smithy/types").IdentityProvider<import("@smithy/types").Identity> | (() => Promise<{}>);
        signer: NoAuthSigner;
    })[];
    logger: import("@smithy/types").Logger;
    protocol: import("@smithy/types").ClientProtocol<import("@smithy/types").HttpRequest, import("@smithy/types").HttpResponse>;
    serviceId: string;
    urlParser: import("@smithy/types").UrlParser;
    utf8Decoder: import("@smithy/types").Decoder;
    utf8Encoder: (input: Uint8Array | string) => string;
};
