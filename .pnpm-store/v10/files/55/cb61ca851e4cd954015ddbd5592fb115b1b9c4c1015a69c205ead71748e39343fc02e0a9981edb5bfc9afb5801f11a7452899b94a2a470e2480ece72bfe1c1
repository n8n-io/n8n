import { SignatureV4MultiRegion } from "@aws-sdk/signature-v4-multi-region";
import { SESv2ClientConfig } from "./SESv2Client";
export declare const getRuntimeConfig: (config: SESv2ClientConfig) => {
  apiVersion: string;
  base64Decoder: import("@smithy/types").Decoder;
  base64Encoder: (_input: Uint8Array | string) => string;
  disableHostPrefix: boolean;
  endpointProvider: (
    endpointParams: import("./endpoint/EndpointParameters").EndpointParameters,
    context?: {
      logger?: import("@smithy/types").Logger;
    }
  ) => import("@smithy/types").EndpointV2;
  extensions: import("./runtimeExtensions").RuntimeExtension[];
  httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").SESv2HttpAuthSchemeProvider;
  httpAuthSchemes: import("@smithy/types").HttpAuthScheme[];
  logger: import("@smithy/types").Logger;
  serviceId: string;
  signerConstructor:
    | typeof SignatureV4MultiRegion
    | (new (
        options: import("@smithy/signature-v4").SignatureV4Init &
          import("@smithy/signature-v4").SignatureV4CryptoInit
      ) => import("@smithy/types").RequestSigner);
  urlParser: import("@smithy/types").UrlParser;
  utf8Decoder: import("@smithy/types").Decoder;
  utf8Encoder: (input: Uint8Array | string) => string;
};
