import { NodeHttpHandler as RequestHandler } from "@smithy/node-http-handler";
import { SESv2ClientConfig } from "./SESv2Client";
export declare const getRuntimeConfig: (config: SESv2ClientConfig) => {
  runtime: string;
  defaultsMode: import("@smithy/types").Provider<
    import("@smithy/smithy-client").ResolvedDefaultsMode
  >;
  authSchemePreference: string[] | import("@smithy/types").Provider<string[]>;
  bodyLengthChecker: import("@smithy/types").BodyLengthCalculator;
  credentialDefaultProvider:
    | ((input: any) => import("@smithy/types").AwsCredentialIdentityProvider)
    | ((
        init?: import("@aws-sdk/credential-provider-node").DefaultProviderInit
      ) => import("@smithy/types").MemoizedProvider<
        import("@smithy/types").AwsCredentialIdentity
      >);
  defaultUserAgentProvider: (
    config?: import("@aws-sdk/util-user-agent-node").PreviouslyResolved
  ) => Promise<import("@smithy/types").UserAgent>;
  maxAttempts: number | import("@smithy/types").Provider<number>;
  region: string | import("@smithy/types").Provider<string>;
  requestHandler:
    | RequestHandler
    | import("@smithy/protocol-http").HttpHandler<any>;
  retryMode: string | import("@smithy/types").Provider<string>;
  sha256: import("@smithy/types").HashConstructor;
  sigv4aSigningRegionSet:
    | string[]
    | import("@smithy/types").Provider<string[] | undefined>;
  streamCollector: import("@smithy/types").StreamCollector;
  useDualstackEndpoint: boolean | import("@smithy/types").Provider<boolean>;
  useFipsEndpoint: boolean | import("@smithy/types").Provider<boolean>;
  userAgentAppId: string | import("@smithy/types").Provider<string | undefined>;
  apiVersion: string;
  cacheMiddleware?: boolean | undefined;
  urlParser: import("@smithy/types").UrlParser;
  base64Decoder: import("@smithy/types").Decoder;
  base64Encoder: (_input: Uint8Array | string) => string;
  utf8Decoder: import("@smithy/types").Decoder;
  utf8Encoder: (input: Uint8Array | string) => string;
  disableHostPrefix: boolean;
  serviceId: string;
  profile?: string;
  logger: import("@smithy/types").Logger;
  extensions: import("./runtimeExtensions").RuntimeExtension[];
  customUserAgent?: string | import("@smithy/types").UserAgent;
  retryStrategy?:
    | import("@smithy/types").RetryStrategy
    | import("@smithy/types").RetryStrategyV2;
  endpoint?:
    | ((
        | string
        | import("@smithy/types").Endpoint
        | import("@smithy/types").Provider<import("@smithy/types").Endpoint>
        | import("@smithy/types").EndpointV2
        | import("@smithy/types").Provider<import("@smithy/types").EndpointV2>
      ) &
        (
          | string
          | import("@smithy/types").Provider<string>
          | import("@smithy/types").Endpoint
          | import("@smithy/types").Provider<import("@smithy/types").Endpoint>
          | import("@smithy/types").EndpointV2
          | import("@smithy/types").Provider<import("@smithy/types").EndpointV2>
        ))
    | undefined;
  endpointProvider: (
    endpointParams: import("./endpoint/EndpointParameters").EndpointParameters,
    context?: {
      logger?: import("@smithy/types").Logger;
    }
  ) => import("@smithy/types").EndpointV2;
  tls?: boolean;
  serviceConfiguredEndpoint?: never;
  httpAuthSchemes: import("@smithy/types").HttpAuthScheme[];
  httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").SESv2HttpAuthSchemeProvider;
  credentials?:
    | import("@smithy/types").AwsCredentialIdentity
    | import("@smithy/types").AwsCredentialIdentityProvider;
  signer?:
    | import("@smithy/types").RequestSigner
    | ((
        authScheme?: import("@smithy/types").AuthScheme
      ) => Promise<import("@smithy/types").RequestSigner>);
  signingEscapePath?: boolean;
  systemClockOffset?: number;
  signingRegion?: string;
  signerConstructor:
    | typeof import("@aws-sdk/signature-v4-multi-region").SignatureV4MultiRegion
    | (new (
        options: import("@smithy/signature-v4").SignatureV4Init &
          import("@smithy/signature-v4").SignatureV4CryptoInit
      ) => import("@smithy/types").RequestSigner);
};
