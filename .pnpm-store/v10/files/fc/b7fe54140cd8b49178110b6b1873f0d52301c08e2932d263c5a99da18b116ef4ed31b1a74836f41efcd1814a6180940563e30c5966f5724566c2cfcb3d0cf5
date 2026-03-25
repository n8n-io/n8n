'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var middlewareSerde = require('@smithy/middleware-serde');
var core$1 = require('@aws-sdk/core');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "awsssoportal",
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

class SSOClient extends smithyClient.Client {
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
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultSSOHttpAuthSchemeParametersProvider,
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

class SSOServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOServiceException.prototype);
    }
}

class InvalidRequestException extends SSOServiceException {
    name = "InvalidRequestException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
    }
}
class ResourceNotFoundException extends SSOServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
}
class TooManyRequestsException extends SSOServiceException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
class UnauthorizedException extends SSOServiceException {
    name = "UnauthorizedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "UnauthorizedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnauthorizedException.prototype);
    }
}
const GetRoleCredentialsRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: smithyClient.SENSITIVE_STRING }),
});
const RoleCredentialsFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.secretAccessKey && { secretAccessKey: smithyClient.SENSITIVE_STRING }),
    ...(obj.sessionToken && { sessionToken: smithyClient.SENSITIVE_STRING }),
});
const GetRoleCredentialsResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.roleCredentials && { roleCredentials: RoleCredentialsFilterSensitiveLog(obj.roleCredentials) }),
});
const ListAccountRolesRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: smithyClient.SENSITIVE_STRING }),
});
const ListAccountsRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: smithyClient.SENSITIVE_STRING }),
});
const LogoutRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: smithyClient.SENSITIVE_STRING }),
});

