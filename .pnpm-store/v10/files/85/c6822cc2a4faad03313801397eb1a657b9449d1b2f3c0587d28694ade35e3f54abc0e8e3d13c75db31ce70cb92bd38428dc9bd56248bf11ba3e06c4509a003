"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssumeRoleWithWebIdentity$ = exports.AssumeRole$ = exports.Tag$ = exports.ProvidedContext$ = exports.PolicyDescriptorType$ = exports.Credentials$ = exports.AssumeRoleWithWebIdentityResponse$ = exports.AssumeRoleWithWebIdentityRequest$ = exports.AssumeRoleResponse$ = exports.AssumeRoleRequest$ = exports.AssumedRoleUser$ = exports.errorTypeRegistries = exports.RegionDisabledException$ = exports.PackedPolicyTooLargeException$ = exports.MalformedPolicyDocumentException$ = exports.InvalidIdentityTokenException$ = exports.IDPRejectedClaimException$ = exports.IDPCommunicationErrorException$ = exports.ExpiredTokenException$ = exports.STSServiceException$ = void 0;
const _A = "Arn";
const _AKI = "AccessKeyId";
const _AR = "AssumeRole";
const _ARI = "AssumedRoleId";
const _ARR = "AssumeRoleRequest";
const _ARRs = "AssumeRoleResponse";
const _ARU = "AssumedRoleUser";
const _ARWWI = "AssumeRoleWithWebIdentity";
const _ARWWIR = "AssumeRoleWithWebIdentityRequest";
const _ARWWIRs = "AssumeRoleWithWebIdentityResponse";
const _Au = "Audience";
const _C = "Credentials";
const _CA = "ContextAssertion";
const _DS = "DurationSeconds";
const _E = "Expiration";
const _EI = "ExternalId";
const _ETE = "ExpiredTokenException";
const _IDPCEE = "IDPCommunicationErrorException";
const _IDPRCE = "IDPRejectedClaimException";
const _IITE = "InvalidIdentityTokenException";
const _K = "Key";
const _MPDE = "MalformedPolicyDocumentException";
const _P = "Policy";
const _PA = "PolicyArns";
const _PAr = "ProviderArn";
const _PC = "ProvidedContexts";
const _PCLT = "ProvidedContextsListType";
const _PCr = "ProvidedContext";
const _PDT = "PolicyDescriptorType";
const _PI = "ProviderId";
const _PPS = "PackedPolicySize";
const _PPTLE = "PackedPolicyTooLargeException";
const _Pr = "Provider";
const _RA = "RoleArn";
const _RDE = "RegionDisabledException";
const _RSN = "RoleSessionName";
const _SAK = "SecretAccessKey";
const _SFWIT = "SubjectFromWebIdentityToken";
const _SI = "SourceIdentity";
const _SN = "SerialNumber";
const _ST = "SessionToken";
const _T = "Tags";
const _TC = "TokenCode";
const _TTK = "TransitiveTagKeys";
const _Ta = "Tag";
const _V = "Value";
const _WIT = "WebIdentityToken";
const _a = "arn";
const _aKST = "accessKeySecretType";
const _aQE = "awsQueryError";
const _c = "client";
const _cTT = "clientTokenType";
const _e = "error";
const _hE = "httpError";
const _m = "message";
const _pDLT = "policyDescriptorListType";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sts";
const _tLT = "tagListType";
const n0 = "com.amazonaws.sts";
const schema_1 = require("@smithy/core/schema");
const errors_1 = require("../models/errors");
const STSServiceException_1 = require("../models/STSServiceException");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.STSServiceException$ = [-3, _s, "STSServiceException", 0, [], []];
_s_registry.registerError(exports.STSServiceException$, STSServiceException_1.STSServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.ExpiredTokenException$ = [
    -3,
    n0,
    _ETE,
    { [_aQE]: [`ExpiredTokenException`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.ExpiredTokenException$, errors_1.ExpiredTokenException);
exports.IDPCommunicationErrorException$ = [
    -3,
    n0,
    _IDPCEE,
    { [_aQE]: [`IDPCommunicationError`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.IDPCommunicationErrorException$, errors_1.IDPCommunicationErrorException);
exports.IDPRejectedClaimException$ = [
    -3,
    n0,
    _IDPRCE,
    { [_aQE]: [`IDPRejectedClaim`, 403], [_e]: _c, [_hE]: 403 },
    [_m],
    [0],
];
n0_registry.registerError(exports.IDPRejectedClaimException$, errors_1.IDPRejectedClaimException);
exports.InvalidIdentityTokenException$ = [
    -3,
    n0,
    _IITE,
    { [_aQE]: [`InvalidIdentityToken`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.InvalidIdentityTokenException$, errors_1.InvalidIdentityTokenException);
exports.MalformedPolicyDocumentException$ = [
    -3,
    n0,
    _MPDE,
    { [_aQE]: [`MalformedPolicyDocument`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.MalformedPolicyDocumentException$, errors_1.MalformedPolicyDocumentException);
exports.PackedPolicyTooLargeException$ = [
    -3,
    n0,
    _PPTLE,
    { [_aQE]: [`PackedPolicyTooLarge`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0],
];
n0_registry.registerError(exports.PackedPolicyTooLargeException$, errors_1.PackedPolicyTooLargeException);
exports.RegionDisabledException$ = [
    -3,
    n0,
    _RDE,
    { [_aQE]: [`RegionDisabledException`, 403], [_e]: _c, [_hE]: 403 },
    [_m],
    [0],
];
n0_registry.registerError(exports.RegionDisabledException$, errors_1.RegionDisabledException);
exports.errorTypeRegistries = [_s_registry, n0_registry];
var accessKeySecretType = [0, n0, _aKST, 8, 0];
var clientTokenType = [0, n0, _cTT, 8, 0];
exports.AssumedRoleUser$ = [3, n0, _ARU, 0, [_ARI, _A], [0, 0], 2];
exports.AssumeRoleRequest$ = [
    3,
    n0,
    _ARR,
    0,
    [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
    [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType],
    2,
];
exports.AssumeRoleResponse$ = [
    3,
    n0,
    _ARRs,
    0,
    [_C, _ARU, _PPS, _SI],
    [[() => exports.Credentials$, 0], () => exports.AssumedRoleUser$, 1, 0],
];
exports.AssumeRoleWithWebIdentityRequest$ = [
    3,
    n0,
    _ARWWIR,
    0,
    [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
    [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1],
    3,
];
exports.AssumeRoleWithWebIdentityResponse$ = [
    3,
    n0,
    _ARWWIRs,
    0,
    [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
    [[() => exports.Credentials$, 0], 0, () => exports.AssumedRoleUser$, 1, 0, 0, 0],
];
exports.Credentials$ = [
    3,
    n0,
    _C,
    0,
    [_AKI, _SAK, _ST, _E],
    [0, [() => accessKeySecretType, 0], 0, 4],
    4,
];
exports.PolicyDescriptorType$ = [3, n0, _PDT, 0, [_a], [0]];
exports.ProvidedContext$ = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
exports.Tag$ = [3, n0, _Ta, 0, [_K, _V], [0, 0], 2];
var policyDescriptorListType = [1, n0, _pDLT, 0, () => exports.PolicyDescriptorType$];
var ProvidedContextsListType = [1, n0, _PCLT, 0, () => exports.ProvidedContext$];
var tagKeyListType = 64 | 0;
var tagListType = [1, n0, _tLT, 0, () => exports.Tag$];
exports.AssumeRole$ = [9, n0, _AR, 0, () => exports.AssumeRoleRequest$, () => exports.AssumeRoleResponse$];
exports.AssumeRoleWithWebIdentity$ = [
    9,
    n0,
    _ARWWI,
    0,
    () => exports.AssumeRoleWithWebIdentityRequest$,
    () => exports.AssumeRoleWithWebIdentityResponse$,
];
