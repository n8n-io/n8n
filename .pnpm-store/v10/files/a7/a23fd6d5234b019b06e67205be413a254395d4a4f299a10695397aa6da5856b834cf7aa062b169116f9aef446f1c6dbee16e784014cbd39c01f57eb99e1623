import { resolveAwsSdkSigV4Config, } from "@aws-sdk/core";
import { doesIdentityRequireRefresh, isIdentityExpired, memoizeIdentityProvider } from "@smithy/core";
import { getSmithyContext, normalizeProvider } from "@smithy/util-middleware";
export const defaultBedrockRuntimeHttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
        operation: getSmithyContext(context).operation,
        region: (await normalizeProvider(config.region)()) ||
            (() => {
                throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
            })(),
    };
};
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
export const defaultBedrockRuntimeHttpAuthSchemeProvider = (authParameters) => {
    const options = [];
    switch (authParameters.operation) {
        default: {
            options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
            options.push(createSmithyApiHttpBearerAuthHttpAuthOption(authParameters));
        }
    }
    return options;
};
export const resolveHttpAuthSchemeConfig = (config) => {
    const token = memoizeIdentityProvider(config.token, isIdentityExpired, doesIdentityRequireRefresh);
    const config_0 = resolveAwsSdkSigV4Config(config);
    return Object.assign(config_0, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? []),
        token,
    });
};
