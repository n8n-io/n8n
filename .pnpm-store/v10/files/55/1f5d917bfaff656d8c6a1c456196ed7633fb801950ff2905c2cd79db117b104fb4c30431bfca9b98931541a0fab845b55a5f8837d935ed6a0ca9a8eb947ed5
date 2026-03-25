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
        defaultSigningName: "signin",
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

class SigninClient extends smithyClient.Client {
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
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultSigninHttpAuthSchemeParametersProvider,
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

let SigninServiceException$1 = class SigninServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SigninServiceException.prototype);
    }
};

let AccessDeniedException$1 = class AccessDeniedException extends SigninServiceException$1 {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.error = opts.error;
    }
};
let InternalServerException$1 = class InternalServerException extends SigninServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    error;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.error = opts.error;
    }
};
let TooManyRequestsError$1 = class TooManyRequestsError extends SigninServiceException$1 {
    name = "TooManyRequestsError";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "TooManyRequestsError",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
        this.error = opts.error;
    }
};
let ValidationException$1 = class ValidationException extends SigninServiceException$1 {
    name = "ValidationException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
        this.error = opts.error;
    }
};

const _ADE = "AccessDeniedException";
const _AT = "AccessToken";
const _COAT = "CreateOAuth2Token";
const _COATR = "CreateOAuth2TokenRequest";
const _COATRB = "CreateOAuth2TokenRequestBody";
const _COATRBr = "CreateOAuth2TokenResponseBody";
const _COATRr = "CreateOAuth2TokenResponse";
const _ISE = "InternalServerException";
const _RT = "RefreshToken";
const _TMRE = "TooManyRequestsError";
const _VE = "ValidationException";
const _aKI = "accessKeyId";
const _aT = "accessToken";
const _c = "client";
const _cI = "clientId";
const _cV = "codeVerifier";
const _co = "code";
const _e = "error";
const _eI = "expiresIn";
const _gT = "grantType";
const _h = "http";
const _hE = "httpError";
const _iT = "idToken";
const _jN = "jsonName";
const _m = "message";
const _rT = "refreshToken";
const _rU = "redirectUri";
const _s = "server";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
const _tI = "tokenInput";
const _tO = "tokenOutput";
const _tT = "tokenType";
const n0 = "com.amazonaws.signin";
var RefreshToken = [0, n0, _RT, 8, 0];
var AccessDeniedException = [
    -3,
    n0,
    _ADE,
    {
        [_e]: _c,
    },
    [_e, _m],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
var AccessToken = [
    3,
    n0,
    _AT,
    8,
    [_aKI, _sAK, _sT],
    [
        [
            0,
            {
                [_jN]: _aKI,
            },
        ],
        [
            0,
            {
                [_jN]: _sAK,
            },
        ],
        [
            0,
            {
                [_jN]: _sT,
            },
        ],
    ],
];
var CreateOAuth2TokenRequest = [
    3,
    n0,
    _COATR,
    0,
    [_tI],
    [[() => CreateOAuth2TokenRequestBody, 16]],
];
var CreateOAuth2TokenRequestBody = [
    3,
    n0,
    _COATRB,
    0,
    [_cI, _gT, _co, _rU, _cV, _rT],
    [
        [
            0,
            {
                [_jN]: _cI,
            },
        ],
        [
            0,
            {
                [_jN]: _gT,
            },
        ],
        0,
        [
            0,
            {
                [_jN]: _rU,
            },
        ],
        [
            0,
            {
                [_jN]: _cV,
            },
        ],
        [
            () => RefreshToken,
            {
                [_jN]: _rT,
            },
        ],
    ],
];
var CreateOAuth2TokenResponse = [
    3,
    n0,
    _COATRr,
    0,
    [_tO],
    [[() => CreateOAuth2TokenResponseBody, 16]],
];
var CreateOAuth2TokenResponseBody = [
    3,
    n0,
    _COATRBr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [
        [
            () => AccessToken,
            {
                [_jN]: _aT,
            },
        ],
        [
            0,
            {
                [_jN]: _tT,
            },
        ],
        [
            1,
            {
                [_jN]: _eI,
            },
        ],
        [
            () => RefreshToken,
            {
                [_jN]: _rT,
            },
        ],
        [
            0,
            {
                [_jN]: _iT,
            },
        ],
    ],
];
var InternalServerException = [
    -3,
    n0,
    _ISE,
    {
        [_e]: _s,
        [_hE]: 500,
    },
    [_e, _m],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
var TooManyRequestsError = [
    -3,
    n0,
    _TMRE,
    {
        [_e]: _c,
        [_hE]: 429,
    },
    [_e, _m],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(TooManyRequestsError, TooManyRequestsError$1);
var ValidationException = [
    -3,
    n0,
    _VE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_e, _m],
    [0, 0],
];
schema.TypeRegistry.for(n0).registerError(ValidationException, ValidationException$1);
var SigninServiceException = [-3, _sm, "SigninServiceException", 0, [], []];
schema.TypeRegistry.for(_sm).registerError(SigninServiceException, SigninServiceException$1);
var CreateOAuth2Token = [
    9,
    n0,
    _COAT,
    {
        [_h]: ["POST", "/v1/token", 200],
    },
    () => CreateOAuth2TokenRequest,
    () => CreateOAuth2TokenResponse,
];

class CreateOAuth2TokenCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Signin", "CreateOAuth2Token", {})
    .n("SigninClient", "CreateOAuth2TokenCommand")
    .sc(CreateOAuth2Token)
    .build() {
}

const commands = {
    CreateOAuth2TokenCommand,
};
class Signin extends SigninClient {
}
smithyClient.createAggregatedClient(commands, Signin);

const OAuth2ErrorCode = {
    AUTHCODE_EXPIRED: "AUTHCODE_EXPIRED",
    INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
    INVALID_REQUEST: "INVALID_REQUEST",
    SERVER_ERROR: "server_error",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    USER_CREDENTIALS_CHANGED: "USER_CREDENTIALS_CHANGED",
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
exports.CreateOAuth2TokenCommand = CreateOAuth2TokenCommand;
exports.InternalServerException = InternalServerException$1;
exports.OAuth2ErrorCode = OAuth2ErrorCode;
exports.Signin = Signin;
exports.SigninClient = SigninClient;
exports.SigninServiceException = SigninServiceException$1;
exports.TooManyRequestsError = TooManyRequestsError$1;
exports.ValidationException = ValidationException$1;
