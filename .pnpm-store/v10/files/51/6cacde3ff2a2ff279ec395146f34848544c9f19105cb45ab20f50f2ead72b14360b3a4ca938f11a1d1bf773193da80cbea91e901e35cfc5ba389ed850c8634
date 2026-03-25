import packageInfo from "../package.json";
import { AwsSdkSigV4Signer, NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, emitWarningIfUnsupportedVersion as awsCheckVersion, } from "@aws-sdk/core";
import { defaultProvider as credentialDefaultProvider } from "@aws-sdk/credential-provider-node";
import { eventStreamPayloadHandlerProvider } from "@aws-sdk/eventstream-handler-node";
import { fromEnvSigningName, nodeProvider } from "@aws-sdk/token-providers";
import { NODE_APP_ID_CONFIG_OPTIONS, createDefaultUserAgentProvider } from "@aws-sdk/util-user-agent-node";
import { NODE_REGION_CONFIG_FILE_OPTIONS, NODE_REGION_CONFIG_OPTIONS, NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, } from "@smithy/config-resolver";
import { HttpBearerAuthSigner } from "@smithy/core";
import { eventStreamSerdeProvider } from "@smithy/eventstream-serde-node";
import { Hash } from "@smithy/hash-node";
import { NODE_MAX_ATTEMPT_CONFIG_OPTIONS, NODE_RETRY_MODE_CONFIG_OPTIONS } from "@smithy/middleware-retry";
import { loadConfig as loadNodeConfig } from "@smithy/node-config-provider";
import { NodeHttp2Handler as RequestHandler, streamCollector } from "@smithy/node-http-handler";
import { calculateBodyLength } from "@smithy/util-body-length-node";
import { DEFAULT_RETRY_MODE } from "@smithy/util-retry";
import { getRuntimeConfig as getSharedRuntimeConfig } from "./runtimeConfig.shared";
import { loadConfigsForDefaultMode } from "@smithy/smithy-client";
import { resolveDefaultsModeConfig } from "@smithy/util-defaults-mode-node";
import { emitWarningIfUnsupportedVersion } from "@smithy/smithy-client";
export const getRuntimeConfig = (config) => {
    emitWarningIfUnsupportedVersion(process.version);
    const defaultsMode = resolveDefaultsModeConfig(config);
    const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
    const clientSharedValues = getSharedRuntimeConfig(config);
    awsCheckVersion(process.version);
    const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger,
        signingName: "bedrock",
    };
    return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadNodeConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        credentialDefaultProvider: config?.credentialDefaultProvider ?? credentialDefaultProvider,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ??
            createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: packageInfo.version }),
        eventStreamPayloadHandlerProvider: config?.eventStreamPayloadHandlerProvider ?? eventStreamPayloadHandlerProvider,
        eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? eventStreamSerdeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new AwsSdkSigV4Signer(),
            },
            {
                schemeId: "smithy.api#httpBearerAuth",
                identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth") ||
                    (async (idProps) => {
                        try {
                            return await fromEnvSigningName({ signingName: "bedrock" })();
                        }
                        catch (error) {
                            return await nodeProvider(idProps)(idProps);
                        }
                    }),
                signer: new HttpBearerAuthSigner(),
            },
        ],
        maxAttempts: config?.maxAttempts ?? loadNodeConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ??
            loadNodeConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: RequestHandler.create(config?.requestHandler ?? (async () => ({ ...(await defaultConfigProvider()), disableConcurrentStreams: true }))),
        retryMode: config?.retryMode ??
            loadNodeConfig({
                ...NODE_RETRY_MODE_CONFIG_OPTIONS,
                default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE,
            }, config),
        sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
        streamCollector: config?.streamCollector ?? streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadNodeConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadNodeConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadNodeConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
    };
};
