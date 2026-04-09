import { resolveEventStreamConfig, } from "@aws-sdk/middleware-eventstream";
import { getHostHeaderPlugin, resolveHostHeaderConfig, } from "@aws-sdk/middleware-host-header";
import { getLoggerPlugin } from "@aws-sdk/middleware-logger";
import { getRecursionDetectionPlugin } from "@aws-sdk/middleware-recursion-detection";
import { getUserAgentPlugin, resolveUserAgentConfig, } from "@aws-sdk/middleware-user-agent";
import { resolveWebSocketConfig, } from "@aws-sdk/middleware-websocket";
import { resolveRegionConfig } from "@smithy/config-resolver";
import { DefaultIdentityProviderConfig, getHttpAuthSchemeEndpointRuleSetPlugin, getHttpSigningPlugin, } from "@smithy/core";
import { getSchemaSerdePlugin } from "@smithy/core/schema";
import { resolveEventStreamSerdeConfig, } from "@smithy/eventstream-serde-config-resolver";
import { getContentLengthPlugin } from "@smithy/middleware-content-length";
import { resolveEndpointConfig, } from "@smithy/middleware-endpoint";
import { getRetryPlugin, resolveRetryConfig, } from "@smithy/middleware-retry";
import { Client as __Client, } from "@smithy/smithy-client";
import { defaultBedrockRuntimeHttpAuthSchemeParametersProvider, resolveHttpAuthSchemeConfig, } from "./auth/httpAuthSchemeProvider";
import { resolveClientEndpointParameters, } from "./endpoint/EndpointParameters";
import { getRuntimeConfig as __getRuntimeConfig } from "./runtimeConfig";
import { resolveRuntimeExtensions } from "./runtimeExtensions";
export { __Client };
export class BedrockRuntimeClient extends __Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = __getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveEventStreamSerdeConfig(_config_6);
        const _config_8 = resolveHttpAuthSchemeConfig(_config_7);
        const _config_9 = resolveEventStreamConfig(_config_8);
        const _config_10 = resolveWebSocketConfig(_config_9);
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "smithy.api#httpBearerAuth": config.token,
            }),
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}
