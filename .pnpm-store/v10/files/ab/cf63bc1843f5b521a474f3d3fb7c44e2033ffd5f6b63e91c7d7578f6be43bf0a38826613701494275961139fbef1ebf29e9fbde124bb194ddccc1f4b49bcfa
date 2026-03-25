import { S3ClientConfig } from "./S3Client";
export declare const getRuntimeConfig: (config: S3ClientConfig) => {
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
  useDualstackEndpoint: boolean | import("@smithy/types").Provider<boolean>;
  useFipsEndpoint: boolean | import("@smithy/types").Provider<boolean>;
  region: string | import("@smithy/types").Provider<any>;
  profile?: string;
  defaultUserAgentProvider: (
    config?: import("@aws-sdk/util-user-agent-browser").PreviouslyResolved
  ) => Promise<import("@smithy/types").UserAgent>;
  streamHasher:
    | import("@smithy/types").StreamHasher<import("stream").Readable>
    | import("@smithy/types").StreamHasher<Blob>;
  md5: import("@smithy/types").HashConstructor;
  sha1: import("@smithy/types").HashConstructor;
  getAwsChunkedEncodingStream:
    | import("@smithy/types").GetAwsChunkedEncodingStream<any>
    | import("@smithy/types").GetAwsChunkedEncodingStream<
        import("stream").Readable
      >;
  credentialDefaultProvider:
    | ((input: any) => import("@smithy/types").AwsCredentialIdentityProvider)
    | ((
        _: unknown
      ) => () => Promise<import("@smithy/types").AwsCredentialIdentity>);
  maxAttempts: number | import("@smithy/types").Provider<number>;
  retryMode: string | import("@smithy/types").Provider<string>;
  logger: import("@smithy/types").Logger;
  extensions: import("./runtimeExtensions").RuntimeExtension[];
  eventStreamSerdeProvider: import("@smithy/types").EventStreamSerdeProvider;
  defaultsMode:
    | import("@smithy/smithy-client").DefaultsMode
    | import("@smithy/types").Provider<
        import("@smithy/smithy-client").DefaultsMode
      >;
  signingEscapePath: boolean;
  useArnRegion: boolean | import("@smithy/types").Provider<boolean>;
  sdkStreamMixin: import("@smithy/types").SdkStreamMixinInjector;
  customUserAgent?: string | import("@smithy/types").UserAgent;
  userAgentAppId?:
    | string
    | undefined
    | import("@smithy/types").Provider<string | undefined>;
  requestChecksumCalculation?:
    | import("@aws-sdk/middleware-flexible-checksums").RequestChecksumCalculation
    | import("@smithy/types").Provider<
        import("@aws-sdk/middleware-flexible-checksums").RequestChecksumCalculation
      >;
  responseChecksumValidation?:
    | import("@aws-sdk/middleware-flexible-checksums").ResponseChecksumValidation
    | import("@smithy/types").Provider<
        import("@aws-sdk/middleware-flexible-checksums").ResponseChecksumValidation
      >;
  requestStreamBufferSize?: number | false;
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
  httpAuthSchemes: import("@smithy/types").HttpAuthScheme[];
  httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").S3HttpAuthSchemeProvider;
  credentials?:
    | import("@smithy/types").AwsCredentialIdentity
    | import("@smithy/types").AwsCredentialIdentityProvider;
  signer?:
    | import("@smithy/types").RequestSigner
    | ((
        authScheme?: import("@smithy/types").AuthScheme
      ) => Promise<import("@smithy/types").RequestSigner>);
  systemClockOffset?: number;
  signingRegion?: string;
  signerConstructor:
    | (new (
        options: import("@smithy/signature-v4").SignatureV4Init &
          import("@smithy/signature-v4").SignatureV4CryptoInit
      ) => import("@smithy/types").RequestSigner)
    | typeof import("@aws-sdk/signature-v4-multi-region").SignatureV4MultiRegion;
  sigv4aSigningRegionSet?:
    | string[]
    | undefined
    | import("@smithy/types").Provider<string[] | undefined>;
  forcePathStyle?:
    | (boolean & (boolean | import("@smithy/types").Provider<boolean>))
    | undefined;
  useAccelerateEndpoint?:
    | (boolean & (boolean | import("@smithy/types").Provider<boolean>))
    | undefined;
  disableMultiregionAccessPoints?:
    | (boolean & (boolean | import("@smithy/types").Provider<boolean>))
    | undefined;
  followRegionRedirects?: boolean;
  s3ExpressIdentityProvider?: import("@aws-sdk/middleware-sdk-s3").S3ExpressIdentityProvider;
  bucketEndpoint?: boolean;
  useGlobalEndpoint?: boolean | import("@smithy/types").Provider<boolean>;
  disableS3ExpressSessionAuth?:
    | boolean
    | import("@smithy/types").Provider<boolean>;
};
