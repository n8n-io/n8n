"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentPageLocation$ = exports.DocumentChunkLocation$ = exports.DocumentCharLocation$ = exports.DocumentBlock$ = exports.CountTokensResponse$ = exports.CountTokensRequest$ = exports.ConverseTrace$ = exports.ConverseTokensRequest$ = exports.ConverseStreamTrace$ = exports.ConverseStreamResponse$ = exports.ConverseStreamRequest$ = exports.ConverseStreamMetrics$ = exports.ConverseStreamMetadataEvent$ = exports.ConverseResponse$ = exports.ConverseRequest$ = exports.ConverseMetrics$ = exports.ContentBlockStopEvent$ = exports.ContentBlockStartEvent$ = exports.ContentBlockDeltaEvent$ = exports.CitationSourceContentDelta$ = exports.CitationsDelta$ = exports.CitationsContentBlock$ = exports.CitationsConfig$ = exports.Citation$ = exports.CachePointBlock$ = exports.CacheDetail$ = exports.BidirectionalOutputPayloadPart$ = exports.BidirectionalInputPayloadPart$ = exports.AutoToolChoice$ = exports.AudioBlock$ = exports.AsyncInvokeSummary$ = exports.AsyncInvokeS3OutputDataConfig$ = exports.ApplyGuardrailResponse$ = exports.ApplyGuardrailRequest$ = exports.AppliedGuardrailDetails$ = exports.AnyToolChoice$ = exports.errorTypeRegistries = exports.ValidationException$ = exports.ThrottlingException$ = exports.ServiceUnavailableException$ = exports.ServiceQuotaExceededException$ = exports.ResourceNotFoundException$ = exports.ModelTimeoutException$ = exports.ModelStreamErrorException$ = exports.ModelNotReadyException$ = exports.ModelErrorException$ = exports.InternalServerException$ = exports.ConflictException$ = exports.AccessDeniedException$ = exports.BedrockRuntimeServiceException$ = void 0;
exports.InvokeModelResponse$ = exports.InvokeModelRequest$ = exports.InferenceConfiguration$ = exports.ImageBlockStart$ = exports.ImageBlockDelta$ = exports.ImageBlock$ = exports.GuardrailWordPolicyAssessment$ = exports.GuardrailUsage$ = exports.GuardrailTraceAssessment$ = exports.GuardrailTopicPolicyAssessment$ = exports.GuardrailTopic$ = exports.GuardrailTextCharactersCoverage$ = exports.GuardrailTextBlock$ = exports.GuardrailStreamConfiguration$ = exports.GuardrailSensitiveInformationPolicyAssessment$ = exports.GuardrailRegexFilter$ = exports.GuardrailPiiEntityFilter$ = exports.GuardrailOutputContent$ = exports.GuardrailManagedWord$ = exports.GuardrailInvocationMetrics$ = exports.GuardrailImageCoverage$ = exports.GuardrailImageBlock$ = exports.GuardrailCustomWord$ = exports.GuardrailCoverage$ = exports.GuardrailConverseTextBlock$ = exports.GuardrailConverseImageBlock$ = exports.GuardrailContextualGroundingPolicyAssessment$ = exports.GuardrailContextualGroundingFilter$ = exports.GuardrailContentPolicyAssessment$ = exports.GuardrailContentFilter$ = exports.GuardrailConfiguration$ = exports.GuardrailAutomatedReasoningValidFinding$ = exports.GuardrailAutomatedReasoningTranslationOption$ = exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$ = exports.GuardrailAutomatedReasoningTranslation$ = exports.GuardrailAutomatedReasoningTooComplexFinding$ = exports.GuardrailAutomatedReasoningStatement$ = exports.GuardrailAutomatedReasoningScenario$ = exports.GuardrailAutomatedReasoningSatisfiableFinding$ = exports.GuardrailAutomatedReasoningRule$ = exports.GuardrailAutomatedReasoningPolicyAssessment$ = exports.GuardrailAutomatedReasoningNoTranslationsFinding$ = exports.GuardrailAutomatedReasoningLogicWarning$ = exports.GuardrailAutomatedReasoningInvalidFinding$ = exports.GuardrailAutomatedReasoningInputTextReference$ = exports.GuardrailAutomatedReasoningImpossibleFinding$ = exports.GuardrailAssessment$ = exports.GetAsyncInvokeResponse$ = exports.GetAsyncInvokeRequest$ = exports.ErrorBlock$ = void 0;
exports.DocumentSource$ = exports.DocumentContentBlock$ = exports.CountTokensInput$ = exports.ConverseStreamOutput$ = exports.ConverseOutput$ = exports.ContentBlockStart$ = exports.ContentBlockDelta$ = exports.ContentBlock$ = exports.CitationSourceContent$ = exports.CitationLocation$ = exports.CitationGeneratedContent$ = exports.AudioSource$ = exports.AsyncInvokeOutputDataConfig$ = exports.WebLocation$ = exports.VideoBlock$ = exports.ToolUseBlockStart$ = exports.ToolUseBlockDelta$ = exports.ToolUseBlock$ = exports.ToolSpecification$ = exports.ToolResultBlockStart$ = exports.ToolResultBlock$ = exports.ToolConfiguration$ = exports.TokenUsage$ = exports.Tag$ = exports.SystemTool$ = exports.StartAsyncInvokeResponse$ = exports.StartAsyncInvokeRequest$ = exports.SpecificToolChoice$ = exports.ServiceTier$ = exports.SearchResultLocation$ = exports.SearchResultContentBlock$ = exports.SearchResultBlock$ = exports.S3Location$ = exports.ReasoningTextBlock$ = exports.PromptRouterTrace$ = exports.PerformanceConfiguration$ = exports.PayloadPart$ = exports.OutputFormat$ = exports.OutputConfig$ = exports.MessageStopEvent$ = exports.MessageStartEvent$ = exports.Message$ = exports.ListAsyncInvokesResponse$ = exports.ListAsyncInvokesRequest$ = exports.JsonSchemaDefinition$ = exports.InvokeModelWithResponseStreamResponse$ = exports.InvokeModelWithResponseStreamRequest$ = exports.InvokeModelWithBidirectionalStreamResponse$ = exports.InvokeModelWithBidirectionalStreamRequest$ = exports.InvokeModelTokensRequest$ = void 0;
exports.StartAsyncInvoke$ = exports.ListAsyncInvokes$ = exports.InvokeModelWithResponseStream$ = exports.InvokeModelWithBidirectionalStream$ = exports.InvokeModel$ = exports.GetAsyncInvoke$ = exports.CountTokens$ = exports.ConverseStream$ = exports.Converse$ = exports.ApplyGuardrail$ = exports.VideoSource$ = exports.ToolResultContentBlock$ = exports.ToolResultBlockDelta$ = exports.ToolInputSchema$ = exports.ToolChoice$ = exports.Tool$ = exports.SystemContentBlock$ = exports.ResponseStream$ = exports.ReasoningContentBlockDelta$ = exports.ReasoningContentBlock$ = exports.PromptVariableValues$ = exports.OutputFormatStructure$ = exports.InvokeModelWithBidirectionalStreamOutput$ = exports.InvokeModelWithBidirectionalStreamInput$ = exports.ImageSource$ = exports.GuardrailImageSource$ = exports.GuardrailConverseImageSource$ = exports.GuardrailConverseContentBlock$ = exports.GuardrailContentBlock$ = exports.GuardrailAutomatedReasoningFinding$ = void 0;
const _A = "Accept";
const _AB = "AudioBlock";
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
const _AS = "AudioSource";
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
const _CD = "CacheDetail";
const _CDL = "CacheDetailsList";
const _CDi = "CitationsDelta";
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
const _EB = "ErrorBlock";
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
const _IBD = "ImageBlockDelta";
const _IBS = "ImageBlockStart";
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
const _JSD = "JsonSchemaDefinition";
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
const _OC = "OutputConfig";
const _OF = "OutputFormat";
const _OFS = "OutputFormatStructure";
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
const _au = "audio";
const _aut = "auto";
const _b = "bytes";
const _bO = "bucketOwner";
const _bo = "body";
const _c = "client";
const _cBD = "contentBlockDelta";
const _cBI = "contentBlockIndex";
const _cBS = "contentBlockStart";
const _cBSo = "contentBlockStop";
const _cC = "citationsContent";
const _cD = "cacheDetails";
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
const _jS = "jsonSchema";
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
const _oC = "outputConfig";
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
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime";
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
const _sch = "schema";
const _se = "server";
const _si = "signature";
const _so = "source";
const _st = "status";
const _sta = "start";
const _stat = "statements";
const _str = "stream";
const _stre = "streaming";
const _stri = "strict";
const _stru = "structure";
const _sy = "system";
const _t = "ttl";
const _tA = "translationAmbiguous";
const _tC = "toolConfig";
const _tCe = "textCharacters";
const _tCo = "toolChoice";
const _tCoo = "tooComplex";
const _tE = "throttlingException";
const _tF = "textFormat";
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
const _ty = "type";
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
const schema_1 = require("@smithy/core/schema");
const BedrockRuntimeServiceException_1 = require("../models/BedrockRuntimeServiceException");
const errors_1 = require("../models/errors");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.BedrockRuntimeServiceException$ = [-3, _s, "BedrockRuntimeServiceException", 0, [], []];
_s_registry.registerError(exports.BedrockRuntimeServiceException$, BedrockRuntimeServiceException_1.BedrockRuntimeServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.AccessDeniedException$ = [-3, n0, _ADE,
    { [_e]: _c, [_hE]: 403 },
    [_m],
    [0]
];
n0_registry.registerError(exports.AccessDeniedException$, errors_1.AccessDeniedException);
exports.ConflictException$ = [-3, n0, _CE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ConflictException$, errors_1.ConflictException);
exports.InternalServerException$ = [-3, n0, _ISE,
    { [_e]: _se, [_hE]: 500 },
    [_m],
    [0]
];
n0_registry.registerError(exports.InternalServerException$, errors_1.InternalServerException);
exports.ModelErrorException$ = [-3, n0, _MEE,
    { [_e]: _c, [_hE]: 424 },
    [_m, _oSC, _rN],
    [0, 1, 0]
];
n0_registry.registerError(exports.ModelErrorException$, errors_1.ModelErrorException);
exports.ModelNotReadyException$ = [-3, n0, _MNRE,
    { [_e]: _c, [_hE]: 429 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ModelNotReadyException$, errors_1.ModelNotReadyException);
exports.ModelStreamErrorException$ = [-3, n0, _MSEE,
    { [_e]: _c, [_hE]: 424 },
    [_m, _oSC, _oM],
    [0, 1, 0]
];
n0_registry.registerError(exports.ModelStreamErrorException$, errors_1.ModelStreamErrorException);
exports.ModelTimeoutException$ = [-3, n0, _MTE,
    { [_e]: _c, [_hE]: 408 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ModelTimeoutException$, errors_1.ModelTimeoutException);
exports.ResourceNotFoundException$ = [-3, n0, _RNFE,
    { [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ResourceNotFoundException$, errors_1.ResourceNotFoundException);
exports.ServiceQuotaExceededException$ = [-3, n0, _SQEE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ServiceQuotaExceededException$, errors_1.ServiceQuotaExceededException);
exports.ServiceUnavailableException$ = [-3, n0, _SUE,
    { [_e]: _se, [_hE]: 503 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ServiceUnavailableException$, errors_1.ServiceUnavailableException);
exports.ThrottlingException$ = [-3, n0, _TE,
    { [_e]: _c, [_hE]: 429 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ThrottlingException$, errors_1.ThrottlingException);
exports.ValidationException$ = [-3, n0, _VE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ValidationException$, errors_1.ValidationException);
exports.errorTypeRegistries = [
    _s_registry,
    n0_registry,
];
var AsyncInvokeMessage = [0, n0, _AIM, 8, 0];
var Body = [0, n0, _B, 8, 21];
var GuardrailAutomatedReasoningStatementLogicContent = [0, n0, _GARSLC, 8, 0];
var GuardrailAutomatedReasoningStatementNaturalLanguageContent = [0, n0, _GARSNLC, 8, 0];
var ModelInputPayload = [0, n0, _MIP, 8, 15];
var PartBody = [0, n0, _PB, 8, 21];
exports.AnyToolChoice$ = [3, n0, _ATC,
    0,
    [],
    []
];
exports.AppliedGuardrailDetails$ = [3, n0, _AGD,
    0,
    [_gI, _gV, _gA, _gO, _gOu],
    [0, 0, 0, 64 | 0, 0]
];
exports.ApplyGuardrailRequest$ = [3, n0, _AGR,
    0,
    [_gIu, _gV, _so, _co, _oS],
    [[0, 1], [0, 1], 0, [() => GuardrailContentBlockList, 0], 0], 4
];
exports.ApplyGuardrailResponse$ = [3, n0, _AGRp,
    0,
    [_u, _a, _o, _as, _aR, _gC],
    [() => exports.GuardrailUsage$, 0, () => GuardrailOutputContentList, [() => GuardrailAssessmentList, 0], 0, () => exports.GuardrailCoverage$], 4
];
exports.AsyncInvokeS3OutputDataConfig$ = [3, n0, _AISODC,
    0,
    [_sU, _kKI, _bO],
    [0, 0, 0], 1
];
exports.AsyncInvokeSummary$ = [3, n0, _AIS,
    0,
    [_iA, _mA, _sT, _oDC, _cRT, _st, _fM, _lMT, _eT],
    [0, 0, 5, () => exports.AsyncInvokeOutputDataConfig$, 0, 0, [() => AsyncInvokeMessage, 0], 5, 5], 4
];
exports.AudioBlock$ = [3, n0, _AB,
    0,
    [_f, _so, _e],
    [0, [() => exports.AudioSource$, 0], [() => exports.ErrorBlock$, 0]], 2
];
exports.AutoToolChoice$ = [3, n0, _ATCu,
    0,
    [],
    []
];
exports.BidirectionalInputPayloadPart$ = [3, n0, _BIPP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.BidirectionalOutputPayloadPart$ = [3, n0, _BOPP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.CacheDetail$ = [3, n0, _CD,
    0,
    [_t, _iT],
    [0, 1], 2
];
exports.CachePointBlock$ = [3, n0, _CPB,
    0,
    [_ty, _t],
    [0, 0], 1
];
exports.Citation$ = [3, n0, _C,
    0,
    [_ti, _so, _sC, _l],
    [0, 0, () => CitationSourceContentList, () => exports.CitationLocation$]
];
exports.CitationsConfig$ = [3, n0, _CC,
    0,
    [_en],
    [2], 1
];
exports.CitationsContentBlock$ = [3, n0, _CCB,
    0,
    [_co, _ci],
    [() => CitationGeneratedContentList, () => Citations]
];
exports.CitationsDelta$ = [3, n0, _CDi,
    0,
    [_ti, _so, _sC, _l],
    [0, 0, () => CitationSourceContentListDelta, () => exports.CitationLocation$]
];
exports.CitationSourceContentDelta$ = [3, n0, _CSCD,
    0,
    [_te],
    [0]
];
exports.ContentBlockDeltaEvent$ = [3, n0, _CBDE,
    0,
    [_d, _cBI],
    [[() => exports.ContentBlockDelta$, 0], 1], 2
];
exports.ContentBlockStartEvent$ = [3, n0, _CBSE,
    0,
    [_sta, _cBI],
    [() => exports.ContentBlockStart$, 1], 2
];
exports.ContentBlockStopEvent$ = [3, n0, _CBSEo,
    0,
    [_cBI],
    [1], 1
];
exports.ConverseMetrics$ = [3, n0, _CM,
    0,
    [_lM],
    [1], 1
];
exports.ConverseRequest$ = [3, n0, _CR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe, _oC],
    [[0, 1], [() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.InferenceConfiguration$, () => exports.ToolConfiguration$, () => exports.GuardrailConfiguration$, 15, [() => PromptVariableMap, 0], 64 | 0, [() => RequestMetadata, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$, [() => exports.OutputConfig$, 0]], 1
];
exports.ConverseResponse$ = [3, n0, _CRo,
    0,
    [_ou, _sR, _u, _met, _aMRFd, _tr, _pC, _sTe],
    [[() => exports.ConverseOutput$, 0], 0, () => exports.TokenUsage$, () => exports.ConverseMetrics$, 15, [() => exports.ConverseTrace$, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$], 4
];
exports.ConverseStreamMetadataEvent$ = [3, n0, _CSME,
    0,
    [_u, _met, _tr, _pC, _sTe],
    [() => exports.TokenUsage$, () => exports.ConverseStreamMetrics$, [() => exports.ConverseStreamTrace$, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$], 2
];
exports.ConverseStreamMetrics$ = [3, n0, _CSM,
    0,
    [_lM],
    [1], 1
];
exports.ConverseStreamRequest$ = [3, n0, _CSR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe, _oC],
    [[0, 1], [() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.InferenceConfiguration$, () => exports.ToolConfiguration$, () => exports.GuardrailStreamConfiguration$, 15, [() => PromptVariableMap, 0], 64 | 0, [() => RequestMetadata, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$, [() => exports.OutputConfig$, 0]], 1
];
exports.ConverseStreamResponse$ = [3, n0, _CSRo,
    0,
    [_str],
    [[() => exports.ConverseStreamOutput$, 16]]
];
exports.ConverseStreamTrace$ = [3, n0, _CST,
    0,
    [_g, _pR],
    [[() => exports.GuardrailTraceAssessment$, 0], () => exports.PromptRouterTrace$]
];
exports.ConverseTokensRequest$ = [3, n0, _CTR,
    0,
    [_me, _sy, _tC, _aMRF],
    [[() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.ToolConfiguration$, 15]
];
exports.ConverseTrace$ = [3, n0, _CT,
    0,
    [_g, _pR],
    [[() => exports.GuardrailTraceAssessment$, 0], () => exports.PromptRouterTrace$]
];
exports.CountTokensRequest$ = [3, n0, _CTRo,
    0,
    [_mI, _i],
    [[0, 1], [() => exports.CountTokensInput$, 0]], 2
];
exports.CountTokensResponse$ = [3, n0, _CTRou,
    0,
    [_iT],
    [1], 1
];
exports.DocumentBlock$ = [3, n0, _DB,
    0,
    [_n, _so, _f, _con, _ci],
    [0, () => exports.DocumentSource$, 0, 0, () => exports.CitationsConfig$], 2
];
exports.DocumentCharLocation$ = [3, n0, _DCL,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.DocumentChunkLocation$ = [3, n0, _DCLo,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.DocumentPageLocation$ = [3, n0, _DPL,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.ErrorBlock$ = [3, n0, _EB,
    8,
    [_m],
    [0]
];
exports.GetAsyncInvokeRequest$ = [3, n0, _GAIR,
    0,
    [_iA],
    [[0, 1]], 1
];
exports.GetAsyncInvokeResponse$ = [3, n0, _GAIRe,
    0,
    [_iA, _mA, _st, _sT, _oDC, _cRT, _fM, _lMT, _eT],
    [0, 0, 0, 5, () => exports.AsyncInvokeOutputDataConfig$, 0, [() => AsyncInvokeMessage, 0], 5, 5], 5
];
exports.GuardrailAssessment$ = [3, n0, _GA,
    0,
    [_tP, _cP, _wP, _sIP, _cGP, _aRP, _iM, _aGD],
    [() => exports.GuardrailTopicPolicyAssessment$, () => exports.GuardrailContentPolicyAssessment$, () => exports.GuardrailWordPolicyAssessment$, () => exports.GuardrailSensitiveInformationPolicyAssessment$, () => exports.GuardrailContextualGroundingPolicyAssessment$, [() => exports.GuardrailAutomatedReasoningPolicyAssessment$, 0], () => exports.GuardrailInvocationMetrics$, () => exports.AppliedGuardrailDetails$]
];
exports.GuardrailAutomatedReasoningImpossibleFinding$ = [3, n0, _GARIF,
    0,
    [_tra, _cR, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningInputTextReference$ = [3, n0, _GARITR,
    0,
    [_te],
    [[() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0]]
];
exports.GuardrailAutomatedReasoningInvalidFinding$ = [3, n0, _GARIFu,
    0,
    [_tra, _cR, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningLogicWarning$ = [3, n0, _GARLW,
    0,
    [_ty, _p, _cl],
    [0, [() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningStatementList, 0]]
];
exports.GuardrailAutomatedReasoningNoTranslationsFinding$ = [3, n0, _GARNTF,
    0,
    [],
    []
];
exports.GuardrailAutomatedReasoningPolicyAssessment$ = [3, n0, _GARPA,
    0,
    [_fi],
    [[() => GuardrailAutomatedReasoningFindingList, 0]]
];
exports.GuardrailAutomatedReasoningRule$ = [3, n0, _GARR,
    0,
    [_id, _pVA],
    [0, 0]
];
exports.GuardrailAutomatedReasoningSatisfiableFinding$ = [3, n0, _GARSF,
    0,
    [_tra, _cTS, _cFS, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningScenario$ = [3, n0, _GARS,
    0,
    [_stat],
    [[() => GuardrailAutomatedReasoningStatementList, 0]]
];
exports.GuardrailAutomatedReasoningStatement$ = [3, n0, _GARSu,
    0,
    [_lo, _nL],
    [[() => GuardrailAutomatedReasoningStatementLogicContent, 0], [() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0]]
];
exports.GuardrailAutomatedReasoningTooComplexFinding$ = [3, n0, _GARTCF,
    0,
    [],
    []
];
exports.GuardrailAutomatedReasoningTranslation$ = [3, n0, _GART,
    0,
    [_p, _cl, _uP, _uC, _conf],
    [[() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningInputTextReferenceList, 0], [() => GuardrailAutomatedReasoningInputTextReferenceList, 0], 1]
];
exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$ = [3, n0, _GARTAF,
    0,
    [_op, _dS],
    [[() => GuardrailAutomatedReasoningTranslationOptionList, 0], [() => GuardrailAutomatedReasoningDifferenceScenarioList, 0]]
];
exports.GuardrailAutomatedReasoningTranslationOption$ = [3, n0, _GARTO,
    0,
    [_tran],
    [[() => GuardrailAutomatedReasoningTranslationList, 0]]
];
exports.GuardrailAutomatedReasoningValidFinding$ = [3, n0, _GARVF,
    0,
    [_tra, _cTS, _sRu, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailConfiguration$ = [3, n0, _GC,
    0,
    [_gIu, _gV, _tr],
    [0, 0, 0]
];
exports.GuardrailContentFilter$ = [3, n0, _GCF,
    0,
    [_ty, _conf, _a, _fS, _de],
    [0, 0, 0, 0, 2], 3
];
exports.GuardrailContentPolicyAssessment$ = [3, n0, _GCPA,
    0,
    [_fil],
    [() => GuardrailContentFilterList], 1
];
exports.GuardrailContextualGroundingFilter$ = [3, n0, _GCGF,
    0,
    [_ty, _th, _sc, _a, _de],
    [0, 1, 1, 0, 2], 4
];
exports.GuardrailContextualGroundingPolicyAssessment$ = [3, n0, _GCGPA,
    0,
    [_fil],
    [() => GuardrailContextualGroundingFilters]
];
exports.GuardrailConverseImageBlock$ = [3, n0, _GCIB,
    8,
    [_f, _so],
    [0, [() => exports.GuardrailConverseImageSource$, 0]], 2
];
exports.GuardrailConverseTextBlock$ = [3, n0, _GCTB,
    0,
    [_te, _q],
    [0, 64 | 0], 1
];
exports.GuardrailCoverage$ = [3, n0, _GCu,
    0,
    [_tCe, _im],
    [() => exports.GuardrailTextCharactersCoverage$, () => exports.GuardrailImageCoverage$]
];
exports.GuardrailCustomWord$ = [3, n0, _GCW,
    0,
    [_ma, _a, _de],
    [0, 0, 2], 2
];
exports.GuardrailImageBlock$ = [3, n0, _GIB,
    8,
    [_f, _so],
    [0, [() => exports.GuardrailImageSource$, 0]], 2
];
exports.GuardrailImageCoverage$ = [3, n0, _GIC,
    0,
    [_gu, _to],
    [1, 1]
];
exports.GuardrailInvocationMetrics$ = [3, n0, _GIM,
    0,
    [_gPL, _u, _gC],
    [1, () => exports.GuardrailUsage$, () => exports.GuardrailCoverage$]
];
exports.GuardrailManagedWord$ = [3, n0, _GMW,
    0,
    [_ma, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailOutputContent$ = [3, n0, _GOC,
    0,
    [_te],
    [0]
];
exports.GuardrailPiiEntityFilter$ = [3, n0, _GPEF,
    0,
    [_ma, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailRegexFilter$ = [3, n0, _GRF,
    0,
    [_a, _n, _ma, _r, _de],
    [0, 0, 0, 0, 2], 1
];
exports.GuardrailSensitiveInformationPolicyAssessment$ = [3, n0, _GSIPA,
    0,
    [_pE, _re],
    [() => GuardrailPiiEntityFilterList, () => GuardrailRegexFilterList], 2
];
exports.GuardrailStreamConfiguration$ = [3, n0, _GSC,
    0,
    [_gIu, _gV, _tr, _sPM],
    [0, 0, 0, 0]
];
exports.GuardrailTextBlock$ = [3, n0, _GTB,
    0,
    [_te, _q],
    [0, 64 | 0], 1
];
exports.GuardrailTextCharactersCoverage$ = [3, n0, _GTCC,
    0,
    [_gu, _to],
    [1, 1]
];
exports.GuardrailTopic$ = [3, n0, _GT,
    0,
    [_n, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailTopicPolicyAssessment$ = [3, n0, _GTPA,
    0,
    [_top],
    [() => GuardrailTopicList], 1
];
exports.GuardrailTraceAssessment$ = [3, n0, _GTA,
    0,
    [_mO, _iAn, _oA, _aR],
    [64 | 0, [() => GuardrailAssessmentMap, 0], [() => GuardrailAssessmentListMap, 0], 0]
];
exports.GuardrailUsage$ = [3, n0, _GU,
    0,
    [_tPU, _cPU, _wPU, _sIPU, _sIPFU, _cGPU, _cPIU, _aRPU, _aRPu],
    [1, 1, 1, 1, 1, 1, 1, 1, 1], 6
];
exports.GuardrailWordPolicyAssessment$ = [3, n0, _GWPA,
    0,
    [_cW, _mWL],
    [() => GuardrailCustomWordList, () => GuardrailManagedWordList], 2
];
exports.ImageBlock$ = [3, n0, _IB,
    0,
    [_f, _so, _e],
    [0, [() => exports.ImageSource$, 0], [() => exports.ErrorBlock$, 0]], 2
];
exports.ImageBlockDelta$ = [3, n0, _IBD,
    0,
    [_so, _e],
    [[() => exports.ImageSource$, 0], [() => exports.ErrorBlock$, 0]]
];
exports.ImageBlockStart$ = [3, n0, _IBS,
    0,
    [_f],
    [0], 1
];
exports.InferenceConfiguration$ = [3, n0, _IC,
    0,
    [_mT, _tem, _tPo, _sS],
    [1, 1, 1, 64 | 0]
];
exports.InvokeModelRequest$ = [3, n0, _IMR,
    0,
    [_mI, _bo, _cT, _ac, _tr, _gIu, _gV, _pCL, _sTe],
    [[0, 1], [() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _A }], [0, { [_hH]: _XABT }], [0, { [_hH]: _XABG }], [0, { [_hH]: _XABG_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 1
];
exports.InvokeModelResponse$ = [3, n0, _IMRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [[() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 2
];
exports.InvokeModelTokensRequest$ = [3, n0, _IMTR,
    0,
    [_bo],
    [[() => Body, 0]], 1
];
exports.InvokeModelWithBidirectionalStreamRequest$ = [3, n0, _IMWBSR,
    0,
    [_mI, _bo],
    [[0, 1], [() => exports.InvokeModelWithBidirectionalStreamInput$, 16]], 2
];
exports.InvokeModelWithBidirectionalStreamResponse$ = [3, n0, _IMWBSRn,
    0,
    [_bo],
    [[() => exports.InvokeModelWithBidirectionalStreamOutput$, 16]], 1
];
exports.InvokeModelWithResponseStreamRequest$ = [3, n0, _IMWRSR,
    0,
    [_mI, _bo, _cT, _ac, _tr, _gIu, _gV, _pCL, _sTe],
    [[0, 1], [() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _XABA }], [0, { [_hH]: _XABT }], [0, { [_hH]: _XABG }], [0, { [_hH]: _XABG_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 1
];
exports.InvokeModelWithResponseStreamResponse$ = [3, n0, _IMWRSRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [[() => exports.ResponseStream$, 16], [0, { [_hH]: _XABCT }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 2
];
exports.JsonSchemaDefinition$ = [3, n0, _JSD,
    0,
    [_sch, _n, _des],
    [0, 0, 0], 1
];
exports.ListAsyncInvokesRequest$ = [3, n0, _LAIR,
    0,
    [_sTA, _sTB, _sE, _mR, _nT, _sB, _sO],
    [[5, { [_hQ]: _sTA }], [5, { [_hQ]: _sTB }], [0, { [_hQ]: _sE }], [1, { [_hQ]: _mR }], [0, { [_hQ]: _nT }], [0, { [_hQ]: _sB }], [0, { [_hQ]: _sO }]]
];
exports.ListAsyncInvokesResponse$ = [3, n0, _LAIRi,
    0,
    [_nT, _aIS],
    [0, [() => AsyncInvokeSummaries, 0]]
];
exports.Message$ = [3, n0, _M,
    0,
    [_ro, _co],
    [0, [() => ContentBlocks, 0]], 2
];
exports.MessageStartEvent$ = [3, n0, _MSE,
    0,
    [_ro],
    [0], 1
];
exports.MessageStopEvent$ = [3, n0, _MSEe,
    0,
    [_sR, _aMRFd],
    [0, 15], 1
];
exports.OutputConfig$ = [3, n0, _OC,
    0,
    [_tF],
    [[() => exports.OutputFormat$, 0]]
];
exports.OutputFormat$ = [3, n0, _OF,
    0,
    [_ty, _stru],
    [0, [() => exports.OutputFormatStructure$, 0]], 2
];
exports.PayloadPart$ = [3, n0, _PP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.PerformanceConfiguration$ = [3, n0, _PC,
    0,
    [_la],
    [0]
];
exports.PromptRouterTrace$ = [3, n0, _PRT,
    0,
    [_iMI],
    [0]
];
exports.ReasoningTextBlock$ = [3, n0, _RTB,
    8,
    [_te, _si],
    [0, 0], 1
];
exports.S3Location$ = [3, n0, _SL,
    0,
    [_ur, _bO],
    [0, 0], 1
];
exports.SearchResultBlock$ = [3, n0, _SRB,
    0,
    [_so, _ti, _co, _ci],
    [0, 0, () => SearchResultContentBlocks, () => exports.CitationsConfig$], 3
];
exports.SearchResultContentBlock$ = [3, n0, _SRCB,
    0,
    [_te],
    [0], 1
];
exports.SearchResultLocation$ = [3, n0, _SRL,
    0,
    [_sRI, _sta, _end],
    [1, 1, 1]
];
exports.ServiceTier$ = [3, n0, _ST,
    0,
    [_ty],
    [0], 1
];
exports.SpecificToolChoice$ = [3, n0, _STC,
    0,
    [_n],
    [0], 1
];
exports.StartAsyncInvokeRequest$ = [3, n0, _SAIR,
    0,
    [_mI, _mIo, _oDC, _cRT, _ta],
    [0, [() => ModelInputPayload, 0], () => exports.AsyncInvokeOutputDataConfig$, [0, 4], () => TagList], 3
];
exports.StartAsyncInvokeResponse$ = [3, n0, _SAIRt,
    0,
    [_iA],
    [0], 1
];
exports.SystemTool$ = [3, n0, _STy,
    0,
    [_n],
    [0], 1
];
exports.Tag$ = [3, n0, _T,
    0,
    [_k, _v],
    [0, 0], 2
];
exports.TokenUsage$ = [3, n0, _TU,
    0,
    [_iT, _oT, _tT, _cRIT, _cWIT, _cD],
    [1, 1, 1, 1, 1, () => CacheDetailsList], 3
];
exports.ToolConfiguration$ = [3, n0, _TC,
    0,
    [_too, _tCo],
    [() => Tools, () => exports.ToolChoice$], 1
];
exports.ToolResultBlock$ = [3, n0, _TRB,
    0,
    [_tUI, _co, _st, _ty],
    [0, [() => ToolResultContentBlocks, 0], 0, 0], 2
];
exports.ToolResultBlockStart$ = [3, n0, _TRBS,
    0,
    [_tUI, _ty, _st],
    [0, 0, 0], 1
];
exports.ToolSpecification$ = [3, n0, _TS,
    0,
    [_n, _iS, _des, _stri],
    [0, () => exports.ToolInputSchema$, 0, 2], 2
];
exports.ToolUseBlock$ = [3, n0, _TUB,
    0,
    [_tUI, _n, _i, _ty],
    [0, 0, 15, 0], 3
];
exports.ToolUseBlockDelta$ = [3, n0, _TUBD,
    0,
    [_i],
    [0], 1
];
exports.ToolUseBlockStart$ = [3, n0, _TUBS,
    0,
    [_tUI, _n, _ty],
    [0, 0, 0], 2
];
exports.VideoBlock$ = [3, n0, _VB,
    0,
    [_f, _so],
    [0, () => exports.VideoSource$], 2
];
exports.WebLocation$ = [3, n0, _WL,
    0,
    [_url, _do],
    [0, 0]
];
var AdditionalModelResponseFieldPaths = 64 | 0;
var AsyncInvokeSummaries = [1, n0, _AISs,
    0, [() => exports.AsyncInvokeSummary$,
        0]
];
var CacheDetailsList = [1, n0, _CDL,
    0, () => exports.CacheDetail$
];
var CitationGeneratedContentList = [1, n0, _CGCL,
    0, () => exports.CitationGeneratedContent$
];
var Citations = [1, n0, _Ci,
    0, () => exports.Citation$
];
var CitationSourceContentList = [1, n0, _CSCL,
    0, () => exports.CitationSourceContent$
];
var CitationSourceContentListDelta = [1, n0, _CSCLD,
    0, () => exports.CitationSourceContentDelta$
];
var ContentBlocks = [1, n0, _CB,
    0, [() => exports.ContentBlock$,
        0]
];
var DocumentContentBlocks = [1, n0, _DCB,
    0, () => exports.DocumentContentBlock$
];
var GuardrailAssessmentList = [1, n0, _GAL,
    0, [() => exports.GuardrailAssessment$,
        0]
];
var GuardrailAutomatedReasoningDifferenceScenarioList = [1, n0, _GARDSL,
    0, [() => exports.GuardrailAutomatedReasoningScenario$,
        0]
];
var GuardrailAutomatedReasoningFindingList = [1, n0, _GARFL,
    0, [() => exports.GuardrailAutomatedReasoningFinding$,
        0]
];
var GuardrailAutomatedReasoningInputTextReferenceList = [1, n0, _GARITRL,
    0, [() => exports.GuardrailAutomatedReasoningInputTextReference$,
        0]
];
var GuardrailAutomatedReasoningRuleList = [1, n0, _GARRL,
    0, () => exports.GuardrailAutomatedReasoningRule$
];
var GuardrailAutomatedReasoningStatementList = [1, n0, _GARSL,
    0, [() => exports.GuardrailAutomatedReasoningStatement$,
        0]
];
var GuardrailAutomatedReasoningTranslationList = [1, n0, _GARTL,
    0, [() => exports.GuardrailAutomatedReasoningTranslation$,
        0]
];
var GuardrailAutomatedReasoningTranslationOptionList = [1, n0, _GARTOL,
    0, [() => exports.GuardrailAutomatedReasoningTranslationOption$,
        0]
];
var GuardrailContentBlockList = [1, n0, _GCBL,
    0, [() => exports.GuardrailContentBlock$,
        0]
];
var GuardrailContentFilterList = [1, n0, _GCFL,
    0, () => exports.GuardrailContentFilter$
];
var GuardrailContentQualifierList = 64 | 0;
var GuardrailContextualGroundingFilters = [1, n0, _GCGFu,
    0, () => exports.GuardrailContextualGroundingFilter$
];
var GuardrailConverseContentQualifierList = 64 | 0;
var GuardrailCustomWordList = [1, n0, _GCWL,
    0, () => exports.GuardrailCustomWord$
];
var GuardrailManagedWordList = [1, n0, _GMWL,
    0, () => exports.GuardrailManagedWord$
];
var GuardrailOriginList = 64 | 0;
var GuardrailOutputContentList = [1, n0, _GOCL,
    0, () => exports.GuardrailOutputContent$
];
var GuardrailPiiEntityFilterList = [1, n0, _GPEFL,
    0, () => exports.GuardrailPiiEntityFilter$
];
var GuardrailRegexFilterList = [1, n0, _GRFL,
    0, () => exports.GuardrailRegexFilter$
];
var GuardrailTopicList = [1, n0, _GTL,
    0, () => exports.GuardrailTopic$
];
var Messages = [1, n0, _Me,
    0, [() => exports.Message$,
        0]
];
var ModelOutputs = 64 | 0;
var NonEmptyStringList = 64 | 0;
var SearchResultContentBlocks = [1, n0, _SRCBe,
    0, () => exports.SearchResultContentBlock$
];
var SystemContentBlocks = [1, n0, _SCB,
    0, [() => exports.SystemContentBlock$,
        0]
];
var TagList = [1, n0, _TL,
    0, () => exports.Tag$
];
var ToolResultBlocksDelta = [1, n0, _TRBD,
    0, () => exports.ToolResultBlockDelta$
];
var ToolResultContentBlocks = [1, n0, _TRCB,
    0, [() => exports.ToolResultContentBlock$,
        0]
];
var Tools = [1, n0, _To,
    0, () => exports.Tool$
];
var GuardrailAssessmentListMap = [2, n0, _GALM,
    0, [0,
        0],
    [() => GuardrailAssessmentList,
        0]
];
var GuardrailAssessmentMap = [2, n0, _GAM,
    0, [0,
        0],
    [() => exports.GuardrailAssessment$,
        0]
];
var PromptVariableMap = [2, n0, _PVM,
    8, 0, () => exports.PromptVariableValues$
];
var RequestMetadata = [2, n0, _RM,
    8, 0, 0
];
exports.AsyncInvokeOutputDataConfig$ = [4, n0, _AIODC,
    0,
    [_sODC],
    [() => exports.AsyncInvokeS3OutputDataConfig$]
];
exports.AudioSource$ = [4, n0, _AS,
    8,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.CitationGeneratedContent$ = [4, n0, _CGC,
    0,
    [_te],
    [0]
];
exports.CitationLocation$ = [4, n0, _CL,
    0,
    [_w, _dC, _dP, _dCo, _sRL],
    [() => exports.WebLocation$, () => exports.DocumentCharLocation$, () => exports.DocumentPageLocation$, () => exports.DocumentChunkLocation$, () => exports.SearchResultLocation$]
];
exports.CitationSourceContent$ = [4, n0, _CSC,
    0,
    [_te],
    [0]
];
exports.ContentBlock$ = [4, n0, _CBo,
    0,
    [_te, _ima, _doc, _vi, _au, _tU, _tR, _gCua, _cPa, _rC, _cC, _sRe],
    [0, [() => exports.ImageBlock$, 0], () => exports.DocumentBlock$, () => exports.VideoBlock$, [() => exports.AudioBlock$, 0], () => exports.ToolUseBlock$, [() => exports.ToolResultBlock$, 0], [() => exports.GuardrailConverseContentBlock$, 0], () => exports.CachePointBlock$, [() => exports.ReasoningContentBlock$, 0], () => exports.CitationsContentBlock$, () => exports.SearchResultBlock$]
];
exports.ContentBlockDelta$ = [4, n0, _CBD,
    0,
    [_te, _tU, _tR, _rC, _cit, _ima],
    [0, () => exports.ToolUseBlockDelta$, () => ToolResultBlocksDelta, [() => exports.ReasoningContentBlockDelta$, 0], () => exports.CitationsDelta$, [() => exports.ImageBlockDelta$, 0]]
];
exports.ContentBlockStart$ = [4, n0, _CBS,
    0,
    [_tU, _tR, _ima],
    [() => exports.ToolUseBlockStart$, () => exports.ToolResultBlockStart$, () => exports.ImageBlockStart$]
];
exports.ConverseOutput$ = [4, n0, _CO,
    0,
    [_m],
    [[() => exports.Message$, 0]]
];
exports.ConverseStreamOutput$ = [4, n0, _CSO,
    { [_stre]: 1 },
    [_mS, _cBS, _cBD, _cBSo, _mSe, _meta, _iSE, _mSEE, _vE, _tE, _sUE],
    [() => exports.MessageStartEvent$, () => exports.ContentBlockStartEvent$, [() => exports.ContentBlockDeltaEvent$, 0], () => exports.ContentBlockStopEvent$, () => exports.MessageStopEvent$, [() => exports.ConverseStreamMetadataEvent$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.CountTokensInput$ = [4, n0, _CTI,
    0,
    [_iMn, _conv],
    [[() => exports.InvokeModelTokensRequest$, 0], [() => exports.ConverseTokensRequest$, 0]]
];
exports.DocumentContentBlock$ = [4, n0, _DCBo,
    0,
    [_te],
    [0]
];
exports.DocumentSource$ = [4, n0, _DS,
    0,
    [_b, _sL, _te, _co],
    [21, () => exports.S3Location$, 0, () => DocumentContentBlocks]
];
exports.GuardrailAutomatedReasoningFinding$ = [4, n0, _GARF,
    0,
    [_va, _in, _sa, _imp, _tA, _tCoo, _nTo],
    [[() => exports.GuardrailAutomatedReasoningValidFinding$, 0], [() => exports.GuardrailAutomatedReasoningInvalidFinding$, 0], [() => exports.GuardrailAutomatedReasoningSatisfiableFinding$, 0], [() => exports.GuardrailAutomatedReasoningImpossibleFinding$, 0], [() => exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$, 0], () => exports.GuardrailAutomatedReasoningTooComplexFinding$, () => exports.GuardrailAutomatedReasoningNoTranslationsFinding$]
];
exports.GuardrailContentBlock$ = [4, n0, _GCB,
    0,
    [_te, _ima],
    [() => exports.GuardrailTextBlock$, [() => exports.GuardrailImageBlock$, 0]]
];
exports.GuardrailConverseContentBlock$ = [4, n0, _GCCB,
    0,
    [_te, _ima],
    [() => exports.GuardrailConverseTextBlock$, [() => exports.GuardrailConverseImageBlock$, 0]]
];
exports.GuardrailConverseImageSource$ = [4, n0, _GCIS,
    8,
    [_b],
    [21]
];
exports.GuardrailImageSource$ = [4, n0, _GIS,
    8,
    [_b],
    [21]
];
exports.ImageSource$ = [4, n0, _IS,
    8,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.InvokeModelWithBidirectionalStreamInput$ = [4, n0, _IMWBSI,
    { [_stre]: 1 },
    [_ch],
    [[() => exports.BidirectionalInputPayloadPart$, 0]]
];
exports.InvokeModelWithBidirectionalStreamOutput$ = [4, n0, _IMWBSO,
    { [_stre]: 1 },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [[() => exports.BidirectionalOutputPayloadPart$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ModelTimeoutException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.OutputFormatStructure$ = [4, n0, _OFS,
    8,
    [_jS],
    [() => exports.JsonSchemaDefinition$]
];
exports.PromptVariableValues$ = [4, n0, _PVV,
    0,
    [_te],
    [0]
];
exports.ReasoningContentBlock$ = [4, n0, _RCB,
    8,
    [_rT, _rCe],
    [[() => exports.ReasoningTextBlock$, 0], 21]
];
exports.ReasoningContentBlockDelta$ = [4, n0, _RCBD,
    8,
    [_te, _rCe, _si],
    [0, 21, 0]
];
exports.ResponseStream$ = [4, n0, _RS,
    { [_stre]: 1 },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [[() => exports.PayloadPart$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ModelTimeoutException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.SystemContentBlock$ = [4, n0, _SCBy,
    0,
    [_te, _gCua, _cPa],
    [0, [() => exports.GuardrailConverseContentBlock$, 0], () => exports.CachePointBlock$]
];
exports.Tool$ = [4, n0, _Too,
    0,
    [_tS, _sTy, _cPa],
    [() => exports.ToolSpecification$, () => exports.SystemTool$, () => exports.CachePointBlock$]
];
exports.ToolChoice$ = [4, n0, _TCo,
    0,
    [_aut, _an, _tool],
    [() => exports.AutoToolChoice$, () => exports.AnyToolChoice$, () => exports.SpecificToolChoice$]
];
exports.ToolInputSchema$ = [4, n0, _TIS,
    0,
    [_j],
    [15]
];
exports.ToolResultBlockDelta$ = [4, n0, _TRBDo,
    0,
    [_te, _j],
    [0, 15]
];
exports.ToolResultContentBlock$ = [4, n0, _TRCBo,
    0,
    [_j, _te, _ima, _doc, _vi, _sRe],
    [15, 0, [() => exports.ImageBlock$, 0], () => exports.DocumentBlock$, () => exports.VideoBlock$, () => exports.SearchResultBlock$]
];
exports.VideoSource$ = [4, n0, _VS,
    0,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.ApplyGuardrail$ = [9, n0, _AG,
    { [_h]: ["POST", "/guardrail/{guardrailIdentifier}/version/{guardrailVersion}/apply", 200] }, () => exports.ApplyGuardrailRequest$, () => exports.ApplyGuardrailResponse$
];
exports.Converse$ = [9, n0, _Co,
    { [_h]: ["POST", "/model/{modelId}/converse", 200] }, () => exports.ConverseRequest$, () => exports.ConverseResponse$
];
exports.ConverseStream$ = [9, n0, _CS,
    { [_h]: ["POST", "/model/{modelId}/converse-stream", 200] }, () => exports.ConverseStreamRequest$, () => exports.ConverseStreamResponse$
];
exports.CountTokens$ = [9, n0, _CTo,
    { [_h]: ["POST", "/model/{modelId}/count-tokens", 200] }, () => exports.CountTokensRequest$, () => exports.CountTokensResponse$
];
exports.GetAsyncInvoke$ = [9, n0, _GAI,
    { [_h]: ["GET", "/async-invoke/{invocationArn}", 200] }, () => exports.GetAsyncInvokeRequest$, () => exports.GetAsyncInvokeResponse$
];
exports.InvokeModel$ = [9, n0, _IM,
    { [_h]: ["POST", "/model/{modelId}/invoke", 200] }, () => exports.InvokeModelRequest$, () => exports.InvokeModelResponse$
];
exports.InvokeModelWithBidirectionalStream$ = [9, n0, _IMWBS,
    { [_h]: ["POST", "/model/{modelId}/invoke-with-bidirectional-stream", 200] }, () => exports.InvokeModelWithBidirectionalStreamRequest$, () => exports.InvokeModelWithBidirectionalStreamResponse$
];
exports.InvokeModelWithResponseStream$ = [9, n0, _IMWRS,
    { [_h]: ["POST", "/model/{modelId}/invoke-with-response-stream", 200] }, () => exports.InvokeModelWithResponseStreamRequest$, () => exports.InvokeModelWithResponseStreamResponse$
];
exports.ListAsyncInvokes$ = [9, n0, _LAI,
    { [_h]: ["GET", "/async-invoke", 200] }, () => exports.ListAsyncInvokesRequest$, () => exports.ListAsyncInvokesResponse$
];
exports.StartAsyncInvoke$ = [9, n0, _SAI,
    { [_h]: ["POST", "/async-invoke", 200] }, () => exports.StartAsyncInvokeRequest$, () => exports.StartAsyncInvokeResponse$
];
