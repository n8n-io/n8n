import { SSOClientConfig } from "./SSOClient";
export declare const getRuntimeConfig: (config: SSOClientConfig) => {
  runtime: string;
  sha256: import("@smithy/types").HashConstructor;
  requestHandler:
    | import("@smithy/types").NodeHttpHandlerOptions
    | import("@smithy/types").FetchHttpHandlerOptions
    | Record<string, unknown>
    | import("@smithy/protocol-http").HttpHandler<any>
    | import("@smithy/fetch-http-handler").FetchHttpHandler;
  apiVersion: string;
  cacheMiddleware?: boolean;
  urlParser: import("@smithy/types").UrlParser;
  bodyLengthChecker: import("@smithy/types").BodyLengthCalculator;
  streamCollector: import("@smithy/types").StreamCollector;
  base64Decoder: import("@smithy/types").Decoder;
  base64Encoder: (_input: Uint8Array | string) => string;
  utf8Decoder: import("@smithy/types").Decoder;
  utf8Encoder: (input: Uint8Array | string) => string;
  disableHostPrefix: boolean;
  serviceId: string;
  useDualstackEndpoint: (boolean | import("@smithy/types").Provider<boolean>) &
    (boolean | import("@smithy/types").Provider<boolean | undefined>);
  useFipsEndpoint: (boolean | import("@smithy/types").Provider<boolean>) &
    (boolean | import("@smithy/types").Provider<boolean | undefined>);
  region: string | import("@smithy/types").Provider<any>;
  profile?: string;
  defaultUserAgentProvider: (
    config?: import("@aws-sdk/util-user-agent-browser").PreviouslyResolved
  ) => Promise<import("@smithy/types").UserAgent>;
  maxAttempts: number | import("@smithy/types").Provider<number>;
  retryMode: string | import("@smithy/types").Provider<string>;
  logger: import("@smithy/types").Logger;
  extensions: import("./runtimeExtensions").RuntimeExtension[];
  defaultsMode:
    | import("@smithy/smithy-client").DefaultsMode
    | import("@smithy/types").Provider<
        import("@smithy/smithy-client").DefaultsMode
      >;
  customUserAgent?: string | import("@smithy/types").UserAgent;
  userAgentAppId?:
    | string
    | undefined
    | import("@smithy/types").Provider<string | undefined>;
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
  authSchemePreference?: string[] | import("@smithy/types").Provider<string[]>;
  httpAuthSchemes:
    | import("@smithy/types").HttpAuthScheme[]
    | (
        | {
            schemeId: string;
            identityProvider: (
              ipc: import("@smithy/types").IdentityProviderConfig
            ) =>
              | import("@smithy/types").IdentityProvider<
                  import("@smithy/types").Identity
                >
              | undefined;
            signer: import("@aws-sdk/core").AwsSdkSigV4Signer;
          }
        | {
            schemeId: string;
            identityProvider: (
              ipc: import("@smithy/types").IdentityProviderConfig
            ) =>
              | import("@smithy/types").IdentityProvider<
                  import("@smithy/types").Identity
                >
              | (() => Promise<{}>);
            signer: import("@smithy/core").NoAuthSigner;
          }
      )[];
  httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").SSOHttpAuthSchemeProvider;
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
  signerConstructor?: new (
    options: import("@smithy/signature-v4").SignatureV4Init &
      import("@smithy/signature-v4").SignatureV4CryptoInit
  ) => import("@smithy/types").RequestSigner;
};
