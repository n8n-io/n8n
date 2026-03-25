const _AI = "AccountInfo";
const _ALT = "AccountListType";
const _ATT = "AccessTokenType";
const _GRC = "GetRoleCredentials";
const _GRCR = "GetRoleCredentialsRequest";
const _GRCRe = "GetRoleCredentialsResponse";
const _IRE = "InvalidRequestException";
const _L = "Logout";
const _LA = "ListAccounts";
const _LAR = "ListAccountsRequest";
const _LARR = "ListAccountRolesRequest";
const _LARRi = "ListAccountRolesResponse";
const _LARi = "ListAccountsResponse";
const _LARis = "ListAccountRoles";
const _LR = "LogoutRequest";
const _RC = "RoleCredentials";
const _RI = "RoleInfo";
const _RLT = "RoleListType";
const _RNFE = "ResourceNotFoundException";
const _SAKT = "SecretAccessKeyType";
const _STT = "SessionTokenType";
const _TMRE = "TooManyRequestsException";
const _UE = "UnauthorizedException";
const _aI = "accountId";
const _aKI = "accessKeyId";
const _aL = "accountList";
const _aN = "accountName";
const _aT = "accessToken";
const _ai = "account_id";
const _c = "client";
const _e = "error";
const _eA = "emailAddress";
const _ex = "expiration";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _m = "message";
const _mR = "maxResults";
const _mr = "max_result";
const _nT = "nextToken";
const _nt = "next_token";
const _rC = "roleCredentials";
const _rL = "roleList";
const _rN = "roleName";
const _rn = "role_name";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _xasbt = "x-amz-sso_bearer_token";
const n0 = "com.amazonaws.sso";
import { TypeRegistry } from "@smithy/core/schema";
import { InvalidRequestException as __InvalidRequestException, ResourceNotFoundException as __ResourceNotFoundException, TooManyRequestsException as __TooManyRequestsException, UnauthorizedException as __UnauthorizedException, } from "../models/errors";
import { SSOServiceException as __SSOServiceException } from "../models/SSOServiceException";
export var AccessTokenType = [0, n0, _ATT, 8, 0];
export var SecretAccessKeyType = [0, n0, _SAKT, 8, 0];
export var SessionTokenType = [0, n0, _STT, 8, 0];
export var AccountInfo = [3, n0, _AI, 0, [_aI, _aN, _eA], [0, 0, 0]];
export var GetRoleCredentialsRequest = [
    3,
    n0,
    _GRCR,
    0,
    [_rN, _aI, _aT],
    [
        [
            0,
            {
                [_hQ]: _rn,
            },
        ],
        [
            0,
            {
                [_hQ]: _ai,
            },
        ],
        [
            () => AccessTokenType,
            {
                [_hH]: _xasbt,
            },
        ],
    ],
];
export var GetRoleCredentialsResponse = [3, n0, _GRCRe, 0, [_rC], [[() => RoleCredentials, 0]]];
export var InvalidRequestException = [
    -3,
    n0,
    _IRE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(InvalidRequestException, __InvalidRequestException);
export var ListAccountRolesRequest = [
    3,
    n0,
    _LARR,
    0,
    [_nT, _mR, _aT, _aI],
    [
        [
            0,
            {
                [_hQ]: _nt,
            },
        ],
        [
            1,
            {
                [_hQ]: _mr,
            },
        ],
        [
            () => AccessTokenType,
            {
                [_hH]: _xasbt,
            },
        ],
        [
            0,
            {
                [_hQ]: _ai,
            },
        ],
    ],
];
export var ListAccountRolesResponse = [3, n0, _LARRi, 0, [_nT, _rL], [0, () => RoleListType]];
export var ListAccountsRequest = [
    3,
    n0,
    _LAR,
    0,
    [_nT, _mR, _aT],
    [
        [
            0,
            {
                [_hQ]: _nt,
            },
        ],
        [
            1,
            {
                [_hQ]: _mr,
            },
        ],
        [
            () => AccessTokenType,
            {
                [_hH]: _xasbt,
            },
        ],
    ],
];
export var ListAccountsResponse = [3, n0, _LARi, 0, [_nT, _aL], [0, () => AccountListType]];
export var LogoutRequest = [
    3,
    n0,
    _LR,
    0,
    [_aT],
    [
        [
            () => AccessTokenType,
            {
                [_hH]: _xasbt,
            },
        ],
    ],
];
export var ResourceNotFoundException = [
    -3,
    n0,
    _RNFE,
    {
        [_e]: _c,
        [_hE]: 404,
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(ResourceNotFoundException, __ResourceNotFoundException);
export var RoleCredentials = [
    3,
    n0,
    _RC,
    0,
    [_aKI, _sAK, _sT, _ex],
    [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1],
];
export var RoleInfo = [3, n0, _RI, 0, [_rN, _aI], [0, 0]];
export var TooManyRequestsException = [
    -3,
    n0,
    _TMRE,
    {
        [_e]: _c,
        [_hE]: 429,
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(TooManyRequestsException, __TooManyRequestsException);
export var UnauthorizedException = [
    -3,
    n0,
    _UE,
    {
        [_e]: _c,
        [_hE]: 401,
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(UnauthorizedException, __UnauthorizedException);
export var __Unit = "unit";
export var SSOServiceException = [-3, _s, "SSOServiceException", 0, [], []];
TypeRegistry.for(_s).registerError(SSOServiceException, __SSOServiceException);
export var AccountListType = [1, n0, _ALT, 0, () => AccountInfo];
export var RoleListType = [1, n0, _RLT, 0, () => RoleInfo];
export var GetRoleCredentials = [
    9,
    n0,
    _GRC,
    {
        [_h]: ["GET", "/federation/credentials", 200],
    },
    () => GetRoleCredentialsRequest,
    () => GetRoleCredentialsResponse,
];
export var ListAccountRoles = [
    9,
    n0,
    _LARis,
    {
        [_h]: ["GET", "/assignment/roles", 200],
    },
    () => ListAccountRolesRequest,
    () => ListAccountRolesResponse,
];
export var ListAccounts = [
    9,
    n0,
    _LA,
    {
        [_h]: ["GET", "/assignment/accounts", 200],
    },
    () => ListAccountsRequest,
    () => ListAccountsResponse,
];
export var Logout = [
    9,
    n0,
    _L,
    {
        [_h]: ["POST", "/logout", 200],
    },
    () => LogoutRequest,
    () => __Unit,
];
