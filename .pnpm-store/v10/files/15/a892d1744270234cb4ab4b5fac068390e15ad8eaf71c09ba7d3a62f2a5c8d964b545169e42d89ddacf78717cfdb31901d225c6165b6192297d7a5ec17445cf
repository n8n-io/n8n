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
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
const _sc = "scope";
const _se = "server";
const _tT = "tokenType";
const n0 = "com.amazonaws.ssooidc";
import { TypeRegistry } from "@smithy/core/schema";
import { AccessDeniedException, AuthorizationPendingException, ExpiredTokenException, InternalServerException, InvalidClientException, InvalidGrantException, InvalidRequestException, InvalidScopeException, SlowDownException, UnauthorizedClientException, UnsupportedGrantTypeException, } from "../models/errors";
import { SSOOIDCServiceException } from "../models/SSOOIDCServiceException";
const _s_registry = TypeRegistry.for(_s);
export var SSOOIDCServiceException$ = [-3, _s, "SSOOIDCServiceException", 0, [], []];
_s_registry.registerError(SSOOIDCServiceException$, SSOOIDCServiceException);
const n0_registry = TypeRegistry.for(n0);
export var AccessDeniedException$ = [
    -3,
    n0,
    _ADE,
    { [_e]: _c, [_hE]: 400 },
    [_e, _r, _ed],
    [0, 0, 0],
];
n0_registry.registerError(AccessDeniedException$, AccessDeniedException);
export var AuthorizationPendingException$ = [
    -3,
    n0,
    _APE,
    { [_e]: _c, [_hE]: 400 },
    [_e, _ed],
    [0, 0],
];
n0_registry.registerError(AuthorizationPendingException$, AuthorizationPendingException);
export var ExpiredTokenException$ = [-3, n0, _ETE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
n0_registry.registerError(ExpiredTokenException$, ExpiredTokenException);
export var InternalServerException$ = [-3, n0, _ISE, { [_e]: _se, [_hE]: 500 }, [_e, _ed], [0, 0]];
n0_registry.registerError(InternalServerException$, InternalServerException);
export var InvalidClientException$ = [-3, n0, _ICE, { [_e]: _c, [_hE]: 401 }, [_e, _ed], [0, 0]];
n0_registry.registerError(InvalidClientException$, InvalidClientException);
export var InvalidGrantException$ = [-3, n0, _IGE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
n0_registry.registerError(InvalidGrantException$, InvalidGrantException);
export var InvalidRequestException$ = [
    -3,
    n0,
    _IRE,
    { [_e]: _c, [_hE]: 400 },
    [_e, _r, _ed],
    [0, 0, 0],
];
n0_registry.registerError(InvalidRequestException$, InvalidRequestException);
export var InvalidScopeException$ = [-3, n0, _ISEn, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
n0_registry.registerError(InvalidScopeException$, InvalidScopeException);
export var SlowDownException$ = [-3, n0, _SDE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
n0_registry.registerError(SlowDownException$, SlowDownException);
export var UnauthorizedClientException$ = [
    -3,
    n0,
    _UCE,
    { [_e]: _c, [_hE]: 400 },
    [_e, _ed],
    [0, 0],
];
n0_registry.registerError(UnauthorizedClientException$, UnauthorizedClientException);
export var UnsupportedGrantTypeException$ = [
    -3,
    n0,
    _UGTE,
    { [_e]: _c, [_hE]: 400 },
    [_e, _ed],
    [0, 0],
];
n0_registry.registerError(UnsupportedGrantTypeException$, UnsupportedGrantTypeException);
export const errorTypeRegistries = [_s_registry, n0_registry];
var AccessToken = [0, n0, _AT, 8, 0];
var ClientSecret = [0, n0, _CS, 8, 0];
var CodeVerifier = [0, n0, _CV, 8, 0];
var IdToken = [0, n0, _IT, 8, 0];
var RefreshToken = [0, n0, _RT, 8, 0];
export var CreateTokenRequest$ = [
    3,
    n0,
    _CTR,
    0,
    [_cI, _cS, _gT, _dC, _co, _rT, _sc, _rU, _cV],
    [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]],
    3,
];
export var CreateTokenResponse$ = [
    3,
    n0,
    _CTRr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]],
];
var Scopes = 64 | 0;
export var CreateToken$ = [
    9,
    n0,
    _CT,
    { [_h]: ["POST", "/token", 200] },
    () => CreateTokenRequest$,
    () => CreateTokenResponse$,
];
