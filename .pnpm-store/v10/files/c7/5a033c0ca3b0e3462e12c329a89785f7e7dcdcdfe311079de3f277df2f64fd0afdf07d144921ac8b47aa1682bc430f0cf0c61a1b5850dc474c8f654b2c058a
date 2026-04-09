"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRoleCredentials$ = exports.RoleCredentials$ = exports.GetRoleCredentialsResponse$ = exports.GetRoleCredentialsRequest$ = exports.errorTypeRegistries = exports.UnauthorizedException$ = exports.TooManyRequestsException$ = exports.ResourceNotFoundException$ = exports.InvalidRequestException$ = exports.SSOServiceException$ = void 0;
const _ATT = "AccessTokenType";
const _GRC = "GetRoleCredentials";
const _GRCR = "GetRoleCredentialsRequest";
const _GRCRe = "GetRoleCredentialsResponse";
const _IRE = "InvalidRequestException";
const _RC = "RoleCredentials";
const _RNFE = "ResourceNotFoundException";
const _SAKT = "SecretAccessKeyType";
const _STT = "SessionTokenType";
const _TMRE = "TooManyRequestsException";
const _UE = "UnauthorizedException";
const _aI = "accountId";
const _aKI = "accessKeyId";
const _aT = "accessToken";
const _ai = "account_id";
const _c = "client";
const _e = "error";
const _ex = "expiration";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _m = "message";
const _rC = "roleCredentials";
const _rN = "roleName";
const _rn = "role_name";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _xasbt = "x-amz-sso_bearer_token";
const n0 = "com.amazonaws.sso";
const schema_1 = require("@smithy/core/schema");
const errors_1 = require("../models/errors");
const SSOServiceException_1 = require("../models/SSOServiceException");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.SSOServiceException$ = [-3, _s, "SSOServiceException", 0, [], []];
_s_registry.registerError(exports.SSOServiceException$, SSOServiceException_1.SSOServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.InvalidRequestException$ = [-3, n0, _IRE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
n0_registry.registerError(exports.InvalidRequestException$, errors_1.InvalidRequestException);
exports.ResourceNotFoundException$ = [-3, n0, _RNFE, { [_e]: _c, [_hE]: 404 }, [_m], [0]];
n0_registry.registerError(exports.ResourceNotFoundException$, errors_1.ResourceNotFoundException);
exports.TooManyRequestsException$ = [-3, n0, _TMRE, { [_e]: _c, [_hE]: 429 }, [_m], [0]];
n0_registry.registerError(exports.TooManyRequestsException$, errors_1.TooManyRequestsException);
exports.UnauthorizedException$ = [-3, n0, _UE, { [_e]: _c, [_hE]: 401 }, [_m], [0]];
n0_registry.registerError(exports.UnauthorizedException$, errors_1.UnauthorizedException);
exports.errorTypeRegistries = [_s_registry, n0_registry];
var AccessTokenType = [0, n0, _ATT, 8, 0];
var SecretAccessKeyType = [0, n0, _SAKT, 8, 0];
var SessionTokenType = [0, n0, _STT, 8, 0];
exports.GetRoleCredentialsRequest$ = [
    3,
    n0,
    _GRCR,
    0,
    [_rN, _aI, _aT],
    [
        [0, { [_hQ]: _rn }],
        [0, { [_hQ]: _ai }],
        [() => AccessTokenType, { [_hH]: _xasbt }],
    ],
    3,
];
exports.GetRoleCredentialsResponse$ = [
    3,
    n0,
    _GRCRe,
    0,
    [_rC],
    [[() => exports.RoleCredentials$, 0]],
];
exports.RoleCredentials$ = [
    3,
    n0,
    _RC,
    0,
    [_aKI, _sAK, _sT, _ex],
    [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1],
];
exports.GetRoleCredentials$ = [
    9,
    n0,
    _GRC,
    { [_h]: ["GET", "/federation/credentials", 200] },
    () => exports.GetRoleCredentialsRequest$,
    () => exports.GetRoleCredentialsResponse$,
];
