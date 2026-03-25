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
import { TypeRegistry } from "@smithy/core/schema";
import { AccessDeniedException as __AccessDeniedException, AuthorizationPendingException as __AuthorizationPendingException, ExpiredTokenException as __ExpiredTokenException, InternalServerException as __InternalServerException, InvalidClientException as __InvalidClientException, InvalidGrantException as __InvalidGrantException, InvalidRequestException as __InvalidRequestException, InvalidScopeException as __InvalidScopeException, SlowDownException as __SlowDownException, UnauthorizedClientException as __UnauthorizedClientException, UnsupportedGrantTypeException as __UnsupportedGrantTypeException, } from "../models/errors";
import { SSOOIDCServiceException as __SSOOIDCServiceException } from "../models/SSOOIDCServiceException";
export var AccessToken = [0, n0, _AT, 8, 0];
export var ClientSecret = [0, n0, _CS, 8, 0];
export var CodeVerifier = [0, n0, _CV, 8, 0];
export var IdToken = [0, n0, _IT, 8, 0];
export var RefreshToken = [0, n0, _RT, 8, 0];
export var AccessDeniedException = [
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
TypeRegistry.for(n0).registerError(AccessDeniedException, __AccessDeniedException);
export var AuthorizationPendingException = [
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
TypeRegistry.for(n0).registerError(AuthorizationPendingException, __AuthorizationPendingException);
export var CreateTokenRequest = [
    3,
    n0,
    _CTR,
    0,
    [_cI, _cS, _gT, _dC, _co, _rT, _s, _rU, _cV],
    [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]],
];
export var CreateTokenResponse = [
    3,
    n0,
    _CTRr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]],
];
export var ExpiredTokenException = [
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
TypeRegistry.for(n0).registerError(ExpiredTokenException, __ExpiredTokenException);
export var InternalServerException = [
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
TypeRegistry.for(n0).registerError(InternalServerException, __InternalServerException);
export var InvalidClientException = [
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
TypeRegistry.for(n0).registerError(InvalidClientException, __InvalidClientException);
export var InvalidGrantException = [
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
TypeRegistry.for(n0).registerError(InvalidGrantException, __InvalidGrantException);
export var InvalidRequestException = [
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
TypeRegistry.for(n0).registerError(InvalidRequestException, __InvalidRequestException);
export var InvalidScopeException = [
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
TypeRegistry.for(n0).registerError(InvalidScopeException, __InvalidScopeException);
export var SlowDownException = [
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
TypeRegistry.for(n0).registerError(SlowDownException, __SlowDownException);
export var UnauthorizedClientException = [
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
TypeRegistry.for(n0).registerError(UnauthorizedClientException, __UnauthorizedClientException);
export var UnsupportedGrantTypeException = [
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
TypeRegistry.for(n0).registerError(UnsupportedGrantTypeException, __UnsupportedGrantTypeException);
export var __Unit = "unit";
export var SSOOIDCServiceException = [-3, _sm, "SSOOIDCServiceException", 0, [], []];
TypeRegistry.for(_sm).registerError(SSOOIDCServiceException, __SSOOIDCServiceException);
export var Scopes = 64 | 0;
export var CreateToken = [
    9,
    n0,
    _CT,
    {
        [_h]: ["POST", "/token", 200],
    },
    () => CreateTokenRequest,
    () => CreateTokenResponse,
];
