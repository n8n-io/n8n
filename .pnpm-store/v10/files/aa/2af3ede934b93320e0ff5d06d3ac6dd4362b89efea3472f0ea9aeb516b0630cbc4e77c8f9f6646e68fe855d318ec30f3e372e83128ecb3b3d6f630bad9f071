import { AwsJson1_1Protocol } from "@aws-sdk/core/protocols";
import type { KendraClientConfig } from "./KendraClient";
/**
 * @internal
 */
export declare const getRuntimeConfig: (config: KendraClientConfig) => {
    apiVersion: string;
    base64Decoder: import("@smithy/types").Decoder;
    base64Encoder: (_input: Uint8Array | string) => string;
    disableHostPrefix: boolean;
    endpointProvider: (endpointParams: import("./endpoint/EndpointParameters").EndpointParameters, context?: {
        logger?: import("@smithy/types").Logger;
    }) => import("@smithy/types").EndpointV2;
    extensions: import("./runtimeExtensions").RuntimeExtension[];
    httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").KendraHttpAuthSchemeProvider;
    httpAuthSchemes: import("@smithy/types").HttpAuthScheme[];
    logger: import("@smithy/types").Logger;
    protocol: import("@smithy/types").ClientProtocol<any, any> | import("@smithy/types").ClientProtocolCtor<any, any> | typeof AwsJson1_1Protocol;
    protocolSettings: {
        [setting: string]: unknown;
        defaultNamespace?: string;
    };
    serviceId: string;
    urlParser: import("@smithy/types").UrlParser;
    utf8Decoder: import("@smithy/types").Decoder;
    utf8Encoder: (input: Uint8Array | string) => string;
};
