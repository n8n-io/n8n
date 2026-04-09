'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var schemas_0 = require('./schemas/schemas_0');
var errors = require('./models/errors');
var CognitoIdentityServiceException = require('./models/CognitoIdentityServiceException');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "cognito-identity",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class CognitoIdentityClient extends smithyClient.Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
        const _config_4 = configResolver.resolveRegionConfig(_config_3);
        const _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
        const _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
        const _config_7 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultCognitoIdentityHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class CreateIdentityPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "CreateIdentityPool", {})
    .n("CognitoIdentityClient", "CreateIdentityPoolCommand")
    .sc(schemas_0.CreateIdentityPool$)
    .build() {
}

class DeleteIdentitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "DeleteIdentities", {})
    .n("CognitoIdentityClient", "DeleteIdentitiesCommand")
    .sc(schemas_0.DeleteIdentities$)
    .build() {
}

class DeleteIdentityPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "DeleteIdentityPool", {})
    .n("CognitoIdentityClient", "DeleteIdentityPoolCommand")
    .sc(schemas_0.DeleteIdentityPool$)
    .build() {
}

class DescribeIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "DescribeIdentity", {})
    .n("CognitoIdentityClient", "DescribeIdentityCommand")
    .sc(schemas_0.DescribeIdentity$)
    .build() {
}

class DescribeIdentityPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "DescribeIdentityPool", {})
    .n("CognitoIdentityClient", "DescribeIdentityPoolCommand")
    .sc(schemas_0.DescribeIdentityPool$)
    .build() {
}

class GetCredentialsForIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetCredentialsForIdentity", {})
    .n("CognitoIdentityClient", "GetCredentialsForIdentityCommand")
    .sc(schemas_0.GetCredentialsForIdentity$)
    .build() {
}

class GetIdCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetId", {})
    .n("CognitoIdentityClient", "GetIdCommand")
    .sc(schemas_0.GetId$)
    .build() {
}

class GetIdentityPoolRolesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetIdentityPoolRoles", {})
    .n("CognitoIdentityClient", "GetIdentityPoolRolesCommand")
    .sc(schemas_0.GetIdentityPoolRoles$)
    .build() {
}

class GetOpenIdTokenCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetOpenIdToken", {})
    .n("CognitoIdentityClient", "GetOpenIdTokenCommand")
    .sc(schemas_0.GetOpenIdToken$)
    .build() {
}

class GetOpenIdTokenForDeveloperIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetOpenIdTokenForDeveloperIdentity", {})
    .n("CognitoIdentityClient", "GetOpenIdTokenForDeveloperIdentityCommand")
    .sc(schemas_0.GetOpenIdTokenForDeveloperIdentity$)
    .build() {
}

class GetPrincipalTagAttributeMapCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetPrincipalTagAttributeMap", {})
    .n("CognitoIdentityClient", "GetPrincipalTagAttributeMapCommand")
    .sc(schemas_0.GetPrincipalTagAttributeMap$)
    .build() {
}

class ListIdentitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "ListIdentities", {})
    .n("CognitoIdentityClient", "ListIdentitiesCommand")
    .sc(schemas_0.ListIdentities$)
    .build() {
}

class ListIdentityPoolsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "ListIdentityPools", {})
    .n("CognitoIdentityClient", "ListIdentityPoolsCommand")
    .sc(schemas_0.ListIdentityPools$)
    .build() {
}

class ListTagsForResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "ListTagsForResource", {})
    .n("CognitoIdentityClient", "ListTagsForResourceCommand")
    .sc(schemas_0.ListTagsForResource$)
    .build() {
}

class LookupDeveloperIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "LookupDeveloperIdentity", {})
    .n("CognitoIdentityClient", "LookupDeveloperIdentityCommand")
    .sc(schemas_0.LookupDeveloperIdentity$)
    .build() {
}

class MergeDeveloperIdentitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "MergeDeveloperIdentities", {})
    .n("CognitoIdentityClient", "MergeDeveloperIdentitiesCommand")
    .sc(schemas_0.MergeDeveloperIdentities$)
    .build() {
}

class SetIdentityPoolRolesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "SetIdentityPoolRoles", {})
    .n("CognitoIdentityClient", "SetIdentityPoolRolesCommand")
    .sc(schemas_0.SetIdentityPoolRoles$)
    .build() {
}

class SetPrincipalTagAttributeMapCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "SetPrincipalTagAttributeMap", {})
    .n("CognitoIdentityClient", "SetPrincipalTagAttributeMapCommand")
    .sc(schemas_0.SetPrincipalTagAttributeMap$)
    .build() {
}

class TagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "TagResource", {})
    .n("CognitoIdentityClient", "TagResourceCommand")
    .sc(schemas_0.TagResource$)
    .build() {
}

class UnlinkDeveloperIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UnlinkDeveloperIdentity", {})
    .n("CognitoIdentityClient", "UnlinkDeveloperIdentityCommand")
    .sc(schemas_0.UnlinkDeveloperIdentity$)
    .build() {
}

class UnlinkIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UnlinkIdentity", {})
    .n("CognitoIdentityClient", "UnlinkIdentityCommand")
    .sc(schemas_0.UnlinkIdentity$)
    .build() {
}

class UntagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UntagResource", {})
    .n("CognitoIdentityClient", "UntagResourceCommand")
    .sc(schemas_0.UntagResource$)
    .build() {
}

class UpdateIdentityPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UpdateIdentityPool", {})
    .n("CognitoIdentityClient", "UpdateIdentityPoolCommand")
    .sc(schemas_0.UpdateIdentityPool$)
    .build() {
}

const paginateListIdentityPools = core.createPaginator(CognitoIdentityClient, ListIdentityPoolsCommand, "NextToken", "NextToken", "MaxResults");

const commands = {
    CreateIdentityPoolCommand,
    DeleteIdentitiesCommand,
    DeleteIdentityPoolCommand,
    DescribeIdentityCommand,
    DescribeIdentityPoolCommand,
    GetCredentialsForIdentityCommand,
    GetIdCommand,
    GetIdentityPoolRolesCommand,
    GetOpenIdTokenCommand,
    GetOpenIdTokenForDeveloperIdentityCommand,
    GetPrincipalTagAttributeMapCommand,
    ListIdentitiesCommand,
    ListIdentityPoolsCommand,
    ListTagsForResourceCommand,
    LookupDeveloperIdentityCommand,
    MergeDeveloperIdentitiesCommand,
    SetIdentityPoolRolesCommand,
    SetPrincipalTagAttributeMapCommand,
    TagResourceCommand,
    UnlinkDeveloperIdentityCommand,
    UnlinkIdentityCommand,
    UntagResourceCommand,
    UpdateIdentityPoolCommand,
};
const paginators = {
    paginateListIdentityPools,
};
class CognitoIdentity extends CognitoIdentityClient {
}
smithyClient.createAggregatedClient(commands, CognitoIdentity, { paginators });

const AmbiguousRoleResolutionType = {
    AUTHENTICATED_ROLE: "AuthenticatedRole",
    DENY: "Deny",
};
const ErrorCode = {
    ACCESS_DENIED: "AccessDenied",
    INTERNAL_SERVER_ERROR: "InternalServerError",
};
const MappingRuleMatchType = {
    CONTAINS: "Contains",
    EQUALS: "Equals",
    NOT_EQUAL: "NotEqual",
    STARTS_WITH: "StartsWith",
};
const RoleMappingType = {
    RULES: "Rules",
    TOKEN: "Token",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.CognitoIdentityServiceException = CognitoIdentityServiceException.CognitoIdentityServiceException;
exports.AmbiguousRoleResolutionType = AmbiguousRoleResolutionType;
exports.CognitoIdentity = CognitoIdentity;
exports.CognitoIdentityClient = CognitoIdentityClient;
exports.CreateIdentityPoolCommand = CreateIdentityPoolCommand;
exports.DeleteIdentitiesCommand = DeleteIdentitiesCommand;
exports.DeleteIdentityPoolCommand = DeleteIdentityPoolCommand;
exports.DescribeIdentityCommand = DescribeIdentityCommand;
exports.DescribeIdentityPoolCommand = DescribeIdentityPoolCommand;
exports.ErrorCode = ErrorCode;
exports.GetCredentialsForIdentityCommand = GetCredentialsForIdentityCommand;
exports.GetIdCommand = GetIdCommand;
exports.GetIdentityPoolRolesCommand = GetIdentityPoolRolesCommand;
exports.GetOpenIdTokenCommand = GetOpenIdTokenCommand;
exports.GetOpenIdTokenForDeveloperIdentityCommand = GetOpenIdTokenForDeveloperIdentityCommand;
exports.GetPrincipalTagAttributeMapCommand = GetPrincipalTagAttributeMapCommand;
exports.ListIdentitiesCommand = ListIdentitiesCommand;
exports.ListIdentityPoolsCommand = ListIdentityPoolsCommand;
exports.ListTagsForResourceCommand = ListTagsForResourceCommand;
exports.LookupDeveloperIdentityCommand = LookupDeveloperIdentityCommand;
exports.MappingRuleMatchType = MappingRuleMatchType;
exports.MergeDeveloperIdentitiesCommand = MergeDeveloperIdentitiesCommand;
exports.RoleMappingType = RoleMappingType;
exports.SetIdentityPoolRolesCommand = SetIdentityPoolRolesCommand;
exports.SetPrincipalTagAttributeMapCommand = SetPrincipalTagAttributeMapCommand;
exports.TagResourceCommand = TagResourceCommand;
exports.UnlinkDeveloperIdentityCommand = UnlinkDeveloperIdentityCommand;
exports.UnlinkIdentityCommand = UnlinkIdentityCommand;
exports.UntagResourceCommand = UntagResourceCommand;
exports.UpdateIdentityPoolCommand = UpdateIdentityPoolCommand;
exports.paginateListIdentityPools = paginateListIdentityPools;
Object.prototype.hasOwnProperty.call(schemas_0, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: schemas_0['__proto__']
    });

Object.keys(schemas_0).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = schemas_0[k];
});
Object.prototype.hasOwnProperty.call(errors, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: errors['__proto__']
    });

Object.keys(errors).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = errors[k];
});
