"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHttpAuthSchemeConfig = exports.defaultBedrockRuntimeHttpAuthSchemeProvider = exports.defaultBedrockRuntimeHttpAuthSchemeParametersProvider = void 0;
const core_1 = require("@aws-sdk/core");
const core_2 = require("@smithy/core");
const util_middleware_1 = require("@smithy/util-middleware");
const defaultBedrockRuntimeHttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
        operation: (0, util_middleware_1.getSmithyContext)(context).operation,
        region: (await (0, util_middleware_1.normalizeProvider)(config.region)()) ||
            (() => {
                throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
            })(),
    };
};
exports.defaultBedrockRuntimeHttpAuthSchemeParametersProvider = defaultBedrockRuntimeHttpAuthSchemeParametersProvider;
function createAwsAuthSigv4HttpAuthOption(authParameters) {
    return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
            name: "bedrock",
            region: authParameters.region,
        },
        propertiesExtractor: (config, context) => ({
            signingProperties: {
                config,
                context,
            },
        }),
    };
}
function createSmithyApiHttpBearerAuthHttpAuthOption(authParameters) {
    return {
        schemeId: "smithy.api#httpBearerAuth",
        propertiesExtractor: ({ profile, filepath, configFilepath, ignoreCache }, context) => ({
            identityProperties: {
                profile,
                filepath,
                configFilepath,
                ignoreCache,
            },
        }),
    };
}
const defaultBedrockRuntimeHttpAuthSchemeProvider = (authParameters) => {
    const options = [];
    switch (authParameters.operation) {
        default: {
            options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
            options.push(createSmithyApiHttpBearerAuthHttpAuthOption(authParameters));
        }
    }
    return options;
};
exports.defaultBedrockRuntimeHttpAuthSchemeProvider = defaultBedrockRuntimeHttpAuthSchemeProvider;
const resolveHttpAuthSchemeConfig = (config) => {
    const token = (0, core_2.memoizeIdentityProvider)(config.token, core_2.isIdentityExpired, core_2.doesIdentityRequireRefresh);
    const config_0 = (0, core_1.resolveAwsSdkSigV4Config)(config);
    return Object.assign(config_0, {
        authSchemePreference: (0, util_middleware_1.normalizeProvider)(config.authSchemePreference ?? []),
        token,
    });
};
exports.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;
