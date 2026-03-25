import { resolveAwsSdkSigV4AConfig, resolveAwsSdkSigV4Config, } from "@aws-sdk/core";
import { SignatureV4MultiRegion } from "@aws-sdk/signature-v4-multi-region";
import { resolveParams } from "@smithy/middleware-endpoint";
import { getSmithyContext, normalizeProvider } from "@smithy/util-middleware";
import { defaultEndpointResolver } from "../endpoint/endpointResolver";
const createEndpointRuleSetHttpAuthSchemeParametersProvider = (defaultHttpAuthSchemeParametersProvider) => async (config, context, input) => {
    if (!input) {
        throw new Error(`Could not find \`input\` for \`defaultEndpointRuleSetHttpAuthSchemeParametersProvider\``);
    }
    const defaultParameters = await defaultHttpAuthSchemeParametersProvider(config, context, input);
    const instructionsFn = getSmithyContext(context)?.commandInstance?.constructor
        ?.getEndpointParameterInstructions;
    if (!instructionsFn) {
        throw new Error(`getEndpointParameterInstructions() is not defined on \`${context.commandName}\``);
    }
    const endpointParameters = await resolveParams(input, { getEndpointParameterInstructions: instructionsFn }, config);
    return Object.assign(defaultParameters, endpointParameters);
};
const _defaultSESv2HttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
        operation: getSmithyContext(context).operation,
        region: (await normalizeProvider(config.region)()) ||
            (() => {
                throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
            })(),
    };
};
export const defaultSESv2HttpAuthSchemeParametersProvider = createEndpointRuleSetHttpAuthSchemeParametersProvider(_defaultSESv2HttpAuthSchemeParametersProvider);
function createAwsAuthSigv4HttpAuthOption(authParameters) {
    return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
            name: "ses",
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
function createAwsAuthSigv4aHttpAuthOption(authParameters) {
    return {
        schemeId: "aws.auth#sigv4a",
        signingProperties: {
            name: "ses",
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
const createEndpointRuleSetHttpAuthSchemeProvider = (defaultEndpointResolver, defaultHttpAuthSchemeResolver, createHttpAuthOptionFunctions) => {
    const endpointRuleSetHttpAuthSchemeProvider = (authParameters) => {
        const endpoint = defaultEndpointResolver(authParameters);
        const authSchemes = endpoint.properties?.authSchemes;
        if (!authSchemes) {
            return defaultHttpAuthSchemeResolver(authParameters);
        }
        const options = [];
        for (const scheme of authSchemes) {
            const { name: resolvedName, properties = {}, ...rest } = scheme;
            const name = resolvedName.toLowerCase();
            if (resolvedName !== name) {
                console.warn(`HttpAuthScheme has been normalized with lowercasing: \`${resolvedName}\` to \`${name}\``);
            }
            let schemeId;
            if (name === "sigv4a") {
                schemeId = "aws.auth#sigv4a";
                const sigv4Present = authSchemes.find((s) => {
                    const name = s.name.toLowerCase();
                    return name !== "sigv4a" && name.startsWith("sigv4");
                });
                if (SignatureV4MultiRegion.sigv4aDependency() === "none" && sigv4Present) {
                    continue;
                }
            }
            else if (name.startsWith("sigv4")) {
                schemeId = "aws.auth#sigv4";
            }
            else {
                throw new Error(`Unknown HttpAuthScheme found in \`@smithy.rules#endpointRuleSet\`: \`${name}\``);
            }
            const createOption = createHttpAuthOptionFunctions[schemeId];
            if (!createOption) {
                throw new Error(`Could not find HttpAuthOption create function for \`${schemeId}\``);
            }
            const option = createOption(authParameters);
            option.schemeId = schemeId;
            option.signingProperties = { ...(option.signingProperties || {}), ...rest, ...properties };
            options.push(option);
        }
        return options;
    };
    return endpointRuleSetHttpAuthSchemeProvider;
};
const _defaultSESv2HttpAuthSchemeProvider = (authParameters) => {
    const options = [];
    switch (authParameters.operation) {
        default: {
            options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
            options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
        }
    }
    return options;
};
export const defaultSESv2HttpAuthSchemeProvider = createEndpointRuleSetHttpAuthSchemeProvider(defaultEndpointResolver, _defaultSESv2HttpAuthSchemeProvider, {
    "aws.auth#sigv4": createAwsAuthSigv4HttpAuthOption,
    "aws.auth#sigv4a": createAwsAuthSigv4aHttpAuthOption,
});
export const resolveHttpAuthSchemeConfig = (config) => {
    const config_0 = resolveAwsSdkSigV4Config(config);
    const config_1 = resolveAwsSdkSigV4AConfig(config_0);
    return Object.assign(config_1, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? []),
    });
};
