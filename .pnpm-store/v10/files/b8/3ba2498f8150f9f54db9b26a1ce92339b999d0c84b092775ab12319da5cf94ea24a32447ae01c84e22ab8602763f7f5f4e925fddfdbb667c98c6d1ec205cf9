import { FetchHttpHandler as RequestHandler } from "@smithy/fetch-http-handler";
import { SigninClientConfig } from "./SigninClient";
/**
 * @internal
 */
export declare const getRuntimeConfig: (config: SigninClientConfig) => {
    runtime: string;
    defaultsMode: import("@smithy/types").Provider<import("@smithy/smithy-client").ResolvedDefaultsMode>;
    bodyLengthChecker: import("@smithy/types").BodyLengthCalculator;
    credentialDefaultProvider: ((input: any) => import("@smithy/types").AwsCredentialIdentityProvider) | ((_: unknown) => () => Promise<import("@smithy/types").AwsCredentialIdentity>);
    defaultUserAgentProvider: (config?: import("@aws-sdk/util-user-agent-browser").PreviouslyResolved) => Promise<import("@smithy/types").UserAgent>;
    maxAttempts: number | import("@smithy/types").Provider<number>;
    region: string | import("@smithy/types").Provider<any>;
    requestHandler: import("@smithy/protocol-http").HttpHandler<any> | RequestHandler;
    retryMode: string | import("@smithy/types").Provider<string>;
    sha256: import("@smithy/types").HashConstructor;
    streamCollector: import("@smithy/types").StreamCollector;
    useDualstackEndpoint: (boolean | import("@smithy/types").Provider<boolean>) & (boolean | import("@smithy/types").Provider<boolean | undefined>);
    useFipsEndpoint: (boolean | import("@smithy/types").Provider<boolean>) & (boolean | import("@smithy/types").Provider<boolean | undefined>);
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
    protocol: import("@smithy/types").ClientProtocol<import("@smithy/types").HttpRequest, import("@smithy/types").HttpResponse>;
    customUserAgent?: string | import("@smithy/types").UserAgent;
    userAgentAppId?: string | undefined | import("@smithy/types").Provider<string | undefined>;
    retryStrategy?: import("@smithy/types").RetryStrategy | import("@smithy/types").RetryStrategyV2;
    endpoint?: ((string | import("@smithy/types").Endpoint | import("@smithy/types").Provider<import("@smithy/types").Endpoint> | import("@smithy/types").EndpointV2 | import("@smithy/types").Provider<import("@smithy/types").EndpointV2>) & (string | import("@smithy/types").Provider<string> | import("@smithy/types").Endpoint | import("@smithy/types").Provider<import("@smithy/types").Endpoint> | import("@smithy/types").EndpointV2 | import("@smithy/types").Provider<import("@smithy/types").EndpointV2>)) | undefined;
    endpointProvider: (endpointParams: import("./endpoint/EndpointParameters").EndpointParameters, context?: {
        logger?: import("@smithy/types").Logger;
    }) => import("@smithy/types").EndpointV2;
    tls?: boolean;
    serviceConfiguredEndpoint?: never;
    authSchemePreference?: string[] | import("@smithy/types").Provider<string[]>;
    httpAuthSchemes: import("@smithy/types").HttpAuthScheme[] | ({
        schemeId: string;
        identityProvider: (ipc: import("@smithy/types").IdentityProviderConfig) => import("@smithy/types").IdentityProvider<import("@smithy/types").Identity> | undefined;
        signer: import("@aws-sdk/core").AwsSdkSigV4Signer;
    } | {
        schemeId: string;
        identityProvider: (ipc: import("@smithy/types").IdentityProviderConfig) => import("@smithy/types").IdentityProvider<import("@smithy/types").Identity> | (() => Promise<{}>);
        signer: import("@smithy/core").NoAuthSigner;
    })[];
    httpAuthSchemeProvider: import("./auth/httpAuthSchemeProvider").SigninHttpAuthSchemeProvider;
    credentials?: import("@smithy/types").AwsCredentialIdentity | import("@smithy/types").AwsCredentialIdentityProvider;
    signer?: import("@smithy/types").RequestSigner | ((authScheme?: import("@smithy/types").AuthScheme) => Promise<import("@smithy/types").RequestSigner>);
    signingEscapePath?: boolean;
    systemClockOffset?: number;
    signingRegion?: string;
    signerConstructor?: new (options: import("@smithy/signature-v4").SignatureV4Init & import("@smithy/signature-v4").SignatureV4CryptoInit) => import("@smithy/types").RequestSigner;
};
