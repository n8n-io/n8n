'use strict';

var middlewareEventstream = require('@aws-sdk/middleware-eventstream');
var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var middlewareWebsocket = require('@aws-sdk/middleware-websocket');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
var eventstreamSerdeConfigResolver = require('@smithy/eventstream-serde-config-resolver');
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
        defaultSigningName: "bedrock",
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
    let _token = runtimeConfig.token;
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
        setToken(token) {
            _token = token;
        },
        token() {
            return _token;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
        token: config.token(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class BedrockRuntimeClient extends smithyClient.Client {
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
        const _config_7 = eventstreamSerdeConfigResolver.resolveEventStreamSerdeConfig(_config_6);
        const _config_8 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_7);
        const _config_9 = middlewareEventstream.resolveEventStreamConfig(_config_8);
        const _config_10 = middlewareWebsocket.resolveWebSocketConfig(_config_9);
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "smithy.api#httpBearerAuth": config.token,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

let BedrockRuntimeServiceException$1 = class BedrockRuntimeServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, BedrockRuntimeServiceException.prototype);
    }
};

let AccessDeniedException$1 = class AccessDeniedException extends BedrockRuntimeServiceException$1 {
    name = "AccessDeniedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
    }
};
let InternalServerException$1 = class InternalServerException extends BedrockRuntimeServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
    }
};
let ThrottlingException$1 = class ThrottlingException extends BedrockRuntimeServiceException$1 {
    name = "ThrottlingException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ThrottlingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ThrottlingException.prototype);
    }
};
let ValidationException$1 = class ValidationException extends BedrockRuntimeServiceException$1 {
    name = "ValidationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
    }
};
let ConflictException$1 = class ConflictException extends BedrockRuntimeServiceException$1 {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
    }
};
let ResourceNotFoundException$1 = class ResourceNotFoundException extends BedrockRuntimeServiceException$1 {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
};
let ServiceQuotaExceededException$1 = class ServiceQuotaExceededException extends BedrockRuntimeServiceException$1 {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ServiceQuotaExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceQuotaExceededException.prototype);
    }
};
let ServiceUnavailableException$1 = class ServiceUnavailableException extends BedrockRuntimeServiceException$1 {
    name = "ServiceUnavailableException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ServiceUnavailableException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
    }
};
let ModelErrorException$1 = class ModelErrorException extends BedrockRuntimeServiceException$1 {
    name = "ModelErrorException";
    $fault = "client";
    originalStatusCode;
    resourceName;
    constructor(opts) {
        super({
            name: "ModelErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.resourceName = opts.resourceName;
    }
};
let ModelNotReadyException$1 = class ModelNotReadyException extends BedrockRuntimeServiceException$1 {
    name = "ModelNotReadyException";
    $fault = "client";
    $retryable = {};
    constructor(opts) {
        super({
            name: "ModelNotReadyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelNotReadyException.prototype);
    }
};
let ModelTimeoutException$1 = class ModelTimeoutException extends BedrockRuntimeServiceException$1 {
    name = "ModelTimeoutException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ModelTimeoutException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelTimeoutException.prototype);
    }
};
let ModelStreamErrorException$1 = class ModelStreamErrorException extends BedrockRuntimeServiceException$1 {
    name = "ModelStreamErrorException";
    $fault = "client";
    originalStatusCode;
    originalMessage;
    constructor(opts) {
        super({
            name: "ModelStreamErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelStreamErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.originalMessage = opts.originalMessage;
    }
};

const _A = "Accept";
const _ADE = "AccessDeniedException";
const _AG = "ApplyGuardrail";
const _AGD = "AppliedGuardrailDetails";
const _AGR = "ApplyGuardrailRequest";
const _AGRp = "ApplyGuardrailResponse";
const _AIM = "AsyncInvokeMessage";
const _AIODC = "AsyncInvokeOutputDataConfig";
const _AIS = "AsyncInvokeSummary";
const _AISODC = "AsyncInvokeS3OutputDataConfig";
const _AISs = "AsyncInvokeSummaries";
const _ATC = "AnyToolChoice";
const _ATCu = "AutoToolChoice";
const _B = "Body";
const _BIPP = "BidirectionalInputPayloadPart";
const _BOPP = "BidirectionalOutputPayloadPart";
const _C = "Citation";
const _CB = "ContentBlocks";
const _CBD = "ContentBlockDelta";
const _CBDE = "ContentBlockDeltaEvent";
const _CBS = "ContentBlockStart";
const _CBSE = "ContentBlockStartEvent";
const _CBSEo = "ContentBlockStopEvent";
const _CBo = "ContentBlock";
const _CC = "CitationsConfig";
const _CCB = "CitationsContentBlock";
const _CD = "CitationsDelta";
const _CE = "ConflictException";
const _CGC = "CitationGeneratedContent";
const _CGCL = "CitationGeneratedContentList";
const _CL = "CitationLocation";
const _CM = "ConverseMetrics";
const _CO = "ConverseOutput";
const _CPB = "CachePointBlock";
const _CR = "ConverseRequest";
const _CRo = "ConverseResponse";
const _CS = "ConverseStream";
const _CSC = "CitationSourceContent";
const _CSCD = "CitationSourceContentDelta";
const _CSCL = "CitationSourceContentList";
const _CSCLD = "CitationSourceContentListDelta";
const _CSM = "ConverseStreamMetrics";
const _CSME = "ConverseStreamMetadataEvent";
const _CSO = "ConverseStreamOutput";
const _CSR = "ConverseStreamRequest";
const _CSRo = "ConverseStreamResponse";
const _CST = "ConverseStreamTrace";
const _CT = "ConverseTrace";
const _CTI = "CountTokensInput";
const _CTR = "ConverseTokensRequest";
const _CTRo = "CountTokensRequest";
const _CTRou = "CountTokensResponse";
const _CT_ = "Content-Type";
const _CTo = "CountTokens";
const _Ci = "Citations";
const _Co = "Converse";
const _DB = "DocumentBlock";
const _DCB = "DocumentContentBlocks";
const _DCBo = "DocumentContentBlock";
const _DCL = "DocumentCharLocation";
const _DCLo = "DocumentChunkLocation";
const _DPL = "DocumentPageLocation";
const _DS = "DocumentSource";
const _GA = "GuardrailAssessment";
const _GAI = "GetAsyncInvoke";
const _GAIR = "GetAsyncInvokeRequest";
const _GAIRe = "GetAsyncInvokeResponse";
const _GAL = "GuardrailAssessmentList";
const _GALM = "GuardrailAssessmentListMap";
const _GAM = "GuardrailAssessmentMap";
const _GARDSL = "GuardrailAutomatedReasoningDifferenceScenarioList";
const _GARF = "GuardrailAutomatedReasoningFinding";
const _GARFL = "GuardrailAutomatedReasoningFindingList";
const _GARIF = "GuardrailAutomatedReasoningImpossibleFinding";
const _GARIFu = "GuardrailAutomatedReasoningInvalidFinding";
const _GARITR = "GuardrailAutomatedReasoningInputTextReference";
const _GARITRL = "GuardrailAutomatedReasoningInputTextReferenceList";
const _GARLW = "GuardrailAutomatedReasoningLogicWarning";
const _GARNTF = "GuardrailAutomatedReasoningNoTranslationsFinding";
const _GARPA = "GuardrailAutomatedReasoningPolicyAssessment";
const _GARR = "GuardrailAutomatedReasoningRule";
const _GARRL = "GuardrailAutomatedReasoningRuleList";
const _GARS = "GuardrailAutomatedReasoningScenario";
const _GARSF = "GuardrailAutomatedReasoningSatisfiableFinding";
const _GARSL = "GuardrailAutomatedReasoningStatementList";
const _GARSLC = "GuardrailAutomatedReasoningStatementLogicContent";
const _GARSNLC = "GuardrailAutomatedReasoningStatementNaturalLanguageContent";
const _GARSu = "GuardrailAutomatedReasoningStatement";
const _GART = "GuardrailAutomatedReasoningTranslation";
const _GARTAF = "GuardrailAutomatedReasoningTranslationAmbiguousFinding";
const _GARTCF = "GuardrailAutomatedReasoningTooComplexFinding";
const _GARTL = "GuardrailAutomatedReasoningTranslationList";
const _GARTO = "GuardrailAutomatedReasoningTranslationOption";
const _GARTOL = "GuardrailAutomatedReasoningTranslationOptionList";
const _GARVF = "GuardrailAutomatedReasoningValidFinding";
const _GC = "GuardrailConfiguration";
const _GCB = "GuardrailContentBlock";
const _GCBL = "GuardrailContentBlockList";
const _GCCB = "GuardrailConverseContentBlock";
const _GCF = "GuardrailContentFilter";
const _GCFL = "GuardrailContentFilterList";
const _GCGF = "GuardrailContextualGroundingFilter";
const _GCGFu = "GuardrailContextualGroundingFilters";
const _GCGPA = "GuardrailContextualGroundingPolicyAssessment";
const _GCIB = "GuardrailConverseImageBlock";
const _GCIS = "GuardrailConverseImageSource";
const _GCPA = "GuardrailContentPolicyAssessment";
const _GCTB = "GuardrailConverseTextBlock";
const _GCW = "GuardrailCustomWord";
const _GCWL = "GuardrailCustomWordList";
const _GCu = "GuardrailCoverage";
const _GIB = "GuardrailImageBlock";
const _GIC = "GuardrailImageCoverage";
const _GIM = "GuardrailInvocationMetrics";
const _GIS = "GuardrailImageSource";
const _GMW = "GuardrailManagedWord";
const _GMWL = "GuardrailManagedWordList";
const _GOC = "GuardrailOutputContent";
const _GOCL = "GuardrailOutputContentList";
const _GPEF = "GuardrailPiiEntityFilter";
const _GPEFL = "GuardrailPiiEntityFilterList";
const _GRF = "GuardrailRegexFilter";
const _GRFL = "GuardrailRegexFilterList";
const _GSC = "GuardrailStreamConfiguration";
const _GSIPA = "GuardrailSensitiveInformationPolicyAssessment";
const _GT = "GuardrailTopic";
const _GTA = "GuardrailTraceAssessment";
const _GTB = "GuardrailTextBlock";
const _GTCC = "GuardrailTextCharactersCoverage";
const _GTL = "GuardrailTopicList";
const _GTPA = "GuardrailTopicPolicyAssessment";
const _GU = "GuardrailUsage";
const _GWPA = "GuardrailWordPolicyAssessment";
const _IB = "ImageBlock";
const _IC = "InferenceConfiguration";
const _IM = "InvokeModel";
const _IMR = "InvokeModelRequest";
const _IMRn = "InvokeModelResponse";
const _IMTR = "InvokeModelTokensRequest";
const _IMWBS = "InvokeModelWithBidirectionalStream";
const _IMWBSI = "InvokeModelWithBidirectionalStreamInput";
const _IMWBSO = "InvokeModelWithBidirectionalStreamOutput";
const _IMWBSR = "InvokeModelWithBidirectionalStreamRequest";
const _IMWBSRn = "InvokeModelWithBidirectionalStreamResponse";
const _IMWRS = "InvokeModelWithResponseStream";
const _IMWRSR = "InvokeModelWithResponseStreamRequest";
const _IMWRSRn = "InvokeModelWithResponseStreamResponse";
const _IS = "ImageSource";
const _ISE = "InternalServerException";
const _LAI = "ListAsyncInvokes";
const _LAIR = "ListAsyncInvokesRequest";
const _LAIRi = "ListAsyncInvokesResponse";
const _M = "Message";
const _MEE = "ModelErrorException";
const _MIP = "ModelInputPayload";
const _MNRE = "ModelNotReadyException";
const _MSE = "MessageStartEvent";
const _MSEE = "ModelStreamErrorException";
const _MSEe = "MessageStopEvent";
const _MTE = "ModelTimeoutException";
const _Me = "Messages";
const _PB = "PartBody";
const _PC = "PerformanceConfiguration";
const _PP = "PayloadPart";
const _PRT = "PromptRouterTrace";
const _PVM = "PromptVariableMap";
const _PVV = "PromptVariableValues";
const _RCB = "ReasoningContentBlock";
const _RCBD = "ReasoningContentBlockDelta";
const _RM = "RequestMetadata";
const _RNFE = "ResourceNotFoundException";
const _RS = "ResponseStream";
const _RTB = "ReasoningTextBlock";
const _SAI = "StartAsyncInvoke";
const _SAIR = "StartAsyncInvokeRequest";
const _SAIRt = "StartAsyncInvokeResponse";
const _SCB = "SystemContentBlocks";
const _SCBy = "SystemContentBlock";
const _SL = "S3Location";
const _SQEE = "ServiceQuotaExceededException";
const _SRB = "SearchResultBlock";
const _SRCB = "SearchResultContentBlock";
const _SRCBe = "SearchResultContentBlocks";
const _SRL = "SearchResultLocation";
const _ST = "ServiceTier";
const _STC = "SpecificToolChoice";
const _STy = "SystemTool";
const _SUE = "ServiceUnavailableException";
const _T = "Tag";
const _TC = "ToolConfiguration";
const _TCo = "ToolChoice";
const _TE = "ThrottlingException";
const _TIS = "ToolInputSchema";
const _TL = "TagList";
const _TRB = "ToolResultBlock";
const _TRBD = "ToolResultBlocksDelta";
const _TRBDo = "ToolResultBlockDelta";
const _TRBS = "ToolResultBlockStart";
const _TRCB = "ToolResultContentBlocks";
const _TRCBo = "ToolResultContentBlock";
const _TS = "ToolSpecification";
const _TU = "TokenUsage";
const _TUB = "ToolUseBlock";
const _TUBD = "ToolUseBlockDelta";
const _TUBS = "ToolUseBlockStart";
const _To = "Tools";
const _Too = "Tool";
const _VB = "VideoBlock";
const _VE = "ValidationException";
const _VS = "VideoSource";
const _WL = "WebLocation";
const _XABA = "X-Amzn-Bedrock-Accept";
const _XABCT = "X-Amzn-Bedrock-Content-Type";
const _XABG = "X-Amzn-Bedrock-GuardrailIdentifier";
const _XABG_ = "X-Amzn-Bedrock-GuardrailVersion";
const _XABPL = "X-Amzn-Bedrock-PerformanceConfig-Latency";
const _XABST = "X-Amzn-Bedrock-Service-Tier";
const _XABT = "X-Amzn-Bedrock-Trace";
const _a = "action";
const _aGD = "appliedGuardrailDetails";
const _aIS = "asyncInvokeSummaries";
const _aMRF = "additionalModelRequestFields";
const _aMRFP = "additionalModelResponseFieldPaths";
const _aMRFd = "additionalModelResponseFields";
const _aR = "actionReason";
const _aRP = "automatedReasoningPolicy";
const _aRPU = "automatedReasoningPolicyUnits";
const _aRPu = "automatedReasoningPolicies";
const _ac = "accept";
const _an = "any";
const _as = "assessments";
const _au = "auto";
const _b = "bytes";
const _bO = "bucketOwner";
const _bo = "body";
const _c = "client";
const _cBD = "contentBlockDelta";
const _cBI = "contentBlockIndex";
const _cBS = "contentBlockStart";
const _cBSo = "contentBlockStop";
const _cC = "citationsContent";
const _cFS = "claimsFalseScenario";
const _cGP = "contextualGroundingPolicy";
const _cGPU = "contextualGroundingPolicyUnits";
const _cP = "contentPolicy";
const _cPIU = "contentPolicyImageUnits";
const _cPU = "contentPolicyUnits";
const _cPa = "cachePoint";
const _cR = "contradictingRules";
const _cRIT = "cacheReadInputTokens";
const _cRT = "clientRequestToken";
const _cT = "contentType";
const _cTS = "claimsTrueScenario";
const _cW = "customWords";
const _cWIT = "cacheWriteInputTokens";
const _ch = "chunk";
const _ci = "citations";
const _cit = "citation";
const _cl = "claims";
const _co = "content";
const _con = "context";
const _conf = "confidence";
const _conv = "converse";
const _d = "delta";
const _dC = "documentChar";
const _dCo = "documentChunk";
const _dI = "documentIndex";
const _dP = "documentPage";
const _dS = "differenceScenarios";
const _de = "detected";
const _des = "description";
const _do = "domain";
const _doc = "document";
const _e = "error";
const _eT = "endTime";
const _en = "enabled";
const _end = "end";
const _f = "format";
const _fM = "failureMessage";
const _fS = "filterStrength";
const _fi = "findings";
const _fil = "filters";
const _g = "guardrail";
const _gA = "guardrailArn";
const _gC = "guardrailCoverage";
const _gCu = "guardrailConfig";
const _gCua = "guardContent";
const _gI = "guardrailId";
const _gIu = "guardrailIdentifier";
const _gO = "guardrailOrigin";
const _gOu = "guardrailOwnership";
const _gPL = "guardrailProcessingLatency";
const _gV = "guardrailVersion";
const _gu = "guarded";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _i = "input";
const _iA = "invocationArn";
const _iAn = "inputAssessment";
const _iC = "inferenceConfig";
const _iM = "invocationMetrics";
const _iMI = "invokedModelId";
const _iMn = "invokeModel";
const _iS = "inputSchema";
const _iSE = "internalServerException";
const _iT = "inputTokens";
const _id = "identifier";
const _im = "images";
const _ima = "image";
const _imp = "impossible";
const _in = "invalid";
const _j = "json";
const _k = "key";
const _kKI = "kmsKeyId";
const _l = "location";
const _lM = "latencyMs";
const _lMT = "lastModifiedTime";
const _lW = "logicWarning";
const _la = "latency";
const _lo = "logic";
const _m = "message";
const _mA = "modelArn";
const _mI = "modelId";
const _mIo = "modelInput";
const _mO = "modelOutput";
const _mR = "maxResults";
const _mS = "messageStart";
const _mSEE = "modelStreamErrorException";
const _mSe = "messageStop";
const _mT = "maxTokens";
const _mTE = "modelTimeoutException";
const _mWL = "managedWordLists";
const _ma = "match";
const _me = "messages";
const _met = "metrics";
const _meta = "metadata";
const _n = "name";
const _nL = "naturalLanguage";
const _nT = "nextToken";
const _nTo = "noTranslations";
const _o = "outputs";
const _oA = "outputAssessments";
const _oDC = "outputDataConfig";
const _oM = "originalMessage";
const _oS = "outputScope";
const _oSC = "originalStatusCode";
const _oT = "outputTokens";
const _op = "options";
const _ou = "output";
const _p = "premises";
const _pC = "performanceConfig";
const _pCL = "performanceConfigLatency";
const _pE = "piiEntities";
const _pR = "promptRouter";
const _pV = "promptVariables";
const _pVA = "policyVersionArn";
const _q = "qualifiers";
const _r = "regex";
const _rC = "reasoningContent";
const _rCe = "redactedContent";
const _rM = "requestMetadata";
const _rN = "resourceName";
const _rT = "reasoningText";
const _re = "regexes";
const _ro = "role";
const _s = "source";
const _sB = "sortBy";
const _sC = "sourceContent";
const _sE = "statusEquals";
const _sIP = "sensitiveInformationPolicy";
const _sIPFU = "sensitiveInformationPolicyFreeUnits";
const _sIPU = "sensitiveInformationPolicyUnits";
const _sL = "s3Location";
const _sO = "sortOrder";
const _sODC = "s3OutputDataConfig";
const _sPM = "streamProcessingMode";
const _sR = "stopReason";
const _sRI = "searchResultIndex";
const _sRL = "searchResultLocation";
const _sRe = "searchResult";
const _sRu = "supportingRules";
const _sS = "stopSequences";
const _sT = "submitTime";
const _sTA = "submitTimeAfter";
const _sTB = "submitTimeBefore";
const _sTe = "serviceTier";
const _sTy = "systemTool";
const _sU = "s3Uri";
const _sUE = "serviceUnavailableException";
const _sa = "satisfiable";
const _sc = "score";
const _se = "server";
const _si = "signature";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime";
const _st = "status";
const _sta = "start";
const _stat = "statements";
const _str = "stream";
const _stre = "streaming";
const _sy = "system";
const _t = "type";
const _tA = "translationAmbiguous";
const _tC = "toolConfig";
const _tCe = "textCharacters";
const _tCo = "toolChoice";
const _tCoo = "tooComplex";
const _tE = "throttlingException";
const _tP = "topicPolicy";
const _tPU = "topicPolicyUnits";
const _tPo = "topP";
const _tR = "toolResult";
const _tS = "toolSpec";
const _tT = "totalTokens";
const _tU = "toolUse";
const _tUI = "toolUseId";
const _ta = "tags";
const _te = "text";
const _tem = "temperature";
const _th = "threshold";
const _ti = "title";
const _to = "total";
const _too = "tools";
const _tool = "tool";
const _top = "topics";
const _tr = "trace";
const _tra = "translation";
const _tran = "translations";
const _u = "usage";
const _uC = "untranslatedClaims";
const _uP = "untranslatedPremises";
const _ur = "uri";
const _url = "url";
const _v = "value";
const _vE = "validationException";
const _va = "valid";
const _vi = "video";
const _w = "web";
const _wP = "wordPolicy";
const _wPU = "wordPolicyUnits";
const n0 = "com.amazonaws.bedrockruntime";
var AsyncInvokeMessage = [0, n0, _AIM, 8, 0];
var Body = [0, n0, _B, 8, 21];
var GuardrailAutomatedReasoningStatementLogicContent = [0, n0, _GARSLC, 8, 0];
var GuardrailAutomatedReasoningStatementNaturalLanguageContent = [0, n0, _GARSNLC, 8, 0];
var ModelInputPayload = [0, n0, _MIP, 8, 15];
var PartBody = [0, n0, _PB, 8, 21];
var AccessDeniedException = [
    -3,
    n0,
    _ADE,
    {
        [_e]: _c,
        [_hE]: 403,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
var AnyToolChoice = [3, n0, _ATC, 0, [], []];
var AppliedGuardrailDetails = [
    3,
    n0,
    _AGD,
    0,
    [_gI, _gV, _gA, _gO, _gOu],
    [0, 0, 0, 64 | 0, 0],
];
var ApplyGuardrailRequest = [
    3,
    n0,
    _AGR,
    0,
    [_gIu, _gV, _s, _co, _oS],
    [[0, 1], [0, 1], 0, [() => GuardrailContentBlockList, 0], 0],
];
var ApplyGuardrailResponse = [
    3,
    n0,
    _AGRp,
    0,
    [_u, _a, _aR, _o, _as, _gC],
    [
        () => GuardrailUsage,
        0,
        0,
        () => GuardrailOutputContentList,
        [() => GuardrailAssessmentList, 0],
        () => GuardrailCoverage,
    ],
];
var AsyncInvokeS3OutputDataConfig = [3, n0, _AISODC, 0, [_sU, _kKI, _bO], [0, 0, 0]];
var AsyncInvokeSummary = [
    3,
    n0,
    _AIS,
    0,
    [_iA, _mA, _cRT, _st, _fM, _sT, _lMT, _eT, _oDC],
    [0, 0, 0, 0, [() => AsyncInvokeMessage, 0], 5, 5, 5, () => AsyncInvokeOutputDataConfig],
];
var AutoToolChoice = [3, n0, _ATCu, 0, [], []];
var BidirectionalInputPayloadPart = [3, n0, _BIPP, 8, [_b], [[() => PartBody, 0]]];
var BidirectionalOutputPayloadPart = [3, n0, _BOPP, 8, [_b], [[() => PartBody, 0]]];
var CachePointBlock = [3, n0, _CPB, 0, [_t], [0]];
var Citation = [
    3,
    n0,
    _C,
    0,
    [_ti, _s, _sC, _l],
    [0, 0, () => CitationSourceContentList, () => CitationLocation],
];
var CitationsConfig = [3, n0, _CC, 0, [_en], [2]];
var CitationsContentBlock = [
    3,
    n0,
    _CCB,
    0,
    [_co, _ci],
    [() => CitationGeneratedContentList, () => Citations],
];
var CitationsDelta = [
    3,
    n0,
    _CD,
    0,
    [_ti, _s, _sC, _l],
    [0, 0, () => CitationSourceContentListDelta, () => CitationLocation],
];
var CitationSourceContentDelta = [3, n0, _CSCD, 0, [_te], [0]];
var ConflictException = [
    -3,
    n0,
    _CE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ConflictException, ConflictException$1);
var ContentBlockDeltaEvent = [
    3,
    n0,
    _CBDE,
    0,
    [_d, _cBI],
    [[() => ContentBlockDelta, 0], 1],
];
var ContentBlockStartEvent = [
    3,
    n0,
    _CBSE,
    0,
    [_sta, _cBI],
    [() => ContentBlockStart, 1],
];
var ContentBlockStopEvent = [3, n0, _CBSEo, 0, [_cBI], [1]];
var ConverseMetrics = [3, n0, _CM, 0, [_lM], [1]];
var ConverseRequest = [
    3,
    n0,
    _CR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe],
    [
        [0, 1],
        [() => Messages, 0],
        [() => SystemContentBlocks, 0],
        () => InferenceConfiguration,
        () => ToolConfiguration,
        () => GuardrailConfiguration,
        15,
        [() => PromptVariableMap, 0],
        64 | 0,
        [() => RequestMetadata, 0],
        () => PerformanceConfiguration,
        () => ServiceTier,
    ],
];
var ConverseResponse = [
    3,
    n0,
    _CRo,
    0,
    [_ou, _sR, _u, _met, _aMRFd, _tr, _pC, _sTe],
    [
        [() => ConverseOutput, 0],
        0,
        () => TokenUsage,
        () => ConverseMetrics,
        15,
        [() => ConverseTrace, 0],
        () => PerformanceConfiguration,
        () => ServiceTier,
    ],
];
var ConverseStreamMetadataEvent = [
    3,
    n0,
    _CSME,
    0,
    [_u, _met, _tr, _pC, _sTe],
    [
        () => TokenUsage,
        () => ConverseStreamMetrics,
        [() => ConverseStreamTrace, 0],
        () => PerformanceConfiguration,
        () => ServiceTier,
    ],
];
var ConverseStreamMetrics = [3, n0, _CSM, 0, [_lM], [1]];
var ConverseStreamRequest = [
    3,
    n0,
    _CSR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe],
    [
        [0, 1],
        [() => Messages, 0],
        [() => SystemContentBlocks, 0],
        () => InferenceConfiguration,
        () => ToolConfiguration,
        () => GuardrailStreamConfiguration,
        15,
        [() => PromptVariableMap, 0],
        64 | 0,
        [() => RequestMetadata, 0],
        () => PerformanceConfiguration,
        () => ServiceTier,
    ],
];
var ConverseStreamResponse = [
    3,
    n0,
    _CSRo,
    0,
    [_str],
    [[() => ConverseStreamOutput, 16]],
];
var ConverseStreamTrace = [
    3,
    n0,
    _CST,
    0,
    [_g, _pR],
    [[() => GuardrailTraceAssessment, 0], () => PromptRouterTrace],
];
var ConverseTokensRequest = [
    3,
    n0,
    _CTR,
    0,
    [_me, _sy, _tC, _aMRF],
    [[() => Messages, 0], [() => SystemContentBlocks, 0], () => ToolConfiguration, 15],
];
var ConverseTrace = [
    3,
    n0,
    _CT,
    0,
    [_g, _pR],
    [[() => GuardrailTraceAssessment, 0], () => PromptRouterTrace],
];
var CountTokensRequest = [
    3,
    n0,
    _CTRo,
    0,
    [_mI, _i],
    [
        [0, 1],
        [() => CountTokensInput, 0],
    ],
];
var CountTokensResponse = [3, n0, _CTRou, 0, [_iT], [1]];
var DocumentBlock = [
    3,
    n0,
    _DB,
    0,
    [_f, _n, _s, _con, _ci],
    [0, 0, () => DocumentSource, 0, () => CitationsConfig],
];
var DocumentCharLocation = [3, n0, _DCL, 0, [_dI, _sta, _end], [1, 1, 1]];
var DocumentChunkLocation = [3, n0, _DCLo, 0, [_dI, _sta, _end], [1, 1, 1]];
var DocumentPageLocation = [3, n0, _DPL, 0, [_dI, _sta, _end], [1, 1, 1]];
var GetAsyncInvokeRequest = [3, n0, _GAIR, 0, [_iA], [[0, 1]]];
var GetAsyncInvokeResponse = [
    3,
    n0,
    _GAIRe,
    0,
    [_iA, _mA, _cRT, _st, _fM, _sT, _lMT, _eT, _oDC],
    [0, 0, 0, 0, [() => AsyncInvokeMessage, 0], 5, 5, 5, () => AsyncInvokeOutputDataConfig],
];
var GuardrailAssessment = [
    3,
    n0,
    _GA,
    0,
    [_tP, _cP, _wP, _sIP, _cGP, _aRP, _iM, _aGD],
    [
        () => GuardrailTopicPolicyAssessment,
        () => GuardrailContentPolicyAssessment,
        () => GuardrailWordPolicyAssessment,
        () => GuardrailSensitiveInformationPolicyAssessment,
        () => GuardrailContextualGroundingPolicyAssessment,
        [() => GuardrailAutomatedReasoningPolicyAssessment, 0],
        () => GuardrailInvocationMetrics,
        () => AppliedGuardrailDetails,
    ],
];
var GuardrailAutomatedReasoningImpossibleFinding = [
    3,
    n0,
    _GARIF,
    0,
    [_tra, _cR, _lW],
    [
        [() => GuardrailAutomatedReasoningTranslation, 0],
        () => GuardrailAutomatedReasoningRuleList,
        [() => GuardrailAutomatedReasoningLogicWarning, 0],
    ],
];
var GuardrailAutomatedReasoningInputTextReference = [
    3,
    n0,
    _GARITR,
    0,
    [_te],
    [[() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0]],
];
var GuardrailAutomatedReasoningInvalidFinding = [
    3,
    n0,
    _GARIFu,
    0,
    [_tra, _cR, _lW],
    [
        [() => GuardrailAutomatedReasoningTranslation, 0],
        () => GuardrailAutomatedReasoningRuleList,
        [() => GuardrailAutomatedReasoningLogicWarning, 0],
    ],
];
var GuardrailAutomatedReasoningLogicWarning = [
    3,
    n0,
    _GARLW,
    0,
    [_t, _p, _cl],
    [0, [() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningStatementList, 0]],
];
var GuardrailAutomatedReasoningNoTranslationsFinding = [3, n0, _GARNTF, 0, [], []];
var GuardrailAutomatedReasoningPolicyAssessment = [
    3,
    n0,
    _GARPA,
    0,
    [_fi],
    [[() => GuardrailAutomatedReasoningFindingList, 0]],
];
var GuardrailAutomatedReasoningRule = [3, n0, _GARR, 0, [_id, _pVA], [0, 0]];
var GuardrailAutomatedReasoningSatisfiableFinding = [
    3,
    n0,
    _GARSF,
    0,
    [_tra, _cTS, _cFS, _lW],
    [
        [() => GuardrailAutomatedReasoningTranslation, 0],
        [() => GuardrailAutomatedReasoningScenario, 0],
        [() => GuardrailAutomatedReasoningScenario, 0],
        [() => GuardrailAutomatedReasoningLogicWarning, 0],
    ],
];
var GuardrailAutomatedReasoningScenario = [
    3,
    n0,
    _GARS,
    0,
    [_stat],
    [[() => GuardrailAutomatedReasoningStatementList, 0]],
];
var GuardrailAutomatedReasoningStatement = [
    3,
    n0,
    _GARSu,
    0,
    [_lo, _nL],
    [
        [() => GuardrailAutomatedReasoningStatementLogicContent, 0],
        [() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0],
    ],
];
var GuardrailAutomatedReasoningTooComplexFinding = [3, n0, _GARTCF, 0, [], []];
var GuardrailAutomatedReasoningTranslation = [
    3,
    n0,
    _GART,
    0,
    [_p, _cl, _uP, _uC, _conf],
    [
        [() => GuardrailAutomatedReasoningStatementList, 0],
        [() => GuardrailAutomatedReasoningStatementList, 0],
        [() => GuardrailAutomatedReasoningInputTextReferenceList, 0],
        [() => GuardrailAutomatedReasoningInputTextReferenceList, 0],
        1,
    ],
];
var GuardrailAutomatedReasoningTranslationAmbiguousFinding = [
    3,
    n0,
    _GARTAF,
    0,
    [_op, _dS],
    [
        [() => GuardrailAutomatedReasoningTranslationOptionList, 0],
        [() => GuardrailAutomatedReasoningDifferenceScenarioList, 0],
    ],
];
var GuardrailAutomatedReasoningTranslationOption = [
    3,
    n0,
    _GARTO,
    0,
    [_tran],
    [[() => GuardrailAutomatedReasoningTranslationList, 0]],
];
var GuardrailAutomatedReasoningValidFinding = [
    3,
    n0,
    _GARVF,
    0,
    [_tra, _cTS, _sRu, _lW],
    [
        [() => GuardrailAutomatedReasoningTranslation, 0],
        [() => GuardrailAutomatedReasoningScenario, 0],
        () => GuardrailAutomatedReasoningRuleList,
        [() => GuardrailAutomatedReasoningLogicWarning, 0],
    ],
];
var GuardrailConfiguration = [3, n0, _GC, 0, [_gIu, _gV, _tr], [0, 0, 0]];
var GuardrailContentFilter = [3, n0, _GCF, 0, [_t, _conf, _fS, _a, _de], [0, 0, 0, 0, 2]];
var GuardrailContentPolicyAssessment = [
    3,
    n0,
    _GCPA,
    0,
    [_fil],
    [() => GuardrailContentFilterList],
];
var GuardrailContextualGroundingFilter = [
    3,
    n0,
    _GCGF,
    0,
    [_t, _th, _sc, _a, _de],
    [0, 1, 1, 0, 2],
];
var GuardrailContextualGroundingPolicyAssessment = [
    3,
    n0,
    _GCGPA,
    0,
    [_fil],
    [() => GuardrailContextualGroundingFilters],
];
var GuardrailConverseImageBlock = [
    3,
    n0,
    _GCIB,
    8,
    [_f, _s],
    [0, [() => GuardrailConverseImageSource, 0]],
];
var GuardrailConverseTextBlock = [3, n0, _GCTB, 0, [_te, _q], [0, 64 | 0]];
var GuardrailCoverage = [
    3,
    n0,
    _GCu,
    0,
    [_tCe, _im],
    [() => GuardrailTextCharactersCoverage, () => GuardrailImageCoverage],
];
var GuardrailCustomWord = [3, n0, _GCW, 0, [_ma, _a, _de], [0, 0, 2]];
var GuardrailImageBlock = [
    3,
    n0,
    _GIB,
    8,
    [_f, _s],
    [0, [() => GuardrailImageSource, 0]],
];
var GuardrailImageCoverage = [3, n0, _GIC, 0, [_gu, _to], [1, 1]];
var GuardrailInvocationMetrics = [
    3,
    n0,
    _GIM,
    0,
    [_gPL, _u, _gC],
    [1, () => GuardrailUsage, () => GuardrailCoverage],
];
var GuardrailManagedWord = [3, n0, _GMW, 0, [_ma, _t, _a, _de], [0, 0, 0, 2]];
var GuardrailOutputContent = [3, n0, _GOC, 0, [_te], [0]];
var GuardrailPiiEntityFilter = [3, n0, _GPEF, 0, [_ma, _t, _a, _de], [0, 0, 0, 2]];
var GuardrailRegexFilter = [3, n0, _GRF, 0, [_n, _ma, _r, _a, _de], [0, 0, 0, 0, 2]];
var GuardrailSensitiveInformationPolicyAssessment = [
    3,
    n0,
    _GSIPA,
    0,
    [_pE, _re],
    [() => GuardrailPiiEntityFilterList, () => GuardrailRegexFilterList],
];
var GuardrailStreamConfiguration = [3, n0, _GSC, 0, [_gIu, _gV, _tr, _sPM], [0, 0, 0, 0]];
var GuardrailTextBlock = [3, n0, _GTB, 0, [_te, _q], [0, 64 | 0]];
var GuardrailTextCharactersCoverage = [3, n0, _GTCC, 0, [_gu, _to], [1, 1]];
var GuardrailTopic = [3, n0, _GT, 0, [_n, _t, _a, _de], [0, 0, 0, 2]];
var GuardrailTopicPolicyAssessment = [
    3,
    n0,
    _GTPA,
    0,
    [_top],
    [() => GuardrailTopicList],
];
var GuardrailTraceAssessment = [
    3,
    n0,
    _GTA,
    0,
    [_mO, _iAn, _oA, _aR],
    [64 | 0, [() => GuardrailAssessmentMap, 0], [() => GuardrailAssessmentListMap, 0], 0],
];
var GuardrailUsage = [
    3,
    n0,
    _GU,
    0,
    [_tPU, _cPU, _wPU, _sIPU, _sIPFU, _cGPU, _cPIU, _aRPU, _aRPu],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
];
var GuardrailWordPolicyAssessment = [
    3,
    n0,
    _GWPA,
    0,
    [_cW, _mWL],
    [() => GuardrailCustomWordList, () => GuardrailManagedWordList],
];
var ImageBlock = [3, n0, _IB, 0, [_f, _s], [0, () => ImageSource]];
var InferenceConfiguration = [3, n0, _IC, 0, [_mT, _tem, _tPo, _sS], [1, 1, 1, 64 | 0]];
var InternalServerException = [
    -3,
    n0,
    _ISE,
    {
        [_e]: _se,
        [_hE]: 500,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
var InvokeModelRequest = [
    3,
    n0,
    _IMR,
    0,
    [_bo, _cT, _ac, _mI, _tr, _gIu, _gV, _pCL, _sTe],
    [
        [() => Body, 16],
        [
            0,
            {
                [_hH]: _CT_,
            },
        ],
        [
            0,
            {
                [_hH]: _A,
            },
        ],
        [0, 1],
        [
            0,
            {
                [_hH]: _XABT,
            },
        ],
        [
            0,
            {
                [_hH]: _XABG,
            },
        ],
        [
            0,
            {
                [_hH]: _XABG_,
            },
        ],
        [
            0,
            {
                [_hH]: _XABPL,
            },
        ],
        [
            0,
            {
                [_hH]: _XABST,
            },
        ],
    ],
];
var InvokeModelResponse = [
    3,
    n0,
    _IMRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [
        [() => Body, 16],
        [
            0,
            {
                [_hH]: _CT_,
            },
        ],
        [
            0,
            {
                [_hH]: _XABPL,
            },
        ],
        [
            0,
            {
                [_hH]: _XABST,
            },
        ],
    ],
];
var InvokeModelTokensRequest = [3, n0, _IMTR, 0, [_bo], [[() => Body, 0]]];
var InvokeModelWithBidirectionalStreamRequest = [
    3,
    n0,
    _IMWBSR,
    0,
    [_mI, _bo],
    [
        [0, 1],
        [() => InvokeModelWithBidirectionalStreamInput, 16],
    ],
];
var InvokeModelWithBidirectionalStreamResponse = [
    3,
    n0,
    _IMWBSRn,
    0,
    [_bo],
    [[() => InvokeModelWithBidirectionalStreamOutput, 16]],
];
var InvokeModelWithResponseStreamRequest = [
    3,
    n0,
    _IMWRSR,
    0,
    [_bo, _cT, _ac, _mI, _tr, _gIu, _gV, _pCL, _sTe],
    [
        [() => Body, 16],
        [
            0,
            {
                [_hH]: _CT_,
            },
        ],
        [
            0,
            {
                [_hH]: _XABA,
            },
        ],
        [0, 1],
        [
            0,
            {
                [_hH]: _XABT,
            },
        ],
        [
            0,
            {
                [_hH]: _XABG,
            },
        ],
        [
            0,
            {
                [_hH]: _XABG_,
            },
        ],
        [
            0,
            {
                [_hH]: _XABPL,
            },
        ],
        [
            0,
            {
                [_hH]: _XABST,
            },
        ],
    ],
];
var InvokeModelWithResponseStreamResponse = [
    3,
    n0,
    _IMWRSRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [
        [() => ResponseStream, 16],
        [
            0,
            {
                [_hH]: _XABCT,
            },
        ],
        [
            0,
            {
                [_hH]: _XABPL,
            },
        ],
        [
            0,
            {
                [_hH]: _XABST,
            },
        ],
    ],
];
var ListAsyncInvokesRequest = [
    3,
    n0,
    _LAIR,
    0,
    [_sTA, _sTB, _sE, _mR, _nT, _sB, _sO],
    [
        [
            5,
            {
                [_hQ]: _sTA,
            },
        ],
        [
            5,
            {
                [_hQ]: _sTB,
            },
        ],
        [
            0,
            {
                [_hQ]: _sE,
            },
        ],
        [
            1,
            {
                [_hQ]: _mR,
            },
        ],
        [
            0,
            {
                [_hQ]: _nT,
            },
        ],
        [
            0,
            {
                [_hQ]: _sB,
            },
        ],
        [
            0,
            {
                [_hQ]: _sO,
            },
        ],
    ],
];
var ListAsyncInvokesResponse = [
    3,
    n0,
    _LAIRi,
    0,
    [_nT, _aIS],
    [0, [() => AsyncInvokeSummaries, 0]],
];
var Message = [3, n0, _M, 0, [_ro, _co], [0, [() => ContentBlocks, 0]]];
var MessageStartEvent = [3, n0, _MSE, 0, [_ro], [0]];
var MessageStopEvent = [3, n0, _MSEe, 0, [_sR, _aMRFd], [0, 15]];
var ModelErrorException = [
    -3,
    n0,
    _MEE,
    {
        [_e]: _c,
        [_hE]: 424,
    },
    [_m, _oSC, _rN],
    [0, 1, 0],
];
schema.TypeRegistry.for(n0).registerError(ModelErrorException, ModelErrorException$1);
var ModelNotReadyException = [
    -3,
    n0,
    _MNRE,
    {
        [_e]: _c,
        [_hE]: 429,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ModelNotReadyException, ModelNotReadyException$1);
var ModelStreamErrorException = [
    -3,
    n0,
    _MSEE,
    {
        [_e]: _c,
        [_hE]: 424,
    },
    [_m, _oSC, _oM],
    [0, 1, 0],
];
schema.TypeRegistry.for(n0).registerError(ModelStreamErrorException, ModelStreamErrorException$1);
var ModelTimeoutException = [
    -3,
    n0,
    _MTE,
    {
        [_e]: _c,
        [_hE]: 408,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ModelTimeoutException, ModelTimeoutException$1);
var PayloadPart = [3, n0, _PP, 8, [_b], [[() => PartBody, 0]]];
var PerformanceConfiguration = [3, n0, _PC, 0, [_la], [0]];
var PromptRouterTrace = [3, n0, _PRT, 0, [_iMI], [0]];
var ReasoningTextBlock = [3, n0, _RTB, 8, [_te, _si], [0, 0]];
var ResourceNotFoundException = [
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
schema.TypeRegistry.for(n0).registerError(ResourceNotFoundException, ResourceNotFoundException$1);
var S3Location = [3, n0, _SL, 0, [_ur, _bO], [0, 0]];
var SearchResultBlock = [
    3,
    n0,
    _SRB,
    0,
    [_s, _ti, _co, _ci],
    [0, 0, () => SearchResultContentBlocks, () => CitationsConfig],
];
var SearchResultContentBlock = [3, n0, _SRCB, 0, [_te], [0]];
var SearchResultLocation = [3, n0, _SRL, 0, [_sRI, _sta, _end], [1, 1, 1]];
var ServiceQuotaExceededException = [
    -3,
    n0,
    _SQEE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ServiceQuotaExceededException, ServiceQuotaExceededException$1);
var ServiceTier = [3, n0, _ST, 0, [_t], [0]];
var ServiceUnavailableException = [
    -3,
    n0,
    _SUE,
    {
        [_e]: _se,
        [_hE]: 503,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ServiceUnavailableException, ServiceUnavailableException$1);
var SpecificToolChoice = [3, n0, _STC, 0, [_n], [0]];
var StartAsyncInvokeRequest = [
    3,
    n0,
    _SAIR,
    0,
    [_cRT, _mI, _mIo, _oDC, _ta],
    [[0, 4], 0, [() => ModelInputPayload, 0], () => AsyncInvokeOutputDataConfig, () => TagList],
];
var StartAsyncInvokeResponse = [3, n0, _SAIRt, 0, [_iA], [0]];
var SystemTool = [3, n0, _STy, 0, [_n], [0]];
var Tag = [3, n0, _T, 0, [_k, _v], [0, 0]];
var ThrottlingException = [
    -3,
    n0,
    _TE,
    {
        [_e]: _c,
        [_hE]: 429,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ThrottlingException, ThrottlingException$1);
var TokenUsage = [3, n0, _TU, 0, [_iT, _oT, _tT, _cRIT, _cWIT], [1, 1, 1, 1, 1]];
var ToolConfiguration = [3, n0, _TC, 0, [_too, _tCo], [() => Tools, () => ToolChoice]];
var ToolResultBlock = [
    3,
    n0,
    _TRB,
    0,
    [_tUI, _co, _st, _t],
    [0, () => ToolResultContentBlocks, 0, 0],
];
var ToolResultBlockStart = [3, n0, _TRBS, 0, [_tUI, _t, _st], [0, 0, 0]];
var ToolSpecification = [3, n0, _TS, 0, [_n, _des, _iS], [0, 0, () => ToolInputSchema]];
var ToolUseBlock = [3, n0, _TUB, 0, [_tUI, _n, _i, _t], [0, 0, 15, 0]];
var ToolUseBlockDelta = [3, n0, _TUBD, 0, [_i], [0]];
var ToolUseBlockStart = [3, n0, _TUBS, 0, [_tUI, _n, _t], [0, 0, 0]];
var ValidationException = [
    -3,
    n0,
    _VE,
    {
        [_e]: _c,
        [_hE]: 400,
    },
    [_m],
    [0],
];
schema.TypeRegistry.for(n0).registerError(ValidationException, ValidationException$1);
var VideoBlock = [3, n0, _VB, 0, [_f, _s], [0, () => VideoSource]];
var WebLocation = [3, n0, _WL, 0, [_url, _do], [0, 0]];
var BedrockRuntimeServiceException = [-3, _sm, "BedrockRuntimeServiceException", 0, [], []];
schema.TypeRegistry.for(_sm).registerError(BedrockRuntimeServiceException, BedrockRuntimeServiceException$1);
var AsyncInvokeSummaries = [1, n0, _AISs, 0, [() => AsyncInvokeSummary, 0]];
var CitationGeneratedContentList = [1, n0, _CGCL, 0, () => CitationGeneratedContent];
var Citations = [1, n0, _Ci, 0, () => Citation];
var CitationSourceContentList = [1, n0, _CSCL, 0, () => CitationSourceContent];
var CitationSourceContentListDelta = [1, n0, _CSCLD, 0, () => CitationSourceContentDelta];
var ContentBlocks = [1, n0, _CB, 0, [() => ContentBlock, 0]];
var DocumentContentBlocks = [1, n0, _DCB, 0, () => DocumentContentBlock];
var GuardrailAssessmentList = [1, n0, _GAL, 0, [() => GuardrailAssessment, 0]];
var GuardrailAutomatedReasoningDifferenceScenarioList = [
    1,
    n0,
    _GARDSL,
    0,
    [() => GuardrailAutomatedReasoningScenario, 0],
];
var GuardrailAutomatedReasoningFindingList = [
    1,
    n0,
    _GARFL,
    0,
    [() => GuardrailAutomatedReasoningFinding, 0],
];
var GuardrailAutomatedReasoningInputTextReferenceList = [
    1,
    n0,
    _GARITRL,
    0,
    [() => GuardrailAutomatedReasoningInputTextReference, 0],
];
var GuardrailAutomatedReasoningRuleList = [
    1,
    n0,
    _GARRL,
    0,
    () => GuardrailAutomatedReasoningRule,
];
var GuardrailAutomatedReasoningStatementList = [
    1,
    n0,
    _GARSL,
    0,
    [() => GuardrailAutomatedReasoningStatement, 0],
];
var GuardrailAutomatedReasoningTranslationList = [
    1,
    n0,
    _GARTL,
    0,
    [() => GuardrailAutomatedReasoningTranslation, 0],
];
var GuardrailAutomatedReasoningTranslationOptionList = [
    1,
    n0,
    _GARTOL,
    0,
    [() => GuardrailAutomatedReasoningTranslationOption, 0],
];
var GuardrailContentBlockList = [1, n0, _GCBL, 0, [() => GuardrailContentBlock, 0]];
var GuardrailContentFilterList = [1, n0, _GCFL, 0, () => GuardrailContentFilter];
var GuardrailContextualGroundingFilters = [
    1,
    n0,
    _GCGFu,
    0,
    () => GuardrailContextualGroundingFilter,
];
var GuardrailCustomWordList = [1, n0, _GCWL, 0, () => GuardrailCustomWord];
var GuardrailManagedWordList = [1, n0, _GMWL, 0, () => GuardrailManagedWord];
var GuardrailOutputContentList = [1, n0, _GOCL, 0, () => GuardrailOutputContent];
var GuardrailPiiEntityFilterList = [1, n0, _GPEFL, 0, () => GuardrailPiiEntityFilter];
var GuardrailRegexFilterList = [1, n0, _GRFL, 0, () => GuardrailRegexFilter];
var GuardrailTopicList = [1, n0, _GTL, 0, () => GuardrailTopic];
var Messages = [1, n0, _Me, 0, [() => Message, 0]];
var SearchResultContentBlocks = [1, n0, _SRCBe, 0, () => SearchResultContentBlock];
var SystemContentBlocks = [1, n0, _SCB, 0, [() => SystemContentBlock, 0]];
var TagList = [1, n0, _TL, 0, () => Tag];
var ToolResultBlocksDelta = [1, n0, _TRBD, 0, () => ToolResultBlockDelta];
var ToolResultContentBlocks = [1, n0, _TRCB, 0, () => ToolResultContentBlock];
var Tools = [1, n0, _To, 0, () => Tool];
var GuardrailAssessmentListMap = [2, n0, _GALM, 0, [0, 0], [() => GuardrailAssessmentList, 0]];
var GuardrailAssessmentMap = [2, n0, _GAM, 0, [0, 0], [() => GuardrailAssessment, 0]];
var PromptVariableMap = [2, n0, _PVM, 8, 0, () => PromptVariableValues];
var RequestMetadata = [2, n0, _RM, 8, 0, 0];
var AsyncInvokeOutputDataConfig = [
    3,
    n0,
    _AIODC,
    0,
    [_sODC],
    [() => AsyncInvokeS3OutputDataConfig],
];
var CitationGeneratedContent = [3, n0, _CGC, 0, [_te], [0]];
var CitationLocation = [
    3,
    n0,
    _CL,
    0,
    [_w, _dC, _dP, _dCo, _sRL],
    [
        () => WebLocation,
        () => DocumentCharLocation,
        () => DocumentPageLocation,
        () => DocumentChunkLocation,
        () => SearchResultLocation,
    ],
];
var CitationSourceContent = [3, n0, _CSC, 0, [_te], [0]];
var ContentBlock = [
    3,
    n0,
    _CBo,
    0,
    [_te, _ima, _doc, _vi, _tU, _tR, _gCua, _cPa, _rC, _cC, _sRe],
    [
        0,
        () => ImageBlock,
        () => DocumentBlock,
        () => VideoBlock,
        () => ToolUseBlock,
        () => ToolResultBlock,
        [() => GuardrailConverseContentBlock, 0],
        () => CachePointBlock,
        [() => ReasoningContentBlock, 0],
        () => CitationsContentBlock,
        () => SearchResultBlock,
    ],
];
var ContentBlockDelta = [
    3,
    n0,
    _CBD,
    0,
    [_te, _tU, _tR, _rC, _cit],
    [
        0,
        () => ToolUseBlockDelta,
        () => ToolResultBlocksDelta,
        [() => ReasoningContentBlockDelta, 0],
        () => CitationsDelta,
    ],
];
var ContentBlockStart = [
    3,
    n0,
    _CBS,
    0,
    [_tU, _tR],
    [() => ToolUseBlockStart, () => ToolResultBlockStart],
];
var ConverseOutput = [3, n0, _CO, 0, [_m], [[() => Message, 0]]];
var ConverseStreamOutput = [
    3,
    n0,
    _CSO,
    {
        [_stre]: 1,
    },
    [_mS, _cBS, _cBD, _cBSo, _mSe, _meta, _iSE, _mSEE, _vE, _tE, _sUE],
    [
        () => MessageStartEvent,
        () => ContentBlockStartEvent,
        [() => ContentBlockDeltaEvent, 0],
        () => ContentBlockStopEvent,
        () => MessageStopEvent,
        [() => ConverseStreamMetadataEvent, 0],
        [() => InternalServerException, 0],
        [() => ModelStreamErrorException, 0],
        [() => ValidationException, 0],
        [() => ThrottlingException, 0],
        [() => ServiceUnavailableException, 0],
    ],
];
var CountTokensInput = [
    3,
    n0,
    _CTI,
    0,
    [_iMn, _conv],
    [
        [() => InvokeModelTokensRequest, 0],
        [() => ConverseTokensRequest, 0],
    ],
];
var DocumentContentBlock = [3, n0, _DCBo, 0, [_te], [0]];
var DocumentSource = [
    3,
    n0,
    _DS,
    0,
    [_b, _sL, _te, _co],
    [21, () => S3Location, 0, () => DocumentContentBlocks],
];
var GuardrailAutomatedReasoningFinding = [
    3,
    n0,
    _GARF,
    0,
    [_va, _in, _sa, _imp, _tA, _tCoo, _nTo],
    [
        [() => GuardrailAutomatedReasoningValidFinding, 0],
        [() => GuardrailAutomatedReasoningInvalidFinding, 0],
        [() => GuardrailAutomatedReasoningSatisfiableFinding, 0],
        [() => GuardrailAutomatedReasoningImpossibleFinding, 0],
        [() => GuardrailAutomatedReasoningTranslationAmbiguousFinding, 0],
        () => GuardrailAutomatedReasoningTooComplexFinding,
        () => GuardrailAutomatedReasoningNoTranslationsFinding,
    ],
];
var GuardrailContentBlock = [
    3,
    n0,
    _GCB,
    0,
    [_te, _ima],
    [() => GuardrailTextBlock, [() => GuardrailImageBlock, 0]],
];
var GuardrailConverseContentBlock = [
    3,
    n0,
    _GCCB,
    0,
    [_te, _ima],
    [() => GuardrailConverseTextBlock, [() => GuardrailConverseImageBlock, 0]],
];
var GuardrailConverseImageSource = [3, n0, _GCIS, 8, [_b], [21]];
var GuardrailImageSource = [3, n0, _GIS, 8, [_b], [21]];
var ImageSource = [3, n0, _IS, 0, [_b, _sL], [21, () => S3Location]];
var InvokeModelWithBidirectionalStreamInput = [
    3,
    n0,
    _IMWBSI,
    {
        [_stre]: 1,
    },
    [_ch],
    [[() => BidirectionalInputPayloadPart, 0]],
];
var InvokeModelWithBidirectionalStreamOutput = [
    3,
    n0,
    _IMWBSO,
    {
        [_stre]: 1,
    },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [
        [() => BidirectionalOutputPayloadPart, 0],
        [() => InternalServerException, 0],
        [() => ModelStreamErrorException, 0],
        [() => ValidationException, 0],
        [() => ThrottlingException, 0],
        [() => ModelTimeoutException, 0],
        [() => ServiceUnavailableException, 0],
    ],
];
var PromptVariableValues = [3, n0, _PVV, 0, [_te], [0]];
var ReasoningContentBlock = [
    3,
    n0,
    _RCB,
    8,
    [_rT, _rCe],
    [[() => ReasoningTextBlock, 0], 21],
];
var ReasoningContentBlockDelta = [3, n0, _RCBD, 8, [_te, _rCe, _si], [0, 21, 0]];
var ResponseStream = [
    3,
    n0,
    _RS,
    {
        [_stre]: 1,
    },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [
        [() => PayloadPart, 0],
        [() => InternalServerException, 0],
        [() => ModelStreamErrorException, 0],
        [() => ValidationException, 0],
        [() => ThrottlingException, 0],
        [() => ModelTimeoutException, 0],
        [() => ServiceUnavailableException, 0],
    ],
];
var SystemContentBlock = [
    3,
    n0,
    _SCBy,
    0,
    [_te, _gCua, _cPa],
    [0, [() => GuardrailConverseContentBlock, 0], () => CachePointBlock],
];
var Tool = [
    3,
    n0,
    _Too,
    0,
    [_tS, _sTy, _cPa],
    [() => ToolSpecification, () => SystemTool, () => CachePointBlock],
];
var ToolChoice = [
    3,
    n0,
    _TCo,
    0,
    [_au, _an, _tool],
    [() => AutoToolChoice, () => AnyToolChoice, () => SpecificToolChoice],
];
var ToolInputSchema = [3, n0, _TIS, 0, [_j], [15]];
var ToolResultBlockDelta = [3, n0, _TRBDo, 0, [_te], [0]];
var ToolResultContentBlock = [
    3,
    n0,
    _TRCBo,
    0,
    [_j, _te, _ima, _doc, _vi, _sRe],
    [15, 0, () => ImageBlock, () => DocumentBlock, () => VideoBlock, () => SearchResultBlock],
];
var VideoSource = [3, n0, _VS, 0, [_b, _sL], [21, () => S3Location]];
var ApplyGuardrail = [
    9,
    n0,
    _AG,
    {
        [_h]: ["POST", "/guardrail/{guardrailIdentifier}/version/{guardrailVersion}/apply", 200],
    },
    () => ApplyGuardrailRequest,
    () => ApplyGuardrailResponse,
];
var Converse = [
    9,
    n0,
    _Co,
    {
        [_h]: ["POST", "/model/{modelId}/converse", 200],
    },
    () => ConverseRequest,
    () => ConverseResponse,
];
var ConverseStream = [
    9,
    n0,
    _CS,
    {
        [_h]: ["POST", "/model/{modelId}/converse-stream", 200],
    },
    () => ConverseStreamRequest,
    () => ConverseStreamResponse,
];
var CountTokens = [
    9,
    n0,
    _CTo,
    {
        [_h]: ["POST", "/model/{modelId}/count-tokens", 200],
    },
    () => CountTokensRequest,
    () => CountTokensResponse,
];
var GetAsyncInvoke = [
    9,
    n0,
    _GAI,
    {
        [_h]: ["GET", "/async-invoke/{invocationArn}", 200],
    },
    () => GetAsyncInvokeRequest,
    () => GetAsyncInvokeResponse,
];
var InvokeModel = [
    9,
    n0,
    _IM,
    {
        [_h]: ["POST", "/model/{modelId}/invoke", 200],
    },
    () => InvokeModelRequest,
    () => InvokeModelResponse,
];
var InvokeModelWithBidirectionalStream = [
    9,
    n0,
    _IMWBS,
    {
        [_h]: ["POST", "/model/{modelId}/invoke-with-bidirectional-stream", 200],
    },
    () => InvokeModelWithBidirectionalStreamRequest,
    () => InvokeModelWithBidirectionalStreamResponse,
];
var InvokeModelWithResponseStream = [
    9,
    n0,
    _IMWRS,
    {
        [_h]: ["POST", "/model/{modelId}/invoke-with-response-stream", 200],
    },
    () => InvokeModelWithResponseStreamRequest,
    () => InvokeModelWithResponseStreamResponse,
];
var ListAsyncInvokes = [
    9,
    n0,
    _LAI,
    {
        [_h]: ["GET", "/async-invoke", 200],
    },
    () => ListAsyncInvokesRequest,
    () => ListAsyncInvokesResponse,
];
var StartAsyncInvoke = [
    9,
    n0,
    _SAI,
    {
        [_h]: ["POST", "/async-invoke", 200],
    },
    () => StartAsyncInvokeRequest,
    () => StartAsyncInvokeResponse,
];

class ApplyGuardrailCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ApplyGuardrail", {})
    .n("BedrockRuntimeClient", "ApplyGuardrailCommand")
    .sc(ApplyGuardrail)
    .build() {
}

class ConverseCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "Converse", {})
    .n("BedrockRuntimeClient", "ConverseCommand")
    .sc(Converse)
    .build() {
}

class ConverseStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ConverseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "ConverseStreamCommand")
    .sc(ConverseStream)
    .build() {
}

class CountTokensCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "CountTokens", {})
    .n("BedrockRuntimeClient", "CountTokensCommand")
    .sc(CountTokens)
    .build() {
}

class GetAsyncInvokeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "GetAsyncInvoke", {})
    .n("BedrockRuntimeClient", "GetAsyncInvokeCommand")
    .sc(GetAsyncInvoke)
    .build() {
}

class InvokeModelCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModel", {})
    .n("BedrockRuntimeClient", "InvokeModelCommand")
    .sc(InvokeModel)
    .build() {
}

class InvokeModelWithBidirectionalStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareEventstream.getEventStreamPlugin(config),
        middlewareWebsocket.getWebSocketPlugin(config, {
            headerPrefix: "x-amz-bedrock-",
        }),
    ];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithBidirectionalStream", {
    eventStream: {
        input: true,
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithBidirectionalStreamCommand")
    .sc(InvokeModelWithBidirectionalStream)
    .build() {
}

class InvokeModelWithResponseStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithResponseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithResponseStreamCommand")
    .sc(InvokeModelWithResponseStream)
    .build() {
}

class ListAsyncInvokesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ListAsyncInvokes", {})
    .n("BedrockRuntimeClient", "ListAsyncInvokesCommand")
    .sc(ListAsyncInvokes)
    .build() {
}

class StartAsyncInvokeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "StartAsyncInvoke", {})
    .n("BedrockRuntimeClient", "StartAsyncInvokeCommand")
    .sc(StartAsyncInvoke)
    .build() {
}

const commands = {
    ApplyGuardrailCommand,
    ConverseCommand,
    ConverseStreamCommand,
    CountTokensCommand,
    GetAsyncInvokeCommand,
    InvokeModelCommand,
    InvokeModelWithBidirectionalStreamCommand,
    InvokeModelWithResponseStreamCommand,
    ListAsyncInvokesCommand,
    StartAsyncInvokeCommand,
};
class BedrockRuntime extends BedrockRuntimeClient {
}
smithyClient.createAggregatedClient(commands, BedrockRuntime);

const paginateListAsyncInvokes = core.createPaginator(BedrockRuntimeClient, ListAsyncInvokesCommand, "nextToken", "nextToken", "maxResults");

const AsyncInvokeStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
};
const SortAsyncInvocationBy = {
    SUBMISSION_TIME: "SubmissionTime",
};
const SortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const GuardrailImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const GuardrailOutputScope = {
    FULL: "FULL",
    INTERVENTIONS: "INTERVENTIONS",
};
const GuardrailContentSource = {
    INPUT: "INPUT",
    OUTPUT: "OUTPUT",
};
const GuardrailAction = {
    GUARDRAIL_INTERVENED: "GUARDRAIL_INTERVENED",
    NONE: "NONE",
};
const GuardrailOrigin = {
    ACCOUNT_ENFORCED: "ACCOUNT_ENFORCED",
    ORGANIZATION_ENFORCED: "ORGANIZATION_ENFORCED",
    REQUEST: "REQUEST",
};
const GuardrailOwnership = {
    CROSS_ACCOUNT: "CROSS_ACCOUNT",
    SELF: "SELF",
};
const GuardrailAutomatedReasoningLogicWarningType = {
    ALWAYS_FALSE: "ALWAYS_FALSE",
    ALWAYS_TRUE: "ALWAYS_TRUE",
};
const GuardrailContentPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContentFilterConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterStrength = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterType = {
    HATE: "HATE",
    INSULTS: "INSULTS",
    MISCONDUCT: "MISCONDUCT",
    PROMPT_ATTACK: "PROMPT_ATTACK",
    SEXUAL: "SEXUAL",
    VIOLENCE: "VIOLENCE",
};
const GuardrailContextualGroundingPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContextualGroundingFilterType = {
    GROUNDING: "GROUNDING",
    RELEVANCE: "RELEVANCE",
};
const GuardrailSensitiveInformationPolicyAction = {
    ANONYMIZED: "ANONYMIZED",
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailPiiEntityType = {
    ADDRESS: "ADDRESS",
    AGE: "AGE",
    AWS_ACCESS_KEY: "AWS_ACCESS_KEY",
    AWS_SECRET_KEY: "AWS_SECRET_KEY",
    CA_HEALTH_NUMBER: "CA_HEALTH_NUMBER",
    CA_SOCIAL_INSURANCE_NUMBER: "CA_SOCIAL_INSURANCE_NUMBER",
    CREDIT_DEBIT_CARD_CVV: "CREDIT_DEBIT_CARD_CVV",
    CREDIT_DEBIT_CARD_EXPIRY: "CREDIT_DEBIT_CARD_EXPIRY",
    CREDIT_DEBIT_CARD_NUMBER: "CREDIT_DEBIT_CARD_NUMBER",
    DRIVER_ID: "DRIVER_ID",
    EMAIL: "EMAIL",
    INTERNATIONAL_BANK_ACCOUNT_NUMBER: "INTERNATIONAL_BANK_ACCOUNT_NUMBER",
    IP_ADDRESS: "IP_ADDRESS",
    LICENSE_PLATE: "LICENSE_PLATE",
    MAC_ADDRESS: "MAC_ADDRESS",
    NAME: "NAME",
    PASSWORD: "PASSWORD",
    PHONE: "PHONE",
    PIN: "PIN",
    SWIFT_CODE: "SWIFT_CODE",
    UK_NATIONAL_HEALTH_SERVICE_NUMBER: "UK_NATIONAL_HEALTH_SERVICE_NUMBER",
    UK_NATIONAL_INSURANCE_NUMBER: "UK_NATIONAL_INSURANCE_NUMBER",
    UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER",
    URL: "URL",
    USERNAME: "USERNAME",
    US_BANK_ACCOUNT_NUMBER: "US_BANK_ACCOUNT_NUMBER",
    US_BANK_ROUTING_NUMBER: "US_BANK_ROUTING_NUMBER",
    US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER",
    US_PASSPORT_NUMBER: "US_PASSPORT_NUMBER",
    US_SOCIAL_SECURITY_NUMBER: "US_SOCIAL_SECURITY_NUMBER",
    VEHICLE_IDENTIFICATION_NUMBER: "VEHICLE_IDENTIFICATION_NUMBER",
};
const GuardrailTopicPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailTopicType = {
    DENY: "DENY",
};
const GuardrailWordPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailManagedWordType = {
    PROFANITY: "PROFANITY",
};
const GuardrailTrace = {
    DISABLED: "disabled",
    ENABLED: "enabled",
    ENABLED_FULL: "enabled_full",
};
const CachePointType = {
    DEFAULT: "default",
};
const DocumentFormat = {
    CSV: "csv",
    DOC: "doc",
    DOCX: "docx",
    HTML: "html",
    MD: "md",
    PDF: "pdf",
    TXT: "txt",
    XLS: "xls",
    XLSX: "xlsx",
};
const GuardrailConverseImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailConverseContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const ImageFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
const VideoFormat = {
    FLV: "flv",
    MKV: "mkv",
    MOV: "mov",
    MP4: "mp4",
    MPEG: "mpeg",
    MPG: "mpg",
    THREE_GP: "three_gp",
    WEBM: "webm",
    WMV: "wmv",
};
const ToolResultStatus = {
    ERROR: "error",
    SUCCESS: "success",
};
const ToolUseType = {
    SERVER_TOOL_USE: "server_tool_use",
};
const ConversationRole = {
    ASSISTANT: "assistant",
    USER: "user",
};
const PerformanceConfigLatency = {
    OPTIMIZED: "optimized",
    STANDARD: "standard",
};
const ServiceTierType = {
    DEFAULT: "default",
    FLEX: "flex",
    PRIORITY: "priority",
};
const StopReason = {
    CONTENT_FILTERED: "content_filtered",
    END_TURN: "end_turn",
    GUARDRAIL_INTERVENED: "guardrail_intervened",
    MAX_TOKENS: "max_tokens",
    MODEL_CONTEXT_WINDOW_EXCEEDED: "model_context_window_exceeded",
    STOP_SEQUENCE: "stop_sequence",
    TOOL_USE: "tool_use",
};
const GuardrailStreamProcessingMode = {
    ASYNC: "async",
    SYNC: "sync",
};
const Trace = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
    ENABLED_FULL: "ENABLED_FULL",
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
exports.ApplyGuardrailCommand = ApplyGuardrailCommand;
exports.AsyncInvokeStatus = AsyncInvokeStatus;
exports.BedrockRuntime = BedrockRuntime;
exports.BedrockRuntimeClient = BedrockRuntimeClient;
exports.BedrockRuntimeServiceException = BedrockRuntimeServiceException$1;
exports.CachePointType = CachePointType;
exports.ConflictException = ConflictException$1;
exports.ConversationRole = ConversationRole;
exports.ConverseCommand = ConverseCommand;
exports.ConverseStreamCommand = ConverseStreamCommand;
exports.CountTokensCommand = CountTokensCommand;
exports.DocumentFormat = DocumentFormat;
exports.GetAsyncInvokeCommand = GetAsyncInvokeCommand;
exports.GuardrailAction = GuardrailAction;
exports.GuardrailAutomatedReasoningLogicWarningType = GuardrailAutomatedReasoningLogicWarningType;
exports.GuardrailContentFilterConfidence = GuardrailContentFilterConfidence;
exports.GuardrailContentFilterStrength = GuardrailContentFilterStrength;
exports.GuardrailContentFilterType = GuardrailContentFilterType;
exports.GuardrailContentPolicyAction = GuardrailContentPolicyAction;
exports.GuardrailContentQualifier = GuardrailContentQualifier;
exports.GuardrailContentSource = GuardrailContentSource;
exports.GuardrailContextualGroundingFilterType = GuardrailContextualGroundingFilterType;
exports.GuardrailContextualGroundingPolicyAction = GuardrailContextualGroundingPolicyAction;
exports.GuardrailConverseContentQualifier = GuardrailConverseContentQualifier;
exports.GuardrailConverseImageFormat = GuardrailConverseImageFormat;
exports.GuardrailImageFormat = GuardrailImageFormat;
exports.GuardrailManagedWordType = GuardrailManagedWordType;
exports.GuardrailOrigin = GuardrailOrigin;
exports.GuardrailOutputScope = GuardrailOutputScope;
exports.GuardrailOwnership = GuardrailOwnership;
exports.GuardrailPiiEntityType = GuardrailPiiEntityType;
exports.GuardrailSensitiveInformationPolicyAction = GuardrailSensitiveInformationPolicyAction;
exports.GuardrailStreamProcessingMode = GuardrailStreamProcessingMode;
exports.GuardrailTopicPolicyAction = GuardrailTopicPolicyAction;
exports.GuardrailTopicType = GuardrailTopicType;
exports.GuardrailTrace = GuardrailTrace;
exports.GuardrailWordPolicyAction = GuardrailWordPolicyAction;
exports.ImageFormat = ImageFormat;
exports.InternalServerException = InternalServerException$1;
exports.InvokeModelCommand = InvokeModelCommand;
exports.InvokeModelWithBidirectionalStreamCommand = InvokeModelWithBidirectionalStreamCommand;
exports.InvokeModelWithResponseStreamCommand = InvokeModelWithResponseStreamCommand;
exports.ListAsyncInvokesCommand = ListAsyncInvokesCommand;
exports.ModelErrorException = ModelErrorException$1;
exports.ModelNotReadyException = ModelNotReadyException$1;
exports.ModelStreamErrorException = ModelStreamErrorException$1;
exports.ModelTimeoutException = ModelTimeoutException$1;
exports.PerformanceConfigLatency = PerformanceConfigLatency;
exports.ResourceNotFoundException = ResourceNotFoundException$1;
exports.ServiceQuotaExceededException = ServiceQuotaExceededException$1;
exports.ServiceTierType = ServiceTierType;
exports.ServiceUnavailableException = ServiceUnavailableException$1;
exports.SortAsyncInvocationBy = SortAsyncInvocationBy;
exports.SortOrder = SortOrder;
exports.StartAsyncInvokeCommand = StartAsyncInvokeCommand;
exports.StopReason = StopReason;
exports.ThrottlingException = ThrottlingException$1;
exports.ToolResultStatus = ToolResultStatus;
exports.ToolUseType = ToolUseType;
exports.Trace = Trace;
exports.ValidationException = ValidationException$1;
exports.VideoFormat = VideoFormat;
exports.paginateListAsyncInvokes = paginateListAsyncInvokes;