const se_GetRoleCredentialsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = smithyClient.map({}, smithyClient.isSerializableHeaderValue, {
        [_xasbt]: input[_aT],
    });
    b.bp("/federation/credentials");
    const query = smithyClient.map({
        [_rn]: [, smithyClient.expectNonNull(input[_rN], `roleName`)],
        [_ai]: [, smithyClient.expectNonNull(input[_aI], `accountId`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListAccountRolesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = smithyClient.map({}, smithyClient.isSerializableHeaderValue, {
        [_xasbt]: input[_aT],
    });
    b.bp("/assignment/roles");
    const query = smithyClient.map({
        [_nt]: [, input[_nT]],
        [_mr]: [() => input.maxResults !== void 0, () => input[_mR].toString()],
        [_ai]: [, smithyClient.expectNonNull(input[_aI], `accountId`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListAccountsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = smithyClient.map({}, smithyClient.isSerializableHeaderValue, {
        [_xasbt]: input[_aT],
    });
    b.bp("/assignment/accounts");
    const query = smithyClient.map({
        [_nt]: [, input[_nT]],
        [_mr]: [() => input.maxResults !== void 0, () => input[_mR].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_LogoutCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = smithyClient.map({}, smithyClient.isSerializableHeaderValue, {
        [_xasbt]: input[_aT],
    });
    b.bp("/logout");
    let body;
    b.m("POST").h(headers).b(body);
    return b.build();
};
const de_GetRoleCredentialsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        roleCredentials: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListAccountRolesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        nextToken: smithyClient.expectString,
        roleList: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListAccountsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        accountList: smithyClient._json,
        nextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_LogoutCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await core$1.parseJsonErrorBody(output.body, context),
    };
    const errorCode = core$1.loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "InvalidRequestException":
        case "com.amazonaws.sso#InvalidRequestException":
            throw await de_InvalidRequestExceptionRes(parsedOutput);
        case "ResourceNotFoundException":
        case "com.amazonaws.sso#ResourceNotFoundException":
            throw await de_ResourceNotFoundExceptionRes(parsedOutput);
        case "TooManyRequestsException":
        case "com.amazonaws.sso#TooManyRequestsException":
            throw await de_TooManyRequestsExceptionRes(parsedOutput);
        case "UnauthorizedException":
        case "com.amazonaws.sso#UnauthorizedException":
            throw await de_UnauthorizedExceptionRes(parsedOutput);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const throwDefaultError = smithyClient.withBaseException(SSOServiceException);
const de_InvalidRequestExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new InvalidRequestException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_ResourceNotFoundExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new ResourceNotFoundException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_TooManyRequestsExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new TooManyRequestsException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_UnauthorizedExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new UnauthorizedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const _aI = "accountId";
const _aT = "accessToken";
const _ai = "account_id";
const _mR = "maxResults";
const _mr = "max_result";
const _nT = "nextToken";
const _nt = "next_token";
const _rN = "roleName";
const _rn = "role_name";
const _xasbt = "x-amz-sso_bearer_token";

class GetRoleCredentialsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SWBPortalService", "GetRoleCredentials", {})
    .n("SSOClient", "GetRoleCredentialsCommand")
    .f(GetRoleCredentialsRequestFilterSensitiveLog, GetRoleCredentialsResponseFilterSensitiveLog)
    .ser(se_GetRoleCredentialsCommand)
    .de(de_GetRoleCredentialsCommand)
    .build() {
}

class ListAccountRolesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SWBPortalService", "ListAccountRoles", {})
    .n("SSOClient", "ListAccountRolesCommand")
    .f(ListAccountRolesRequestFilterSensitiveLog, void 0)
    .ser(se_ListAccountRolesCommand)
    .de(de_ListAccountRolesCommand)
    .build() {
}

class ListAccountsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SWBPortalService", "ListAccounts", {})
    .n("SSOClient", "ListAccountsCommand")
    .f(ListAccountsRequestFilterSensitiveLog, void 0)
    .ser(se_ListAccountsCommand)
    .de(de_ListAccountsCommand)
    .build() {
}

class LogoutCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SWBPortalService", "Logout", {})
    .n("SSOClient", "LogoutCommand")
    .f(LogoutRequestFilterSensitiveLog, void 0)
    .ser(se_LogoutCommand)
    .de(de_LogoutCommand)
    .build() {
}

const commands = {
    GetRoleCredentialsCommand,
    ListAccountRolesCommand,
    ListAccountsCommand,
    LogoutCommand,
};
class SSO extends SSOClient {
}
smithyClient.createAggregatedClient(commands, SSO);

const paginateListAccountRoles = core.createPaginator(SSOClient, ListAccountRolesCommand, "nextToken", "nextToken", "maxResults");

const paginateListAccounts = core.createPaginator(SSOClient, ListAccountsCommand, "nextToken", "nextToken", "maxResults");

Object.defineProperty(exports, "$Command", {
    enumerable: true,
    get: function () { return smithyClient.Command; }
});
Object.defineProperty(exports, "__Client", {
    enumerable: true,
    get: function () { return smithyClient.Client; }
});
exports.GetRoleCredentialsCommand = GetRoleCredentialsCommand;
exports.GetRoleCredentialsRequestFilterSensitiveLog = GetRoleCredentialsRequestFilterSensitiveLog;
exports.GetRoleCredentialsResponseFilterSensitiveLog = GetRoleCredentialsResponseFilterSensitiveLog;
exports.InvalidRequestException = InvalidRequestException;
exports.ListAccountRolesCommand = ListAccountRolesCommand;
exports.ListAccountRolesRequestFilterSensitiveLog = ListAccountRolesRequestFilterSensitiveLog;
exports.ListAccountsCommand = ListAccountsCommand;
exports.ListAccountsRequestFilterSensitiveLog = ListAccountsRequestFilterSensitiveLog;
exports.LogoutCommand = LogoutCommand;
exports.LogoutRequestFilterSensitiveLog = LogoutRequestFilterSensitiveLog;
exports.ResourceNotFoundException = ResourceNotFoundException;
exports.RoleCredentialsFilterSensitiveLog = RoleCredentialsFilterSensitiveLog;
exports.SSO = SSO;
exports.SSOClient = SSOClient;
exports.SSOServiceException = SSOServiceException;
exports.TooManyRequestsException = TooManyRequestsException;
exports.UnauthorizedException = UnauthorizedException;
exports.paginateListAccountRoles = paginateListAccountRoles;
exports.paginateListAccounts = paginateListAccounts;
