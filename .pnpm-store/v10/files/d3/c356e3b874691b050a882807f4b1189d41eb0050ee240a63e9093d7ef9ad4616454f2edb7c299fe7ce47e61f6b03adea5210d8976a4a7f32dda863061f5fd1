'use strict';

var STSClient = require('./STSClient');
var smithyClient = require('@smithy/smithy-client');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var EndpointParameters = require('./endpoint/EndpointParameters');
var schema = require('@smithy/core/schema');
var client = require('@aws-sdk/core/client');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');

let STSServiceException$1 = class STSServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, STSServiceException.prototype);
    }
};

let ExpiredTokenException$1 = class ExpiredTokenException extends STSServiceException$1 {
    name = "ExpiredTokenException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ExpiredTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ExpiredTokenException.prototype);
    }
};
let MalformedPolicyDocumentException$1 = class MalformedPolicyDocumentException extends STSServiceException$1 {
    name = "MalformedPolicyDocumentException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MalformedPolicyDocumentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
    }
};
let PackedPolicyTooLargeException$1 = class PackedPolicyTooLargeException extends STSServiceException$1 {
    name = "PackedPolicyTooLargeException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "PackedPolicyTooLargeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, PackedPolicyTooLargeException.prototype);
    }
};
let RegionDisabledException$1 = class RegionDisabledException extends STSServiceException$1 {
    name = "RegionDisabledException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "RegionDisabledException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, RegionDisabledException.prototype);
    }
};
let IDPRejectedClaimException$1 = class IDPRejectedClaimException extends STSServiceException$1 {
    name = "IDPRejectedClaimException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "IDPRejectedClaimException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, IDPRejectedClaimException.prototype);
    }
};
let InvalidIdentityTokenException$1 = class InvalidIdentityTokenException extends STSServiceException$1 {
    name = "InvalidIdentityTokenException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidIdentityTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidIdentityTokenException.prototype);
    }
};
let IDPCommunicationErrorException$1 = class IDPCommunicationErrorException extends STSServiceException$1 {
    name = "IDPCommunicationErrorException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "IDPCommunicationErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, IDPCommunicationErrorException.prototype);
    }
};

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
var accessKeySecretType = [0, n0, _aKST, 8, 0];
var clientTokenType = [0, n0, _cTT, 8, 0];
var AssumedRoleUser = [3, n0, _ARU, 0, [_ARI, _A], [0, 0]];
var AssumeRoleRequest = [
    3,
    n0,
    _ARR,
    0,
    [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
    [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType],
];
var AssumeRoleResponse = [
    3,
    n0,
    _ARRs,
    0,
    [_C, _ARU, _PPS, _SI],
    [[() => Credentials, 0], () => AssumedRoleUser, 1, 0],
];
var AssumeRoleWithWebIdentityRequest = [
    3,
    n0,
    _ARWWIR,
    0,
    [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
    [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1],
];
var AssumeRoleWithWebIdentityResponse = [
    3,
    n0,
    _ARWWIRs,
    0,
    [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
    [[() => Credentials, 0], 0, () => AssumedRoleUser, 1, 0, 0, 0],
];
var Credentials = [
    3,
    n0,
    _C,
    0,
    [_AKI, _SAK, _ST, _E],
    [0, [() => accessKeySecretType, 0], 0, 4],
];
var ExpiredTokenException = [
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
schema.TypeRegistry.for(n0).registerError(ExpiredTokenException, ExpiredTokenException$1);
var IDPCommunicationErrorException = [
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
schema.TypeRegistry.for(n0).registerError(IDPCommunicationErrorException, IDPCommunicationErrorException$1);
var IDPRejectedClaimException = [
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
schema.TypeRegistry.for(n0).registerError(IDPRejectedClaimException, IDPRejectedClaimException$1);
var InvalidIdentityTokenException = [
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
schema.TypeRegistry.for(n0).registerError(InvalidIdentityTokenException, InvalidIdentityTokenException$1);
var MalformedPolicyDocumentException = [
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
schema.TypeRegistry.for(n0).registerError(MalformedPolicyDocumentException, MalformedPolicyDocumentException$1);
var PackedPolicyTooLargeException = [
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
schema.TypeRegistry.for(n0).registerError(PackedPolicyTooLargeException, PackedPolicyTooLargeException$1);
var PolicyDescriptorType = [3, n0, _PDT, 0, [_a], [0]];
var ProvidedContext = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
var RegionDisabledException = [
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
schema.TypeRegistry.for(n0).registerError(RegionDisabledException, RegionDisabledException$1);
var Tag = [3, n0, _Ta, 0, [_K, _V], [0, 0]];
var STSServiceException = [-3, _s, "STSServiceException", 0, [], []];
schema.TypeRegistry.for(_s).registerError(STSServiceException, STSServiceException$1);
var policyDescriptorListType = [1, n0, _pDLT, 0, () => PolicyDescriptorType];
var ProvidedContextsListType = [1, n0, _PCLT, 0, () => ProvidedContext];
var tagListType = [1, n0, _tLT, 0, () => Tag];
var AssumeRole = [9, n0, _AR, 0, () => AssumeRoleRequest, () => AssumeRoleResponse];
var AssumeRoleWithWebIdentity = [
    9,
    n0,
    _ARWWI,
    0,
    () => AssumeRoleWithWebIdentityRequest,
    () => AssumeRoleWithWebIdentityResponse,
];

class AssumeRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(EndpointParameters.commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSSecurityTokenServiceV20110615", "AssumeRole", {})
    .n("STSClient", "AssumeRoleCommand")
    .sc(AssumeRole)
    .build() {
}

class AssumeRoleWithWebIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(EndpointParameters.commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {})
    .n("STSClient", "AssumeRoleWithWebIdentityCommand")
    .sc(AssumeRoleWithWebIdentity)
    .build() {
}

const commands = {
    AssumeRoleCommand,
    AssumeRoleWithWebIdentityCommand,
};
class STS extends STSClient.STSClient {
}
smithyClient.createAggregatedClient(commands, STS);

const getAccountIdFromAssumedRoleUser = (assumedRoleUser) => {
    if (typeof assumedRoleUser?.Arn === "string") {
        const arnComponents = assumedRoleUser.Arn.split(":");
        if (arnComponents.length > 4 && arnComponents[4] !== "") {
            return arnComponents[4];
        }
    }
    return undefined;
};
const resolveRegion = async (_region, _parentRegion, credentialProviderLogger, loaderConfig = {}) => {
    const region = typeof _region === "function" ? await _region() : _region;
    const parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
    const stsDefaultRegion = await regionConfigResolver.stsRegionDefaultResolver(loaderConfig)();
    credentialProviderLogger?.debug?.("@aws-sdk/client-sts::resolveRegion", "accepting first of:", `${region} (credential provider clientConfig)`, `${parentRegion} (contextual client)`, `${stsDefaultRegion} (STS default: AWS_REGION, profile region, or us-east-1)`);
    return region ?? parentRegion ?? stsDefaultRegion;
};
const getDefaultRoleAssumer$1 = (stsOptions, STSClient) => {
    let stsClient;
    let closureSourceCreds;
    return async (sourceCreds, params) => {
        closureSourceCreds = sourceCreds;
        if (!stsClient) {
            const { logger = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId, } = stsOptions;
            const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
                logger,
                profile,
            });
            const isCompatibleRequestHandler = !isH2(requestHandler);
            stsClient = new STSClient({
                ...stsOptions,
                userAgentAppId,
                profile,
                credentialDefaultProvider: () => async () => closureSourceCreds,
                region: resolvedRegion,
                requestHandler: isCompatibleRequestHandler ? requestHandler : undefined,
                logger: logger,
            });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
            throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
            expiration: Credentials.Expiration,
            ...(Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope }),
            ...(accountId && { accountId }),
        };
        client.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
        return credentials;
    };
};
const getDefaultRoleAssumerWithWebIdentity$1 = (stsOptions, STSClient) => {
    let stsClient;
    return async (params) => {
        if (!stsClient) {
            const { logger = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId, } = stsOptions;
            const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
                logger,
                profile,
            });
            const isCompatibleRequestHandler = !isH2(requestHandler);
            stsClient = new STSClient({
                ...stsOptions,
                userAgentAppId,
                profile,
                region: resolvedRegion,
                requestHandler: isCompatibleRequestHandler ? requestHandler : undefined,
                logger: logger,
            });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
            throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
            expiration: Credentials.Expiration,
            ...(Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope }),
            ...(accountId && { accountId }),
        };
        if (accountId) {
            client.setCredentialFeature(credentials, "RESOLVED_ACCOUNT_ID", "T");
        }
        client.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
        return credentials;
    };
};
const isH2 = (requestHandler) => {
    return requestHandler?.metadata?.handlerProtocol === "h2";
};

const getCustomizableStsClientCtor = (baseCtor, customizations) => {
    if (!customizations)
        return baseCtor;
    else
        return class CustomizableSTSClient extends baseCtor {
            constructor(config) {
                super(config);
                for (const customization of customizations) {
                    this.middlewareStack.use(customization);
                }
            }
        };
};
const getDefaultRoleAssumer = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumer$1(stsOptions, getCustomizableStsClientCtor(STSClient.STSClient, stsPlugins));
const getDefaultRoleAssumerWithWebIdentity = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity$1(stsOptions, getCustomizableStsClientCtor(STSClient.STSClient, stsPlugins));
const decorateDefaultCredentialProvider = (provider) => (input) => provider({
    roleAssumer: getDefaultRoleAssumer(input),
    roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity(input),
    ...input,
});

Object.defineProperty(exports, "$Command", {
    enumerable: true,
    get: function () { return smithyClient.Command; }
});
exports.AssumeRoleCommand = AssumeRoleCommand;
exports.AssumeRoleWithWebIdentityCommand = AssumeRoleWithWebIdentityCommand;
exports.ExpiredTokenException = ExpiredTokenException$1;
exports.IDPCommunicationErrorException = IDPCommunicationErrorException$1;
exports.IDPRejectedClaimException = IDPRejectedClaimException$1;
exports.InvalidIdentityTokenException = InvalidIdentityTokenException$1;
exports.MalformedPolicyDocumentException = MalformedPolicyDocumentException$1;
exports.PackedPolicyTooLargeException = PackedPolicyTooLargeException$1;
exports.RegionDisabledException = RegionDisabledException$1;
exports.STS = STS;
exports.STSServiceException = STSServiceException$1;
exports.decorateDefaultCredentialProvider = decorateDefaultCredentialProvider;
exports.getDefaultRoleAssumer = getDefaultRoleAssumer;
exports.getDefaultRoleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity;
Object.keys(STSClient).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return STSClient[k]; }
    });
});
