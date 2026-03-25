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

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "sso-oauth",
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

class SSOOIDCClient extends smithyClient.Client {
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
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeParametersProvider,
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

let SSOOIDCServiceException$1 = class SSOOIDCServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
    }
};

let AccessDeniedException$1 = class AccessDeniedException extends SSOOIDCServiceException$1 {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    reason;
    error_description;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
    }
};
let AuthorizationPendingException$1 = class AuthorizationPendingException extends SSOOIDCServiceException$1 {
    name = "AuthorizationPendingException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "AuthorizationPendingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let ExpiredTokenException$1 = class ExpiredTokenException extends SSOOIDCServiceException$1 {
    name = "ExpiredTokenException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "ExpiredTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ExpiredTokenException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let InternalServerException$1 = class InternalServerException extends SSOOIDCServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let InvalidClientException$1 = class InvalidClientException extends SSOOIDCServiceException$1 {
    name = "InvalidClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidClientException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let InvalidGrantException$1 = class InvalidGrantException extends SSOOIDCServiceException$1 {
    name = "InvalidGrantException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidGrantException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidGrantException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let InvalidRequestException$1 = class InvalidRequestException extends SSOOIDCServiceException$1 {
    name = "InvalidRequestException";
    $fault = "client";
    error;
    reason;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
    }
};
let InvalidScopeException$1 = class InvalidScopeException extends SSOOIDCServiceException$1 {
    name = "InvalidScopeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidScopeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidScopeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let SlowDownException$1 = class SlowDownException extends SSOOIDCServiceException$1 {
    name = "SlowDownException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "SlowDownException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, SlowDownException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let UnauthorizedClientException$1 = class UnauthorizedClientException extends SSOOIDCServiceException$1 {
    name = "UnauthorizedClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "UnauthorizedClientException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};
let UnsupportedGrantTypeException$1 = class UnsupportedGrantTypeException extends SSOOIDCServiceException$1 {
    name = "UnsupportedGrantTypeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "UnsupportedGrantTypeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
};

const _ADE = "AccessDeniedException";
const _APE = "AuthorizationPendingException";
const _AT = "AccessToken";
const _CS = "ClientSecret";
const _CT = "CreateToken";
const _CTR = "CreateTokenRequest";
const _CTRr = "CreateTokenResponse";
const _CV = "CodeVerifier";
const _ETE = "ExpiredTokenException";
const _ICE = "InvalidClientException";
const _IGE = "InvalidGrantException";
const _IRE = "InvalidRequestException";
const _ISE = "InternalServerException";
const _ISEn = "InvalidScopeException";
const _IT = "IdToken";
const _RT = "RefreshToken";
const _SDE = "SlowDownException";
const _UCE = "UnauthorizedClientException";
const _UGTE = "UnsupportedGrantTypeException";
const _aT = "accessToken";
const _c = "client";
const _cI = "clientId";
const _cS = "clientSecret";
const _cV = "codeVerifier";
const _co = "code";
const _dC = "deviceCode";
const _e = "error";
const _eI = "expiresIn";
const _ed = "error_description";
const _gT = "grantType";
const _h = "http";
const _hE = "httpError";
const _iT = "idToken";
const _r = "reason";
const _rT = "refreshToken";
const _rU = "redirectUri";
const _s = "scope";
const _se = "server";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
const _tT = "tokenType";
const n0 = "com.amazonaws.ssooidc";
var AccessToken = [0, n0, _AT, 8, 0];
var ClientSecret = [0, n0, _CS, 8, 0];
var CodeVerifier = [0, n0, _CV, 8, 0];
var IdToken = [0, n0, _IT, 8, 0];
var RefreshToken = [0, n0, _RT, 8, 0];
var AccessDeniedException = [
    -3,
    n0,
    _ADE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _r, _ed],
    [0, 0, 0],
];
schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
var AuthorizationPendingException = [
    -3,
    n0,
    _APE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(AuthorizationPendingException, AuthorizationPendingException$1);
var CreateTokenRequest = [
    3,
    n0,
    _CTR,
    0,
    [_cI, _cS, _gT, _dC, _co, _rT, _s, _rU, _cV],
    [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]],
];
var CreateTokenResponse = [
    3,
    n0,
    _CTRr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]],
];
var ExpiredTokenException = [
    -3,
    n0,
    _ETE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(ExpiredTokenException, ExpiredTokenException$1);
var InternalServerException = [
    -3,
    n0,
    _ISE,
    {
        [_e]: _se,
        [_hE]: 500,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
var InvalidClientException = [
    -3,
    n0,
    _ICE,
    {
        [_e]: _c,
        [_hE]: 401,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(InvalidClientException, InvalidClientException$1);
var InvalidGrantException = [
    -3,
    n0,
    _IGE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(InvalidGrantException, InvalidGrantException$1);
var InvalidRequestException = [
    -3,
    n0,
    _IRE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _r, _ed],
    [0, 0, 0],
];
schema.TypeRegistry.for(n0).registerError(InvalidRequestException, InvalidRequestException$1);
var InvalidScopeException = [
    -3,
    n0,
    _ISEn,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(InvalidScopeException, InvalidScopeException$1);
var SlowDownException = [
    -3,
    n0,
    _SDE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(SlowDownException, SlowDownException$1);
var UnauthorizedClientException = [
    -3,
    n0,
    _UCE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(UnauthorizedClientException, UnauthorizedClientException$1);
var UnsupportedGrantTypeException = [
    -3,
    n0,
    _UGTE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(UnsupportedGrantTypeException, UnsupportedGrantTypeException$1);
var SSOOIDCServiceException = [-3, _sm, "SSOOIDCServiceException", 0, [], []];
schema.TypeRegistry.for(_sm).registerError(SSOOIDCServiceException, SSOOIDCServiceException$1);
var CreateToken = [
    9,
    n0,
    _CT,
    {
        [_h]: ["POST", "/token", 200],
    },
    () => CreateTokenRequest,
    () => CreateTokenResponse,
];

class CreateTokenCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSSSOOIDCService", "CreateToken", {})
    .n("SSOOIDCClient", "CreateTokenCommand")
    .sc(CreateToken)
    .build() {
}

const commands = {
    CreateTokenCommand,
};
class SSOOIDC extends SSOOIDCClient {
}
smithyClient.createAggregatedClient(commands, SSOOIDC);

const AccessDeniedExceptionReason = {
    KMS_ACCESS_DENIED: "KMS_AccessDeniedException",
};
const InvalidRequestExceptionReason = {
    KMS_DISABLED_KEY: "KMS_DisabledException",
    KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
    KMS_INVALID_STATE: "KMS_InvalidStateException",
    KMS_KEY_NOT_FOUND: "KMS_NotFoundException",
};

Object.defineProperty(exports, "$Command", {
    enumerable: true,
    get: function () { return smithyClient.Command; }
});
Object.defineProperty(exports, "__Client", {
    enumerable: true,
    get: function () { return smithyClient.Client; }
});
exports.AccessDeniedException = AccessDeniedException$1;
exports.AccessDeniedExceptionReason = AccessDeniedExceptionReason;
exports.AuthorizationPendingException = AuthorizationPendingException$1;
exports.CreateTokenCommand = CreateTokenCommand;
exports.ExpiredTokenException = ExpiredTokenException$1;
exports.InternalServerException = InternalServerException$1;
exports.InvalidClientException = InvalidClientException$1;
exports.InvalidGrantException = InvalidGrantException$1;
exports.InvalidRequestException = InvalidRequestException$1;
exports.InvalidRequestExceptionReason = InvalidRequestExceptionReason;
exports.InvalidScopeException = InvalidScopeException$1;
exports.SSOOIDC = SSOOIDC;
exports.SSOOIDCClient = SSOOIDCClient;
exports.SSOOIDCServiceException = SSOOIDCServiceException$1;
exports.SlowDownException = SlowDownException$1;
exports.UnauthorizedClientException = UnauthorizedClientException$1;
exports.UnsupportedGrantTypeException = UnsupportedGrantTypeException$1;
