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
import { TypeRegistry } from "@smithy/core/schema";
import { ExpiredTokenException as __ExpiredTokenException, IDPCommunicationErrorException as __IDPCommunicationErrorException, IDPRejectedClaimException as __IDPRejectedClaimException, InvalidIdentityTokenException as __InvalidIdentityTokenException, MalformedPolicyDocumentException as __MalformedPolicyDocumentException, PackedPolicyTooLargeException as __PackedPolicyTooLargeException, RegionDisabledException as __RegionDisabledException, } from "../models/errors";
import { STSServiceException as __STSServiceException } from "../models/STSServiceException";
export var accessKeySecretType = [0, n0, _aKST, 8, 0];
export var clientTokenType = [0, n0, _cTT, 8, 0];
export var AssumedRoleUser = [3, n0, _ARU, 0, [_ARI, _A], [0, 0]];
export var AssumeRoleRequest = [
    3,
    n0,
    _ARR,
    0,
    [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
    [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType],
];
export var AssumeRoleResponse = [
    3,
    n0,
    _ARRs,
    0,
    [_C, _ARU, _PPS, _SI],
    [[() => Credentials, 0], () => AssumedRoleUser, 1, 0],
];
export var AssumeRoleWithWebIdentityRequest = [
    3,
    n0,
    _ARWWIR,
    0,
    [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
    [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1],
];
export var AssumeRoleWithWebIdentityResponse = [
    3,
    n0,
    _ARWWIRs,
    0,
    [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
    [[() => Credentials, 0], 0, () => AssumedRoleUser, 1, 0, 0, 0],
];
export var Credentials = [
    3,
    n0,
    _C,
    0,
    [_AKI, _SAK, _ST, _E],
    [0, [() => accessKeySecretType, 0], 0, 4],
];
export var ExpiredTokenException = [
    -3,
    n0,
    _ETE,
    {
        [_e]: _c,
        [_hE]: 400,
        [_aQE]: [`ExpiredTokenException`, 400],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(ExpiredTokenException, __ExpiredTokenException);
export var IDPCommunicationErrorException = [
    -3,
    n0,
    _IDPCEE,
    {
        [_e]: _c,
        [_hE]: 400,
        [_aQE]: [`IDPCommunicationError`, 400],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(IDPCommunicationErrorException, __IDPCommunicationErrorException);
export var IDPRejectedClaimException = [
    -3,
    n0,
    _IDPRCE,
    {
        [_e]: _c,
        [_hE]: 403,
        [_aQE]: [`IDPRejectedClaim`, 403],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(IDPRejectedClaimException, __IDPRejectedClaimException);
export var InvalidIdentityTokenException = [
    -3,
    n0,
    _IITE,
    {
        [_e]: _c,
        [_hE]: 400,
        [_aQE]: [`InvalidIdentityToken`, 400],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(InvalidIdentityTokenException, __InvalidIdentityTokenException);
export var MalformedPolicyDocumentException = [
    -3,
    n0,
    _MPDE,
    {
        [_e]: _c,
        [_hE]: 400,
        [_aQE]: [`MalformedPolicyDocument`, 400],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(MalformedPolicyDocumentException, __MalformedPolicyDocumentException);
export var PackedPolicyTooLargeException = [
    -3,
    n0,
    _PPTLE,
    {
        [_e]: _c,
        [_hE]: 400,
        [_aQE]: [`PackedPolicyTooLarge`, 400],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(PackedPolicyTooLargeException, __PackedPolicyTooLargeException);
export var PolicyDescriptorType = [3, n0, _PDT, 0, [_a], [0]];
export var ProvidedContext = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
export var RegionDisabledException = [
    -3,
    n0,
    _RDE,
    {
        [_e]: _c,
        [_hE]: 403,
        [_aQE]: [`RegionDisabledException`, 403],
    },
    [_m],
    [0],
];
TypeRegistry.for(n0).registerError(RegionDisabledException, __RegionDisabledException);
export var Tag = [3, n0, _Ta, 0, [_K, _V], [0, 0]];
export var STSServiceException = [-3, _s, "STSServiceException", 0, [], []];
TypeRegistry.for(_s).registerError(STSServiceException, __STSServiceException);
export var policyDescriptorListType = [1, n0, _pDLT, 0, () => PolicyDescriptorType];
export var ProvidedContextsListType = [1, n0, _PCLT, 0, () => ProvidedContext];
export var tagKeyListType = 64 | 0;
export var tagListType = [1, n0, _tLT, 0, () => Tag];
export var AssumeRole = [9, n0, _AR, 0, () => AssumeRoleRequest, () => AssumeRoleResponse];
export var AssumeRoleWithWebIdentity = [
    9,
    n0,
    _ARWWI,
    0,
    () => AssumeRoleWithWebIdentityRequest,
    () => AssumeRoleWithWebIdentityResponse,
];
