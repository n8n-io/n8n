import { getAddExpectContinuePlugin } from "@aws-sdk/middleware-expect-continue";
import { resolveFlexibleChecksumsConfig, } from "@aws-sdk/middleware-flexible-checksums";
import { getHostHeaderPlugin, resolveHostHeaderConfig, } from "@aws-sdk/middleware-host-header";
import { getLoggerPlugin } from "@aws-sdk/middleware-logger";
import { getRecursionDetectionPlugin } from "@aws-sdk/middleware-recursion-detection";
import { getRegionRedirectMiddlewarePlugin, getS3ExpressHttpSigningPlugin, getS3ExpressPlugin, getValidateBucketNamePlugin, resolveS3Config, } from "@aws-sdk/middleware-sdk-s3";
import { getUserAgentPlugin, resolveUserAgentConfig, } from "@aws-sdk/middleware-user-agent";
import { resolveRegionConfig } from "@smithy/config-resolver";
import { DefaultIdentityProviderConfig, getHttpAuthSchemeEndpointRuleSetPlugin, getHttpSigningPlugin, } from "@smithy/core";
import { resolveEventStreamSerdeConfig, } from "@smithy/eventstream-serde-config-resolver";
import { getContentLengthPlugin } from "@smithy/middleware-content-length";
import { resolveEndpointConfig } from "@smithy/middleware-endpoint";
import { getRetryPlugin, resolveRetryConfig } from "@smithy/middleware-retry";
import { Client as __Client, } from "@smithy/smithy-client";
import { defaultS3HttpAuthSchemeParametersProvider, resolveHttpAuthSchemeConfig, } from "./auth/httpAuthSchemeProvider";
import { CreateSessionCommand, } from "./commands/CreateSessionCommand";
import { resolveClientEndpointParameters, } from "./endpoint/EndpointParameters";
import { getRuntimeConfig as __getRuntimeConfig } from "./runtimeConfig";
import { resolveRuntimeExtensions } from "./runtimeExtensions";
export { __Client };
export class S3Client extends __Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = __getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveFlexibleChecksumsConfig(_config_2);
        const _config_4 = resolveRetryConfig(_config_3);
        const _config_5 = resolveRegionConfig(_config_4);
        const _config_6 = resolveHostHeaderConfig(_config_5);
        const _config_7 = resolveEndpointConfig(_config_6);
        const _config_8 = resolveEventStreamSerdeConfig(_config_7);
        const _config_9 = resolveHttpAuthSchemeConfig(_config_8);
        const _config_10 = resolveS3Config(_config_9, { session: [() => this, CreateSessionCommand] });
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: defaultS3HttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "aws.auth#sigv4a": config.credentials,
            }),
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
        this.middlewareStack.use(getValidateBucketNamePlugin(this.config));
        this.middlewareStack.use(getAddExpectContinuePlugin(this.config));
        this.middlewareStack.use(getRegionRedirectMiddlewarePlugin(this.config));
        this.middlewareStack.use(getS3ExpressPlugin(this.config));
        this.middlewareStack.use(getS3ExpressHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}
