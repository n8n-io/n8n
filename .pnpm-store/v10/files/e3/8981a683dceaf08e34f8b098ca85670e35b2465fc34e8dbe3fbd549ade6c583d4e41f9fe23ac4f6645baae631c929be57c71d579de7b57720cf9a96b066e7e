"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetId$ = exports.GetCredentialsForIdentity$ = exports.GetIdResponse$ = exports.GetIdInput$ = exports.GetCredentialsForIdentityResponse$ = exports.GetCredentialsForIdentityInput$ = exports.Credentials$ = exports.errorTypeRegistries = exports.TooManyRequestsException$ = exports.ResourceNotFoundException$ = exports.ResourceConflictException$ = exports.NotAuthorizedException$ = exports.LimitExceededException$ = exports.InvalidParameterException$ = exports.InvalidIdentityPoolConfigurationException$ = exports.InternalErrorException$ = exports.ExternalServiceException$ = exports.CognitoIdentityServiceException$ = void 0;
const _AI = "AccountId";
const _AKI = "AccessKeyId";
const _C = "Credentials";
const _CRA = "CustomRoleArn";
const _E = "Expiration";
const _ESE = "ExternalServiceException";
const _GCFI = "GetCredentialsForIdentity";
const _GCFII = "GetCredentialsForIdentityInput";
const _GCFIR = "GetCredentialsForIdentityResponse";
const _GI = "GetId";
const _GII = "GetIdInput";
const _GIR = "GetIdResponse";
const _IEE = "InternalErrorException";
const _II = "IdentityId";
const _IIPCE = "InvalidIdentityPoolConfigurationException";
const _IPE = "InvalidParameterException";
const _IPI = "IdentityPoolId";
const _IPT = "IdentityProviderToken";
const _L = "Logins";
const _LEE = "LimitExceededException";
const _LM = "LoginsMap";
const _NAE = "NotAuthorizedException";
const _RCE = "ResourceConflictException";
const _RNFE = "ResourceNotFoundException";
const _SK = "SecretKey";
const _SKS = "SecretKeyString";
const _ST = "SessionToken";
const _TMRE = "TooManyRequestsException";
const _c = "client";
const _e = "error";
const _hE = "httpError";
const _m = "message";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.cognitoidentity";
const _se = "server";
const n0 = "com.amazonaws.cognitoidentity";
const schema_1 = require("@smithy/core/schema");
const CognitoIdentityServiceException_1 = require("../models/CognitoIdentityServiceException");
const errors_1 = require("../models/errors");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.CognitoIdentityServiceException$ = [-3, _s, "CognitoIdentityServiceException", 0, [], []];
_s_registry.registerError(exports.CognitoIdentityServiceException$, CognitoIdentityServiceException_1.CognitoIdentityServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.ExternalServiceException$ = [-3, n0, _ESE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
n0_registry.registerError(exports.ExternalServiceException$, errors_1.ExternalServiceException);
exports.InternalErrorException$ = [-3, n0, _IEE, { [_e]: _se }, [_m], [0]];
n0_registry.registerError(exports.InternalErrorException$, errors_1.InternalErrorException);
exports.InvalidIdentityPoolConfigurationException$ = [
    -3,
    n0,
    _IIPCE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.InvalidIdentityPoolConfigurationException$, errors_1.InvalidIdentityPoolConfigurationException);
exports.InvalidParameterException$ = [-3, n0, _IPE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
n0_registry.registerError(exports.InvalidParameterException$, errors_1.InvalidParameterException);
exports.LimitExceededException$ = [-3, n0, _LEE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
n0_registry.registerError(exports.LimitExceededException$, errors_1.LimitExceededException);
exports.NotAuthorizedException$ = [-3, n0, _NAE, { [_e]: _c, [_hE]: 403 }, [_m], [0]];
n0_registry.registerError(exports.NotAuthorizedException$, errors_1.NotAuthorizedException);
exports.ResourceConflictException$ = [-3, n0, _RCE, { [_e]: _c, [_hE]: 409 }, [_m], [0]];
n0_registry.registerError(exports.ResourceConflictException$, errors_1.ResourceConflictException);
exports.ResourceNotFoundException$ = [-3, n0, _RNFE, { [_e]: _c, [_hE]: 404 }, [_m], [0]];
n0_registry.registerError(exports.ResourceNotFoundException$, errors_1.ResourceNotFoundException);
exports.TooManyRequestsException$ = [-3, n0, _TMRE, { [_e]: _c, [_hE]: 429 }, [_m], [0]];
n0_registry.registerError(exports.TooManyRequestsException$, errors_1.TooManyRequestsException);
exports.errorTypeRegistries = [_s_registry, n0_registry];
var IdentityProviderToken = [0, n0, _IPT, 8, 0];
var SecretKeyString = [0, n0, _SKS, 8, 0];
exports.Credentials$ = [
    3,
    n0,
    _C,
    0,
    [_AKI, _SK, _ST, _E],
    [0, [() => SecretKeyString, 0], 0, 4],
];
exports.GetCredentialsForIdentityInput$ = [
    3,
    n0,
    _GCFII,
    0,
    [_II, _L, _CRA],
    [0, [() => LoginsMap, 0], 0],
    1,
];
exports.GetCredentialsForIdentityResponse$ = [
    3,
    n0,
    _GCFIR,
    0,
    [_II, _C],
    [0, [() => exports.Credentials$, 0]],
];
exports.GetIdInput$ = [3, n0, _GII, 0, [_IPI, _AI, _L], [0, 0, [() => LoginsMap, 0]], 1];
exports.GetIdResponse$ = [3, n0, _GIR, 0, [_II], [0]];
var LoginsMap = [2, n0, _LM, 0, [0, 0], [() => IdentityProviderToken, 0]];
exports.GetCredentialsForIdentity$ = [
    9,
    n0,
    _GCFI,
    0,
    () => exports.GetCredentialsForIdentityInput$,
    () => exports.GetCredentialsForIdentityResponse$,
];
exports.GetId$ = [9, n0, _GI, 0, () => exports.GetIdInput$, () => exports.GetIdResponse$];
