"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeConfig = void 0;
const tslib_1 = require("tslib");
const package_json_1 = tslib_1.__importDefault(require("../package.json"));
const core_1 = require("@aws-sdk/core");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const eventstream_handler_node_1 = require("@aws-sdk/eventstream-handler-node");
const token_providers_1 = require("@aws-sdk/token-providers");
const util_user_agent_node_1 = require("@aws-sdk/util-user-agent-node");
const config_resolver_1 = require("@smithy/config-resolver");
const core_2 = require("@smithy/core");
const eventstream_serde_node_1 = require("@smithy/eventstream-serde-node");
const hash_node_1 = require("@smithy/hash-node");
const middleware_retry_1 = require("@smithy/middleware-retry");
const node_config_provider_1 = require("@smithy/node-config-provider");
const node_http_handler_1 = require("@smithy/node-http-handler");
const util_body_length_node_1 = require("@smithy/util-body-length-node");
const util_retry_1 = require("@smithy/util-retry");
const runtimeConfig_shared_1 = require("./runtimeConfig.shared");
const smithy_client_1 = require("@smithy/smithy-client");
const util_defaults_mode_node_1 = require("@smithy/util-defaults-mode-node");
const smithy_client_2 = require("@smithy/smithy-client");
const getRuntimeConfig = (config) => {
    (0, smithy_client_2.emitWarningIfUnsupportedVersion)(process.version);
    const defaultsMode = (0, util_defaults_mode_node_1.resolveDefaultsModeConfig)(config);
    const defaultConfigProvider = () => defaultsMode().then(smithy_client_1.loadConfigsForDefaultMode);
    const clientSharedValues = (0, runtimeConfig_shared_1.getRuntimeConfig)(config);
    (0, core_1.emitWarningIfUnsupportedVersion)(process.version);
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
        authSchemePreference: config?.authSchemePreference ?? (0, node_config_provider_1.loadConfig)(core_1.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? util_body_length_node_1.calculateBodyLength,
        credentialDefaultProvider: config?.credentialDefaultProvider ?? credential_provider_node_1.defaultProvider,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ??
            (0, util_user_agent_node_1.createDefaultUserAgentProvider)({ serviceId: clientSharedValues.serviceId, clientVersion: package_json_1.default.version }),
        eventStreamPayloadHandlerProvider: config?.eventStreamPayloadHandlerProvider ?? eventstream_handler_node_1.eventStreamPayloadHandlerProvider,
        eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? eventstream_serde_node_1.eventStreamSerdeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new core_1.AwsSdkSigV4Signer(),
            },
            {
                schemeId: "smithy.api#httpBearerAuth",
                identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth") ||
                    (async (idProps) => {
                        try {
                            return await (0, token_providers_1.fromEnvSigningName)({ signingName: "bedrock" })();
                        }
                        catch (error) {
                            return await (0, token_providers_1.nodeProvider)(idProps)(idProps);
                        }
                    }),
                signer: new core_2.HttpBearerAuthSigner(),
            },
        ],
        maxAttempts: config?.maxAttempts ?? (0, node_config_provider_1.loadConfig)(middleware_retry_1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ??
            (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_REGION_CONFIG_OPTIONS, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: node_http_handler_1.NodeHttp2Handler.create(config?.requestHandler ?? (async () => ({ ...(await defaultConfigProvider()), disableConcurrentStreams: true }))),
        retryMode: config?.retryMode ??
            (0, node_config_provider_1.loadConfig)({
                ...middleware_retry_1.NODE_RETRY_MODE_CONFIG_OPTIONS,
                default: async () => (await defaultConfigProvider()).retryMode || util_retry_1.DEFAULT_RETRY_MODE,
            }, config),
        sha256: config?.sha256 ?? hash_node_1.Hash.bind(null, "sha256"),
        streamCollector: config?.streamCollector ?? node_http_handler_1.streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? (0, node_config_provider_1.loadConfig)(util_user_agent_node_1.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
    };
};
exports.getRuntimeConfig = getRuntimeConfig;
