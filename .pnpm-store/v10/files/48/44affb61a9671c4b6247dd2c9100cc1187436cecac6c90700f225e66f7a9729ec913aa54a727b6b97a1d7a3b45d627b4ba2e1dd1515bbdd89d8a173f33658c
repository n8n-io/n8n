"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteSessionRequest$ = exports.DeleteAgentMemoryResponse$ = exports.DeleteAgentMemoryRequest$ = exports.CustomOrchestrationTraceEvent$ = exports.CustomOrchestrationTrace$ = exports.CustomOrchestration$ = exports.CreateSessionResponse$ = exports.CreateSessionRequest$ = exports.CreateInvocationResponse$ = exports.CreateInvocationRequest$ = exports.ConversationHistory$ = exports.ContentBody$ = exports.ConditionResultEvent$ = exports.CollaboratorConfiguration$ = exports.Collaborator$ = exports.CodeInterpreterInvocationOutput$ = exports.CodeInterpreterInvocationInput$ = exports.CitationEvent$ = exports.Citation$ = exports.ByteContentFile$ = exports.ByteContentDoc$ = exports.BedrockRerankingModelConfiguration$ = exports.BedrockRerankingConfiguration$ = exports.BedrockModelConfigurations$ = exports.AudioSegment$ = exports.Attribution$ = exports.ApiResult$ = exports.ApiRequestBody$ = exports.ApiParameter$ = exports.ApiInvocationInput$ = exports.AnalyzePromptEvent$ = exports.AgentCollaboratorOutputPayload$ = exports.AgentCollaboratorInvocationOutput$ = exports.AgentCollaboratorInvocationInput$ = exports.AgentCollaboratorInputPayload$ = exports.AgentActionGroup$ = exports.ActionGroupInvocationOutput$ = exports.ActionGroupInvocationInput$ = exports.errorTypeRegistries = exports.ValidationException$ = exports.ThrottlingException$ = exports.ServiceQuotaExceededException$ = exports.ResourceNotFoundException$ = exports.ModelNotReadyException$ = exports.InternalServerException$ = exports.DependencyFailedException$ = exports.ConflictException$ = exports.BadGatewayException$ = exports.AccessDeniedException$ = exports.BedrockAgentRuntimeServiceException$ = void 0;
exports.GetFlowExecutionResponse$ = exports.GetFlowExecutionRequest$ = exports.GetExecutionFlowSnapshotResponse$ = exports.GetExecutionFlowSnapshotRequest$ = exports.GetAgentMemoryResponse$ = exports.GetAgentMemoryRequest$ = exports.GenerationConfiguration$ = exports.GenerateQueryResponse$ = exports.GenerateQueryRequest$ = exports.GeneratedResponsePart$ = exports.GeneratedQuery$ = exports.FunctionResult$ = exports.FunctionParameter$ = exports.FunctionInvocationInput$ = exports.FunctionDefinition$ = exports.FlowTraceNodeOutputNext$ = exports.FlowTraceNodeOutputField$ = exports.FlowTraceNodeOutputEvent$ = exports.FlowTraceNodeInputSource$ = exports.FlowTraceNodeInputField$ = exports.FlowTraceNodeInputExecutionChainItem$ = exports.FlowTraceNodeInputEvent$ = exports.FlowTraceNodeActionEvent$ = exports.FlowTraceEvent$ = exports.FlowTraceDependencyEvent$ = exports.FlowTraceConditionNodeResultEvent$ = exports.FlowTraceCondition$ = exports.FlowOutputField$ = exports.FlowOutputEvent$ = exports.FlowMultiTurnInputRequestEvent$ = exports.FlowInputField$ = exports.FlowInput$ = exports.FlowFailureEvent$ = exports.FlowExecutionSummary$ = exports.FlowExecutionOutputEvent$ = exports.FlowExecutionInputEvent$ = exports.FlowExecutionError$ = exports.FlowCompletionEvent$ = exports.FinalResponse$ = exports.FilterAttribute$ = exports.FileSource$ = exports.FilePart$ = exports.FieldForReranking$ = exports.FailureTrace$ = exports.ExternalSourcesRetrieveAndGenerateConfiguration$ = exports.ExternalSourcesGenerationConfiguration$ = exports.ExternalSource$ = exports.EndSessionResponse$ = exports.EndSessionRequest$ = exports.DeleteSessionResponse$ = void 0;
exports.KnowledgeBaseRetrieveAndGenerateConfiguration$ = exports.KnowledgeBaseRetrievalResult$ = exports.KnowledgeBaseRetrievalConfiguration$ = exports.KnowledgeBaseQuery$ = exports.KnowledgeBaseLookupOutput$ = exports.KnowledgeBaseLookupInput$ = exports.KnowledgeBaseConfiguration$ = exports.KnowledgeBase$ = exports.InvokeInlineAgentResponse$ = exports.InvokeInlineAgentRequest$ = exports.InvokeFlowResponse$ = exports.InvokeFlowRequest$ = exports.InvokeAgentResponse$ = exports.InvokeAgentRequest$ = exports.InvocationSummary$ = exports.InvocationStepSummary$ = exports.InvocationStep$ = exports.InvocationInput$ = exports.InputImage$ = exports.InputFile$ = exports.InlineSessionState$ = exports.InlineBedrockModelConfigurations$ = exports.InlineAgentTracePart$ = exports.InlineAgentReturnControlPayload$ = exports.InlineAgentPayloadPart$ = exports.InlineAgentFilePart$ = exports.InferenceConfiguration$ = exports.InferenceConfig$ = exports.ImplicitFilterConfiguration$ = exports.ImageInput$ = exports.ImageBlock$ = exports.GuardrailWordPolicyAssessment$ = exports.GuardrailTrace$ = exports.GuardrailTopicPolicyAssessment$ = exports.GuardrailTopic$ = exports.GuardrailSensitiveInformationPolicyAssessment$ = exports.GuardrailRegexFilter$ = exports.GuardrailPiiEntityFilter$ = exports.GuardrailManagedWord$ = exports.GuardrailEvent$ = exports.GuardrailCustomWord$ = exports.GuardrailContentPolicyAssessment$ = exports.GuardrailContentFilter$ = exports.GuardrailConfigurationWithArn$ = exports.GuardrailConfiguration$ = exports.GuardrailAssessment$ = exports.GetSessionResponse$ = exports.GetSessionRequest$ = exports.GetInvocationStepResponse$ = exports.GetInvocationStepRequest$ = void 0;
exports.PropertyParameters$ = exports.PromptTemplate$ = exports.PromptOverrideConfiguration$ = exports.PromptCreationConfigurations$ = exports.PromptConfiguration$ = exports.PreProcessingParsedResponse$ = exports.PreProcessingModelInvocationOutput$ = exports.PostProcessingParsedResponse$ = exports.PostProcessingModelInvocationOutput$ = exports.PerformanceConfiguration$ = exports.PayloadPart$ = exports.ParameterDetail$ = exports.Parameter$ = exports.OutputFile$ = exports.OrchestrationModelInvocationOutput$ = exports.OrchestrationConfiguration$ = exports.OptimizePromptResponse$ = exports.OptimizePromptRequest$ = exports.OptimizedPromptEvent$ = exports.Observation$ = exports.NodeOutputNext$ = exports.NodeOutputField$ = exports.NodeOutputEvent$ = exports.NodeInputSource$ = exports.NodeInputField$ = exports.NodeInputExecutionChainItem$ = exports.NodeInputEvent$ = exports.NodeFailureEvent$ = exports.NodeDependencyEvent$ = exports.NodeActionEvent$ = exports.ModelPerformanceConfiguration$ = exports.ModelInvocationInput$ = exports.MetadataConfigurationForReranking$ = exports.MetadataAttributeSchema$ = exports.Metadata$ = exports.Message$ = exports.MemorySessionSummary$ = exports.ListTagsForResourceResponse$ = exports.ListTagsForResourceRequest$ = exports.ListSessionsResponse$ = exports.ListSessionsRequest$ = exports.ListInvocationStepsResponse$ = exports.ListInvocationStepsRequest$ = exports.ListInvocationsResponse$ = exports.ListInvocationsRequest$ = exports.ListFlowExecutionsResponse$ = exports.ListFlowExecutionsRequest$ = exports.ListFlowExecutionEventsResponse$ = exports.ListFlowExecutionEventsRequest$ = exports.KnowledgeBaseVectorSearchConfiguration$ = void 0;
exports.SessionSummary$ = exports.SessionState$ = exports.SatisfiedCondition$ = exports.S3ObjectFile$ = exports.S3ObjectDoc$ = exports.S3Location$ = exports.S3Identifier$ = exports.RoutingClassifierModelInvocationOutput$ = exports.ReturnControlResults$ = exports.ReturnControlPayload$ = exports.RetrieveResponse$ = exports.RetrieveRequest$ = exports.RetrievedReference$ = exports.RetrieveAndGenerateStreamResponse$ = exports.RetrieveAndGenerateStreamRequest$ = exports.RetrieveAndGenerateSessionConfiguration$ = exports.RetrieveAndGenerateResponse$ = exports.RetrieveAndGenerateRequest$ = exports.RetrieveAndGenerateOutputEvent$ = exports.RetrieveAndGenerateOutput$ = exports.RetrieveAndGenerateInput$ = exports.RetrieveAndGenerateConfiguration$ = exports.RetrievalResultWebLocation$ = exports.RetrievalResultSqlLocation$ = exports.RetrievalResultSharePointLocation$ = exports.RetrievalResultSalesforceLocation$ = exports.RetrievalResultS3Location$ = exports.RetrievalResultLocation$ = exports.RetrievalResultKendraDocumentLocation$ = exports.RetrievalResultCustomDocumentLocation$ = exports.RetrievalResultContentColumn$ = exports.RetrievalResultContent$ = exports.RetrievalResultConfluenceLocation$ = exports.RerankTextDocument$ = exports.RerankSource$ = exports.RerankResult$ = exports.RerankResponse$ = exports.RerankRequest$ = exports.RerankQuery$ = exports.RerankingConfiguration$ = exports.RerankDocument$ = exports.RequestBody$ = exports.RepromptResponse$ = exports.ReasoningTextBlock$ = exports.RawResponse$ = exports.Rationale$ = exports.QueryTransformationConfiguration$ = exports.QueryGenerationInput$ = exports.PutInvocationStepResponse$ = exports.PutInvocationStepRequest$ = void 0;
exports.OptimizedPrompt$ = exports.NodeTraceElements$ = exports.NodeExecutionContent$ = exports.Memory$ = exports.InvocationStepPayload$ = exports.InvocationResultMember$ = exports.InvocationInputMember$ = exports.InputPrompt$ = exports.InlineAgentResponseStream$ = exports.ImageSource$ = exports.ImageInputSource$ = exports.FunctionSchema$ = exports.FlowTraceNodeOutputContent$ = exports.FlowTraceNodeInputContent$ = exports.FlowTrace$ = exports.FlowResponseStream$ = exports.FlowOutputContent$ = exports.FlowMultiTurnInputContent$ = exports.FlowInputContent$ = exports.FlowExecutionEvent$ = exports.FlowExecutionContent$ = exports.ContentBlock$ = exports.Caller$ = exports.BedrockSessionContentBlock$ = exports.APISchema$ = exports.ActionGroupExecutor$ = exports.VideoSegment$ = exports.VectorSearchRerankingConfiguration$ = exports.VectorSearchBedrockRerankingModelConfiguration$ = exports.VectorSearchBedrockRerankingConfiguration$ = exports.Usage$ = exports.UpdateSessionResponse$ = exports.UpdateSessionRequest$ = exports.UntagResourceResponse$ = exports.UntagResourceRequest$ = exports.TransformationConfiguration$ = exports.TracePart$ = exports.TextToSqlKnowledgeBaseConfiguration$ = exports.TextToSqlConfiguration$ = exports.TextResponsePart$ = exports.TextPrompt$ = exports.TextInferenceConfig$ = exports.TagResourceResponse$ = exports.TagResourceRequest$ = exports.StreamingConfigurations$ = exports.StopFlowExecutionResponse$ = exports.StopFlowExecutionRequest$ = exports.StartFlowExecutionResponse$ = exports.StartFlowExecutionRequest$ = exports.Span$ = void 0;
exports.UpdateSession$ = exports.UntagResource$ = exports.TagResource$ = exports.StopFlowExecution$ = exports.StartFlowExecution$ = exports.RetrieveAndGenerateStream$ = exports.RetrieveAndGenerate$ = exports.Retrieve$ = exports.Rerank$ = exports.PutInvocationStep$ = exports.OptimizePrompt$ = exports.ListTagsForResource$ = exports.ListSessions$ = exports.ListInvocationSteps$ = exports.ListInvocations$ = exports.ListFlowExecutions$ = exports.ListFlowExecutionEvents$ = exports.InvokeInlineAgent$ = exports.InvokeFlow$ = exports.InvokeAgent$ = exports.GetSession$ = exports.GetInvocationStep$ = exports.GetFlowExecution$ = exports.GetExecutionFlowSnapshot$ = exports.GetAgentMemory$ = exports.GenerateQuery$ = exports.EndSession$ = exports.DeleteSession$ = exports.DeleteAgentMemory$ = exports.CreateSession$ = exports.CreateInvocation$ = exports.TraceElements$ = exports.Trace$ = exports.RoutingClassifierTrace$ = exports.RetrieveAndGenerateStreamResponseOutput$ = exports.RetrievalFilter$ = exports.ResponseStream$ = exports.RerankingMetadataSelectiveModeConfiguration$ = exports.ReasoningContentBlock$ = exports.PreProcessingTrace$ = exports.PostProcessingTrace$ = exports.OrchestrationTrace$ = exports.OrchestrationExecutor$ = exports.OptimizedPromptStream$ = void 0;
const _A = "Attribution";
const _AAG = "AgentActionGroup";
const _AAGg = "AgentActionGroups";
const _ACII = "AgentCollaboratorInvocationInput";
const _ACIO = "AgentCollaboratorInvocationOutput";
const _ACIP = "AgentCollaboratorInputPayload";
const _ACM = "ApiContentMap";
const _ACOP = "AgentCollaboratorOutputPayload";
const _ACPS = "AgentCollaboratorPayloadString";
const _ADE = "AccessDeniedException";
const _AGE = "ActionGroupExecutor";
const _AGII = "ActionGroupInvocationInput";
const _AGIO = "ActionGroupInvocationOutput";
const _AGN = "ActionGroupName";
const _AGOS = "ActionGroupOutputString";
const _AII = "ApiInvocationInput";
const _AP = "ApiPath";
const _APE = "AnalyzePromptEvent";
const _APIS = "APISchema";
const _APp = "ApiParameter";
const _APpi = "ApiParameters";
const _AR = "ApiResult";
const _ARB = "ApiRequestBody";
const _AS = "AudioSegment";
const _AT = "AgentTraces";
const _BCB = "ByteContentBlob";
const _BCD = "ByteContentDoc";
const _BCF = "ByteContentFile";
const _BGE = "BadGatewayException";
const _BMC = "BedrockModelConfigurations";
const _BPT = "BasePromptTemplate";
const _BRC = "BedrockRerankingConfiguration";
const _BRMC = "BedrockRerankingModelConfiguration";
const _BSCB = "BedrockSessionContentBlocks";
const _BSCBe = "BedrockSessionContentBlock";
const _C = "Citation";
const _CB = "ContentBody";
const _CBo = "ContentBlocks";
const _CBon = "ContentBlock";
const _CC = "CollaboratorConfiguration";
const _CCa = "CallerChain";
const _CCo = "CollaboratorConfigurations";
const _CE = "ConflictException";
const _CEi = "CitationEvent";
const _CH = "ConversationHistory";
const _CI = "CollaborationInstruction";
const _CIII = "CodeInterpreterInvocationInput";
const _CIIO = "CodeInterpreterInvocationOutput";
const _CIR = "CreateInvocationRequest";
const _CIRr = "CreateInvocationResponse";
const _CIr = "CreateInvocation";
const _CM = "ContentMap";
const _CO = "CustomOrchestration";
const _COT = "CustomOrchestrationTrace";
const _COTE = "CustomOrchestrationTraceEvent";
const _CRE = "ConditionResultEvent";
const _CS = "CreateSession";
const _CSR = "CreateSessionRequest";
const _CSRr = "CreateSessionResponse";
const _Ca = "Caller";
const _Ci = "Citations";
const _Co = "Collaborator";
const _Col = "Collaborators";
const _DAM = "DeleteAgentMemory";
const _DAMR = "DeleteAgentMemoryRequest";
const _DAMRe = "DeleteAgentMemoryResponse";
const _DFE = "DependencyFailedException";
const _DS = "DeleteSession";
const _DSR = "DeleteSessionRequest";
const _DSRe = "DeleteSessionResponse";
const _ES = "ExternalSource";
const _ESGC = "ExternalSourcesGenerationConfiguration";
const _ESR = "EndSessionRequest";
const _ESRAGC = "ExternalSourcesRetrieveAndGenerateConfiguration";
const _ESRn = "EndSessionResponse";
const _ESn = "EndSession";
const _ESx = "ExternalSources";
const _F = "Function";
const _FA = "FilterAttribute";
const _FB = "FileBody";
const _FCE = "FlowCompletionEvent";
const _FD = "FunctionDefinition";
const _FEC = "FlowExecutionContent";
const _FEE = "FlowExecutionError";
const _FEEl = "FlowExecutionErrors";
const _FEElo = "FlowExecutionEvents";
const _FEElow = "FlowExecutionEvent";
const _FEIE = "FlowExecutionInputEvent";
const _FEOE = "FlowExecutionOutputEvent";
const _FES = "FlowExecutionSummary";
const _FESl = "FlowExecutionSummaries";
const _FFE = "FlowFailureEvent";
const _FFR = "FieldForReranking";
const _FFRi = "FieldsForReranking";
const _FI = "FlowInput";
const _FIC = "FlowInputContent";
const _FIF = "FlowInputField";
const _FIFl = "FlowInputFields";
const _FII = "FunctionInvocationInput";
const _FIl = "FlowInputs";
const _FMTIC = "FlowMultiTurnInputContent";
const _FMTIRE = "FlowMultiTurnInputRequestEvent";
const _FNIE = "FlowNodeInputExpression";
const _FOC = "FlowOutputContent";
const _FOE = "FlowOutputEvent";
const _FOF = "FlowOutputField";
const _FOFl = "FlowOutputFields";
const _FP = "FilePart";
const _FPu = "FunctionParameter";
const _FPun = "FunctionParameters";
const _FR = "FinalResponse";
const _FRS = "FailureReasonString";
const _FRSi = "FinalResponseString";
const _FRSl = "FlowResponseStream";
const _FRu = "FunctionResult";
const _FS = "FileSource";
const _FSu = "FunctionSchema";
const _FT = "FailureTrace";
const _FTC = "FlowTraceCondition";
const _FTCNRE = "FlowTraceConditionNodeResultEvent";
const _FTCl = "FlowTraceConditions";
const _FTDE = "FlowTraceDependencyEvent";
const _FTE = "FlowTraceEvent";
const _FTNAE = "FlowTraceNodeActionEvent";
const _FTNIC = "FlowTraceNodeInputContent";
const _FTNIE = "FlowTraceNodeInputEvent";
const _FTNIEC = "FlowTraceNodeInputExecutionChain";
const _FTNIECI = "FlowTraceNodeInputExecutionChainItem";
const _FTNIF = "FlowTraceNodeInputField";
const _FTNIFl = "FlowTraceNodeInputFields";
const _FTNIS = "FlowTraceNodeInputSource";
const _FTNOC = "FlowTraceNodeOutputContent";
const _FTNOE = "FlowTraceNodeOutputEvent";
const _FTNOF = "FlowTraceNodeOutputField";
const _FTNOFl = "FlowTraceNodeOutputFields";
const _FTNON = "FlowTraceNodeOutputNext";
const _FTNONL = "FlowTraceNodeOutputNextList";
const _FTl = "FlowTrace";
const _Fu = "Functions";
const _GA = "GuardrailAssessment";
const _GAL = "GuardrailAssessmentList";
const _GAM = "GetAgentMemory";
const _GAMR = "GetAgentMemoryRequest";
const _GAMRe = "GetAgentMemoryResponse";
const _GC = "GenerationConfiguration";
const _GCF = "GuardrailContentFilter";
const _GCFL = "GuardrailContentFilterList";
const _GCPA = "GuardrailContentPolicyAssessment";
const _GCW = "GuardrailCustomWord";
const _GCWA = "GuardrailConfigurationWithArn";
const _GCWL = "GuardrailCustomWordList";
const _GCu = "GuardrailConfiguration";
const _GE = "GuardrailEvent";
const _GEFS = "GetExecutionFlowSnapshot";
const _GEFSR = "GetExecutionFlowSnapshotRequest";
const _GEFSRe = "GetExecutionFlowSnapshotResponse";
const _GFE = "GetFlowExecution";
const _GFER = "GetFlowExecutionRequest";
const _GFERe = "GetFlowExecutionResponse";
const _GIS = "GetInvocationStep";
const _GISR = "GetInvocationStepRequest";
const _GISRe = "GetInvocationStepResponse";
const _GMW = "GuardrailManagedWord";
const _GMWL = "GuardrailManagedWordList";
const _GPEF = "GuardrailPiiEntityFilter";
const _GPEFL = "GuardrailPiiEntityFilterList";
const _GQ = "GeneratedQuery";
const _GQR = "GenerateQueryRequest";
const _GQRe = "GenerateQueryResponse";
const _GQe = "GeneratedQueries";
const _GQen = "GenerateQuery";
const _GRF = "GuardrailRegexFilter";
const _GRFL = "GuardrailRegexFilterList";
const _GRP = "GeneratedResponsePart";
const _GS = "GetSession";
const _GSIPA = "GuardrailSensitiveInformationPolicyAssessment";
const _GSR = "GetSessionRequest";
const _GSRe = "GetSessionResponse";
const _GT = "GuardrailTopic";
const _GTL = "GuardrailTopicList";
const _GTPA = "GuardrailTopicPolicyAssessment";
const _GTu = "GuardrailTrace";
const _GWPA = "GuardrailWordPolicyAssessment";
const _I = "Identifier";
const _IA = "InvokeAgent";
const _IAFP = "InlineAgentFilePart";
const _IAPP = "InlineAgentPayloadPart";
const _IAR = "InvokeAgentRequest";
const _IARCP = "InlineAgentReturnControlPayload";
const _IARS = "InlineAgentResponseStream";
const _IARn = "InvokeAgentResponse";
const _IATP = "InlineAgentTracePart";
const _IB = "ImageBlock";
const _IBMC = "InlineBedrockModelConfigurations";
const _IC = "InferenceConfig";
const _ICn = "InferenceConfiguration";
const _IF = "InputFile";
const _IFC = "ImplicitFilterConfiguration";
const _IFR = "InvokeFlowRequest";
const _IFRn = "InvokeFlowResponse";
const _IFn = "InputFiles";
const _IFnv = "InvokeFlow";
const _II = "ImageInput";
const _IIA = "InvokeInlineAgent";
const _IIAR = "InvokeInlineAgentRequest";
const _IIARn = "InvokeInlineAgentResponse";
const _IIM = "InvocationInputMember";
const _IIS = "ImageInputSource";
const _IIm = "ImageInputs";
const _IIn = "InputImage";
const _IInv = "InvocationInput";
const _IInvo = "InvocationInputs";
const _IP = "InputPrompt";
const _IRM = "InvocationResultMember";
const _IS = "InvocationStep";
const _ISE = "InternalServerException";
const _ISP = "InvocationStepPayload";
const _ISS = "InlineSessionState";
const _ISSn = "InvocationStepSummary";
const _ISSnv = "InvocationStepSummaries";
const _ISm = "ImageSource";
const _ISn = "InvocationSummary";
const _ISnv = "InvocationSummaries";
const _IT = "InputText";
const _In = "Instruction";
const _KB = "KnowledgeBase";
const _KBC = "KnowledgeBaseConfiguration";
const _KBCn = "KnowledgeBaseConfigurations";
const _KBLI = "KnowledgeBaseLookupInput";
const _KBLIS = "KnowledgeBaseLookupInputString";
const _KBLO = "KnowledgeBaseLookupOutput";
const _KBQ = "KnowledgeBaseQuery";
const _KBRAGC = "KnowledgeBaseRetrieveAndGenerateConfiguration";
const _KBRC = "KnowledgeBaseRetrievalConfiguration";
const _KBRR = "KnowledgeBaseRetrievalResult";
const _KBRRn = "KnowledgeBaseRetrievalResults";
const _KBVSC = "KnowledgeBaseVectorSearchConfiguration";
const _KBn = "KnowledgeBases";
const _LFE = "ListFlowExecutions";
const _LFEE = "ListFlowExecutionEvents";
const _LFEER = "ListFlowExecutionEventsRequest";
const _LFEERi = "ListFlowExecutionEventsResponse";
const _LFER = "ListFlowExecutionsRequest";
const _LFERi = "ListFlowExecutionsResponse";
const _LI = "ListInvocations";
const _LIR = "ListInvocationsRequest";
const _LIRi = "ListInvocationsResponse";
const _LIS = "ListInvocationSteps";
const _LISR = "ListInvocationStepsRequest";
const _LISRi = "ListInvocationStepsResponse";
const _LS = "ListSessions";
const _LSR = "ListSessionsRequest";
const _LSRi = "ListSessionsResponse";
const _LTFR = "ListTagsForResource";
const _LTFRR = "ListTagsForResourceRequest";
const _LTFRRi = "ListTagsForResourceResponse";
const _M = "Message";
const _MAS = "MetadataAttributeSchema";
const _MASL = "MetadataAttributeSchemaList";
const _MCFR = "MetadataConfigurationForReranking";
const _MII = "ModelInvocationInput";
const _MNRE = "ModelNotReadyException";
const _MPC = "ModelPerformanceConfiguration";
const _MSS = "MemorySessionSummary";
const _Me = "Metadata";
const _Mem = "Memories";
const _Memo = "Memory";
const _Mes = "Messages";
const _N = "Name";
const _NAE = "NodeActionEvent";
const _NDE = "NodeDependencyEvent";
const _NEC = "NodeExecutionContent";
const _NFE = "NodeFailureEvent";
const _NIE = "NodeInputEvent";
const _NIEC = "NodeInputExecutionChain";
const _NIECI = "NodeInputExecutionChainItem";
const _NIF = "NodeInputField";
const _NIFo = "NodeInputFields";
const _NIS = "NodeInputSource";
const _NOE = "NodeOutputEvent";
const _NOF = "NodeOutputField";
const _NOFo = "NodeOutputFields";
const _NON = "NodeOutputNext";
const _NONL = "NodeOutputNextList";
const _NTE = "NodeTraceElements";
const _O = "Observation";
const _OC = "OrchestrationConfiguration";
const _OE = "OrchestrationExecutor";
const _OF = "OutputFile";
const _OFu = "OutputFiles";
const _OMIO = "OrchestrationModelInvocationOutput";
const _OP = "OptimizedPrompt";
const _OPE = "OptimizedPromptEvent";
const _OPR = "OptimizePromptRequest";
const _OPRp = "OptimizePromptResponse";
const _OPS = "OptimizedPromptStream";
const _OPp = "OptimizePrompt";
const _OS = "OutputString";
const _OT = "OrchestrationTrace";
const _P = "Payload";
const _PB = "PartBody";
const _PC = "PerformanceConfiguration";
const _PCC = "PromptCreationConfigurations";
const _PCr = "PromptConfiguration";
const _PCro = "PromptConfigurations";
const _PD = "ParameterDetail";
const _PIS = "PutInvocationStep";
const _PISR = "PutInvocationStepRequest";
const _PISRu = "PutInvocationStepResponse";
const _PL = "ParameterList";
const _PM = "ParameterMap";
const _POC = "PromptOverrideConfiguration";
const _PP = "PayloadPart";
const _PPMIO = "PostProcessingModelInvocationOutput";
const _PPMIOr = "PreProcessingModelInvocationOutput";
const _PPPR = "PostProcessingParsedResponse";
const _PPPRr = "PreProcessingParsedResponse";
const _PPT = "PostProcessingTrace";
const _PPTr = "PreProcessingTrace";
const _PPr = "PropertyParameters";
const _PT = "PromptText";
const _PTr = "PromptTemplate";
const _Pa = "Parameter";
const _Par = "Parameters";
const _QGI = "QueryGenerationInput";
const _QTC = "QueryTransformationConfiguration";
const _R = "Rationale";
const _RAG = "RetrieveAndGenerate";
const _RAGC = "RetrieveAndGenerateConfiguration";
const _RAGI = "RetrieveAndGenerateInput";
const _RAGO = "RetrieveAndGenerateOutput";
const _RAGOE = "RetrieveAndGenerateOutputEvent";
const _RAGR = "RetrieveAndGenerateRequest";
const _RAGRe = "RetrieveAndGenerateResponse";
const _RAGS = "RetrieveAndGenerateStream";
const _RAGSC = "RetrieveAndGenerateSessionConfiguration";
const _RAGSR = "RetrieveAndGenerateStreamRequest";
const _RAGSRO = "RetrieveAndGenerateStreamResponseOutput";
const _RAGSRe = "RetrieveAndGenerateStreamResponse";
const _RB = "RequestBody";
const _RBe = "ResponseBody";
const _RC = "RerankingConfiguration";
const _RCB = "ReasoningContentBlock";
const _RCIR = "ReturnControlInvocationResults";
const _RCMIO = "RoutingClassifierModelInvocationOutput";
const _RCP = "ReturnControlPayload";
const _RCR = "ReturnControlResults";
const _RCT = "RoutingClassifierTrace";
const _RD = "ResourceDescription";
const _RDe = "RerankDocument";
const _RF = "RetrievalFilter";
const _RFL = "RetrievalFilterList";
const _RMSMC = "RerankingMetadataSelectiveModeConfiguration";
const _RN = "ResourceName";
const _RNFE = "ResourceNotFoundException";
const _RQ = "RerankQuery";
const _RQL = "RerankQueriesList";
const _RR = "RawResponse";
const _RRC = "RetrievalResultContent";
const _RRCC = "RetrievalResultContentColumn";
const _RRCDL = "RetrievalResultCustomDocumentLocation";
const _RRCL = "RetrievalResultConfluenceLocation";
const _RRCR = "RetrievalResultContentRow";
const _RRKDL = "RetrievalResultKendraDocumentLocation";
const _RRL = "RetrievalResultLocation";
const _RRLe = "RerankResultsList";
const _RRM = "RetrievalResultMetadata";
const _RRSL = "RetrievalResultS3Location";
const _RRSLe = "RetrievalResultSalesforceLocation";
const _RRSLet = "RetrievalResultSqlLocation";
const _RRSPL = "RetrievalResultSharePointLocation";
const _RRWL = "RetrievalResultWebLocation";
const _RRe = "RepromptResponse";
const _RRer = "RerankRequest";
const _RRera = "RerankResponse";
const _RReran = "RerankResult";
const _RRet = "RetrievedReference";
const _RRetr = "RetrieveRequest";
const _RRetri = "RetrieveResponse";
const _RRetrie = "RetrievedReferences";
const _RS = "RationaleString";
const _RSL = "RerankSourcesList";
const _RSe = "RerankSource";
const _RSes = "ResponseStream";
const _RTB = "ReasoningTextBlock";
const _RTD = "RerankTextDocument";
const _Re = "Rerank";
const _Ret = "Retrieve";
const _S = "Source";
const _SC = "SatisfiedCondition";
const _SCa = "SatisfiedConditions";
const _SCt = "StreamingConfigurations";
const _SFE = "StartFlowExecution";
const _SFER = "StartFlowExecutionRequest";
const _SFERt = "StartFlowExecutionResponse";
const _SFERto = "StopFlowExecutionRequest";
const _SFERtop = "StopFlowExecutionResponse";
const _SFEt = "StopFlowExecution";
const _SI = "S3Identifier";
const _SL = "S3Location";
const _SOD = "S3ObjectDoc";
const _SOF = "S3ObjectFile";
const _SQEE = "ServiceQuotaExceededException";
const _SS = "SessionState";
const _SSe = "SessionSummary";
const _SSes = "SessionSummaries";
const _Sp = "Span";
const _T = "Trace";
const _TC = "TransformationConfiguration";
const _TE = "ThrottlingException";
const _TEr = "TraceElements";
const _TIC = "TextInferenceConfig";
const _TKBI = "TraceKnowledgeBaseId";
const _TP = "TextPrompt";
const _TPT = "TextPromptTemplate";
const _TPr = "TracePart";
const _TR = "TagResource";
const _TRP = "TextResponsePart";
const _TRR = "TagResourceRequest";
const _TRRa = "TagResourceResponse";
const _TTSC = "TextToSqlConfiguration";
const _TTSKBC = "TextToSqlKnowledgeBaseConfiguration";
const _U = "Usage";
const _UR = "UntagResource";
const _URR = "UntagResourceRequest";
const _URRn = "UntagResourceResponse";
const _US = "UpdateSession";
const _USR = "UpdateSessionRequest";
const _USRp = "UpdateSessionResponse";
const _V = "Verb";
const _VE = "ValidationException";
const _VS = "VideoSegment";
const _VSBRC = "VectorSearchBedrockRerankingConfiguration";
const _VSBRMC = "VectorSearchBedrockRerankingModelConfiguration";
const _VSRC = "VectorSearchRerankingConfiguration";
const _a = "action";
const _aA = "andAll";
const _aAA = "agentAliasArn";
const _aAI = "agentAliasId";
const _aC = "agentCollaboration";
const _aCAA = "agentCollaboratorAliasArn";
const _aCII = "agentCollaboratorInvocationInput";
const _aCIO = "agentCollaboratorInvocationOutput";
const _aCN = "agentCollaboratorName";
const _aDE = "accessDeniedException";
const _aG = "actionGroup";
const _aGE = "actionGroupExecutor";
const _aGI = "applyGuardrailInterval";
const _aGII = "actionGroupInvocationInput";
const _aGIO = "actionGroupInvocationOutput";
const _aGN = "actionGroupName";
const _aGc = "actionGroups";
const _aI = "agentId";
const _aII = "apiInvocationInput";
const _aIT = "actionInvocationType";
const _aMRF = "additionalModelRequestFields";
const _aN = "agentName";
const _aP = "apiPath";
const _aPE = "analyzePromptEvent";
const _aR = "apiResult";
const _aS = "apiSchema";
const _aT = "agentTraces";
const _aV = "agentVersion";
const _at = "attribution";
const _au = "audio";
const _b = "body";
const _bC = "byteContent";
const _bGE = "badGatewayException";
const _bMC = "bedrockModelConfigurations";
const _bPT = "basePromptTemplate";
const _bRC = "bedrockRerankingConfiguration";
const _by = "bytes";
const _c = "client";
const _cA = "createdAt";
const _cB = "contentBlocks";
const _cC = "collaboratorConfigurations";
const _cCa = "callerChain";
const _cCu = "customControl";
const _cDL = "customDocumentLocation";
const _cE = "conflictException";
const _cEKA = "customerEncryptionKeyArn";
const _cH = "conversationHistory";
const _cI = "collaboratorInstruction";
const _cIII = "codeInterpreterInvocationInput";
const _cIIO = "codeInterpreterInvocationOutput";
const _cL = "confluenceLocation";
const _cN = "collaboratorName";
const _cNRT = "conditionNodeResultTrace";
const _cNo = "conditionName";
const _cNol = "columnName";
const _cO = "customOrchestration";
const _cOT = "customOrchestrationTrace";
const _cP = "contentPolicy";
const _cR = "completionReason";
const _cRE = "conditionResultEvent";
const _cRI = "clientRequestId";
const _cS = "confirmationState";
const _cT = "contentType";
const _cV = "columnValue";
const _cW = "customWords";
const _ca = "category";
const _ch = "chunk";
const _ci = "citations";
const _cit = "citation";
const _co = "content";
const _cod = "code";
const _col = "collaborators";
const _com = "completion";
const _con = "confidence";
const _d = "description";
const _dFE = "dependencyFailedException";
const _da = "data";
const _de = "definition";
const _do = "document";
const _e = "error";
const _eA = "executionArn";
const _eAn = "endedAt";
const _eC = "errorCode";
const _eCx = "executionChain";
const _eE = "executionError";
const _eI = "executionIdentifier";
const _eIx = "executionId";
const _eKA = "encryptionKeyArn";
const _eM = "errorMessage";
const _eO = "executionOutput";
const _ePTS = "excludePreviousThinkingSteps";
const _eRA = "executionRoleArn";
const _eS = "endSession";
const _eSC = "externalSourcesConfiguration";
const _eT = "executionType";
const _eTn = "enableTrace";
const _eTnd = "endTime";
const _eTv = "eventTime";
const _eTve = "eventType";
const _eTx = "executionTimeout";
const _en = "end";
const _eq = "equals";
const _er = "errors";
const _ev = "event";
const _ex = "executor";
const _exp = "expression";
const _f = "function";
const _fAI = "flowAliasIdentifier";
const _fC = "failureCode";
const _fCE = "flowCompletionEvent";
const _fEE = "flowExecutionEvents";
const _fEN = "flowExecutionName";
const _fES = "flowExecutionSummaries";
const _fFE = "flowFailureEvent";
const _fI = "flowIdentifier";
const _fIE = "flowInputEvent";
const _fII = "functionInvocationInput";
const _fM = "foundationModel";
const _fMTIRE = "flowMultiTurnInputRequestEvent";
const _fN = "fieldName";
const _fOE = "flowOutputEvent";
const _fR = "failureReason";
const _fRi = "finalResponse";
const _fRu = "functionResult";
const _fS = "functionSchema";
const _fT = "failureTrace";
const _fTE = "flowTraceEvent";
const _fTEi = "fieldsToExclude";
const _fTI = "fieldsToInclude";
const _fV = "flowVersion";
const _fi = "files";
const _fie = "fields";
const _fil = "filters";
const _filt = "filter";
const _fo = "format";
const _fu = "functions";
const _g = "guardrail";
const _gA = "guardrailAction";
const _gC = "guardrailConfiguration";
const _gCe = "generationConfiguration";
const _gI = "guardrailId";
const _gIu = "guardrailIdentifier";
const _gRP = "generatedResponsePart";
const _gT = "greaterThan";
const _gTOE = "greaterThanOrEquals";
const _gTu = "guardrailTrace";
const _gV = "guardrailVersion";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hM = "httpMethod";
const _hQ = "httpQuery";
const _hSC = "httpStatusCode";
const _i = "input";
const _iA = "inputAssessments";
const _iC = "inferenceConfig";
const _iCn = "inlineContent";
const _iCnf = "inferenceConfiguration";
const _iDS = "inlineDocumentSource";
const _iFC = "implicitFilterConfiguration";
const _iFN = "inputFieldName";
const _iI = "invocationId";
const _iIn = "invocationIdentifier";
const _iInv = "invocationInputs";
const _iInvo = "invocationInput";
const _iS = "invocationStep";
const _iSE = "internalServerException";
const _iSI = "invocationStepId";
const _iSS = "inlineSessionState";
const _iSSn = "invocationStepSummaries";
const _iST = "invocationStepTime";
const _iSTTLIS = "idleSessionTTLInSeconds";
const _iSn = "invocationSummaries";
const _iT = "invocationType";
const _iTn = "inputText";
const _iTnp = "inputTokens";
const _iV = "isValid";
const _id = "identifier";
const _id_ = "id";
const _im = "images";
const _ima = "image";
const _in = "instruction";
const _in_ = "in";
const _ind = "index";
const _inp = "inputs";
const _jD = "jsonDocument";
const _k = "key";
const _kB = "knowledgeBases";
const _kBA = "knowledgeBaseArn";
const _kBC = "knowledgeBaseConfiguration";
const _kBCn = "knowledgeBaseConfigurations";
const _kBI = "knowledgeBaseId";
const _kBLI = "knowledgeBaseLookupInput";
const _kBLO = "knowledgeBaseLookupOutput";
const _kDL = "kendraDocumentLocation";
const _kKA = "kmsKeyArn";
const _l = "location";
const _lC = "listContains";
const _lT = "lessThan";
const _lTOE = "lessThanOrEquals";
const _lUA = "lastUpdatedAt";
const _la = "latency";
const _lam = "lambda";
const _m = "message";
const _mA = "modelArn";
const _mAe = "metadataAttributes";
const _mC = "modelConfiguration";
const _mCe = "memoryContents";
const _mCet = "metadataConfiguration";
const _mI = "memoryId";
const _mII = "modelInvocationInput";
const _mIO = "modelInvocationOutput";
const _mIa = "maxItems";
const _mL = "maximumLength";
const _mNRE = "modelNotReadyException";
const _mPC = "modelPerformanceConfiguration";
const _mR = "maxResults";
const _mT = "mediaType";
const _mTa = "maxTokens";
const _mTe = "memoryType";
const _mWL = "managedWordLists";
const _ma = "match";
const _me = "metadata";
const _mes = "messages";
const _mo = "mode";
const _n = "name";
const _nAE = "nodeActionEvent";
const _nAT = "nodeActionTrace";
const _nDE = "nodeDependencyEvent";
const _nDT = "nodeDependencyTrace";
const _nE = "notEquals";
const _nFE = "nodeFailureEvent";
const _nI = "notIn";
const _nIE = "nodeInputEvent";
const _nIN = "nodeInputName";
const _nIT = "nodeInputTrace";
const _nN = "nodeName";
const _nOE = "nodeOutputEvent";
const _nON = "nodeOutputName";
const _nOR = "numberOfResults";
const _nORR = "numberOfRerankedResults";
const _nOT = "nodeOutputTrace";
const _nT = "nodeType";
const _nTe = "nextToken";
const _ne = "next";
const _o = "output";
const _oA = "outputAssessments";
const _oAr = "orAll";
const _oC = "orchestrationConfiguration";
const _oFN = "outputFieldName";
const _oL = "overrideLambda";
const _oN = "operationName";
const _oP = "optimizedPrompt";
const _oPE = "optimizedPromptEvent";
const _oR = "operationRequest";
const _oRp = "operationResponse";
const _oST = "overrideSearchType";
const _oT = "orchestrationType";
const _oTTM = "operationTotalTimeMs";
const _oTr = "orchestrationTrace";
const _oTu = "outputTokens";
const _ob = "observation";
const _p = "parameters";
const _pAGS = "parentActionGroupSignature";
const _pAGSP = "parentActionGroupSignatureParams";
const _pC = "performanceConfig";
const _pCC = "promptCreationConfigurations";
const _pCM = "promptCreationMode";
const _pCTTI = "previousConversationTurnsToInclude";
const _pCr = "promptConfigurations";
const _pE = "piiEntities";
const _pM = "parserMode";
const _pOC = "promptOverrideConfiguration";
const _pPT = "preProcessingTrace";
const _pPTo = "postProcessingTrace";
const _pR = "parsedResponse";
const _pS = "promptState";
const _pSA = "promptSessionAttributes";
const _pT = "promptTemplate";
const _pTr = "promptType";
const _pa = "payload";
const _pr = "properties";
const _q = "queries";
const _qGI = "queryGenerationInput";
const _qTC = "queryTransformationConfiguration";
const _qu = "query";
const _r = "reason";
const _rA = "resourceArn";
const _rAGC = "retrieveAndGenerateConfiguration";
const _rB = "requestBody";
const _rBe = "responseBody";
const _rC = "requireConfirmation";
const _rCH = "relayConversationHistory";
const _rCIR = "returnControlInvocationResults";
const _rCP = "returnControlPayload";
const _rCR = "returnControlResults";
const _rCT = "routingClassifierTrace";
const _rCe = "retrievalConfiguration";
const _rCea = "reasoningContent";
const _rCed = "redactedContent";
const _rCer = "rerankingConfiguration";
const _rCet = "returnControl";
const _rI = "requestId";
const _rN = "resourceName";
const _rNFE = "resourceNotFoundException";
const _rQ = "retrievalQuery";
const _rR = "retrievedReferences";
const _rRa = "rawResponse";
const _rRe = "repromptResponse";
const _rRet = "retrievalResults";
const _rS = "responseState";
const _rSe = "responseStream";
const _rSel = "relevanceScore";
const _rT = "reasoningText";
const _ra = "rationale";
const _re = "regex";
const _reg = "regexes";
const _req = "required";
const _res = "results";
const _ro = "role";
const _row = "row";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.bedrockagentruntime";
const _sA = "sessionArn";
const _sAe = "sessionAttributes";
const _sAo = "sourceArn";
const _sAt = "startedAt";
const _sBN = "s3BucketName";
const _sC = "satisfiedConditions";
const _sCe = "sessionConfiguration";
const _sCt = "streamingConfigurations";
const _sCtr = "stringContains";
const _sET = "sessionExpiryTime";
const _sFR = "streamFinalResponse";
const _sI = "sessionIdentifier";
const _sIP = "sensitiveInformationPolicy";
const _sIe = "sessionId";
const _sL = "s3Location";
const _sLa = "salesforceLocation";
const _sLq = "sqlLocation";
const _sM = "sessionMetadata";
const _sMC = "selectiveModeConfiguration";
const _sMe = "selectionMode";
const _sN = "serviceName";
const _sOK = "s3ObjectKey";
const _sPL = "sharePointLocation";
const _sQEE = "serviceQuotaExceededException";
const _sS = "sessionStatus";
const _sST = "sessionStartTime";
const _sSe = "sessionState";
const _sSes = "sessionSummaries";
const _sSess = "sessionSummary";
const _sSt = "stopSequences";
const _sT = "sourceType";
const _sTt = "startTime";
const _sTu = "summaryText";
const _sU = "s3Uri";
const _sW = "startsWith";
const _s_ = "s3";
const _sc = "score";
const _se = "server";
const _si = "signature";
const _so = "sources";
const _sou = "source";
const _sp = "span";
const _sq = "sql";
const _st = "status";
const _sta = "start";
const _str = "stream";
const _stre = "streaming";
const _su = "summary";
const _t = "text";
const _tC = "transformationConfiguration";
const _tD = "textDocument";
const _tE = "traceElements";
const _tEh = "throttlingException";
const _tI = "traceId";
const _tIC = "textInferenceConfig";
const _tK = "topK";
const _tKa = "tagKeys";
const _tMI = "targetModelId";
const _tP = "topicPolicy";
const _tPT = "textPromptTemplate";
const _tPe = "textPrompt";
const _tPo = "topP";
const _tQ = "textQuery";
const _tRP = "textResponsePart";
const _tTM = "totalTimeMs";
const _tTSC = "textToSqlConfiguration";
const _ta = "tags";
const _te = "temperature";
const _ti = "timestamp";
const _to = "topics";
const _tr = "transcription";
const _tra = "trace";
const _ty = "type";
const _u = "usage";
const _uC = "useCase";
const _ur = "url";
const _uri = "uri";
const _v = "verb";
const _vE = "validationException";
const _vSC = "vectorSearchConfiguration";
const _va = "value";
const _vi = "video";
const _wL = "webLocation";
const _wP = "wordPolicy";
const _xabact = "x-amzn-bedrock-agent-content-type";
const _xabami = "x-amz-bedrock-agent-memory-id";
const _xabasi = "x-amz-bedrock-agent-session-id";
const _xabfei = "x-amz-bedrock-flow-execution-id";
const _xabkbsi = "x-amzn-bedrock-knowledge-base-session-id";
const _xasa = "x-amz-source-arn";
const n0 = "com.amazonaws.bedrockagentruntime";
const schema_1 = require("@smithy/core/schema");
const BedrockAgentRuntimeServiceException_1 = require("../models/BedrockAgentRuntimeServiceException");
const errors_1 = require("../models/errors");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.BedrockAgentRuntimeServiceException$ = [-3, _s, "BedrockAgentRuntimeServiceException", 0, [], []];
_s_registry.registerError(exports.BedrockAgentRuntimeServiceException$, BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.AccessDeniedException$ = [-3, n0, _ADE,
    { [_e]: _c, [_hE]: 403 },
    [_m],
    [0]
];
n0_registry.registerError(exports.AccessDeniedException$, errors_1.AccessDeniedException);
exports.BadGatewayException$ = [-3, n0, _BGE,
    { [_e]: _se, [_hE]: 502 },
    [_m, _rN],
    [0, 0]
];
n0_registry.registerError(exports.BadGatewayException$, errors_1.BadGatewayException);
exports.ConflictException$ = [-3, n0, _CE,
    { [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ConflictException$, errors_1.ConflictException);
exports.DependencyFailedException$ = [-3, n0, _DFE,
    { [_e]: _c, [_hE]: 424 },
    [_m, _rN],
    [0, 0]
];
n0_registry.registerError(exports.DependencyFailedException$, errors_1.DependencyFailedException);
exports.InternalServerException$ = [-3, n0, _ISE,
    { [_e]: _se, [_hE]: 500 },
    [_m, _r],
    [0, 0]
];
n0_registry.registerError(exports.InternalServerException$, errors_1.InternalServerException);
exports.ModelNotReadyException$ = [-3, n0, _MNRE,
    { [_e]: _c, [_hE]: 424 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ModelNotReadyException$, errors_1.ModelNotReadyException);
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
var ActionGroupName = [0, n0, _AGN, 8, 0];
var ActionGroupOutputString = [0, n0, _AGOS, 8, 0];
var AgentCollaboratorPayloadString = [0, n0, _ACPS, 8, 0];
var ApiPath = [0, n0, _AP, 8, 0];
var BasePromptTemplate = [0, n0, _BPT, 8, 0];
var ByteContentBlob = [0, n0, _BCB, 8, 21];
var CollaborationInstruction = [0, n0, _CI, 8, 0];
var FailureReasonString = [0, n0, _FRS, 8, 0];
var FileBody = [0, n0, _FB, 8, 21];
var FinalResponseString = [0, n0, _FRSi, 8, 0];
var FlowNodeInputExpression = [0, n0, _FNIE, 8, 0];
var Function = [0, n0, _F, 8, 0];
var Identifier = [0, n0, _I, 8, 0];
var InputText = [0, n0, _IT, 8, 0];
var Instruction = [0, n0, _In, 8, 0];
var KnowledgeBaseLookupInputString = [0, n0, _KBLIS, 8, 0];
var Name = [0, n0, _N, 8, 0];
var OutputString = [0, n0, _OS, 8, 0];
var PartBody = [0, n0, _PB, 8, 21];
var Payload = [0, n0, _P, 8, 0];
var PromptText = [0, n0, _PT, 8, 0];
var RationaleString = [0, n0, _RS, 8, 0];
var ResourceDescription = [0, n0, _RD, 8, 0];
var ResourceName = [0, n0, _RN, 8, 0];
var Source = [0, n0, _S, 8, 0];
var TextPromptTemplate = [0, n0, _TPT, 8, 0];
var TraceKnowledgeBaseId = [0, n0, _TKBI, 8, 0];
var Verb = [0, n0, _V, 8, 0];
exports.ActionGroupInvocationInput$ = [3, n0, _AGII,
    0,
    [_aGN, _v, _aP, _p, _rB, _f, _eT, _iI],
    [[() => ActionGroupName, 0], [() => Verb, 0], [() => ApiPath, 0], () => _Parameters, () => exports.RequestBody$, [() => Function, 0], 0, 0]
];
exports.ActionGroupInvocationOutput$ = [3, n0, _AGIO,
    0,
    [_t, _me],
    [[() => ActionGroupOutputString, 0], [() => exports.Metadata$, 0]]
];
exports.AgentActionGroup$ = [3, n0, _AAG,
    0,
    [_aGN, _d, _pAGS, _aGE, _aS, _fS, _pAGSP],
    [[() => ResourceName, 0], [() => ResourceDescription, 0], 0, () => exports.ActionGroupExecutor$, [() => exports.APISchema$, 0], [() => exports.FunctionSchema$, 0], 128 | 0], 1
];
exports.AgentCollaboratorInputPayload$ = [3, n0, _ACIP,
    0,
    [_ty, _t, _rCR],
    [0, [() => AgentCollaboratorPayloadString, 0], [() => exports.ReturnControlResults$, 0]]
];
exports.AgentCollaboratorInvocationInput$ = [3, n0, _ACII,
    0,
    [_aCN, _aCAA, _i],
    [0, 0, [() => exports.AgentCollaboratorInputPayload$, 0]]
];
exports.AgentCollaboratorInvocationOutput$ = [3, n0, _ACIO,
    0,
    [_aCN, _aCAA, _o, _me],
    [0, 0, [() => exports.AgentCollaboratorOutputPayload$, 0], [() => exports.Metadata$, 0]]
];
exports.AgentCollaboratorOutputPayload$ = [3, n0, _ACOP,
    0,
    [_ty, _t, _rCP],
    [0, [() => AgentCollaboratorPayloadString, 0], [() => exports.ReturnControlPayload$, 0]]
];
exports.AnalyzePromptEvent$ = [3, n0, _APE,
    8,
    [_m],
    [0]
];
exports.ApiInvocationInput$ = [3, n0, _AII,
    0,
    [_aG, _hM, _aP, _p, _rB, _aIT, _aI, _cN],
    [0, 0, [() => ApiPath, 0], () => ApiParameters, () => exports.ApiRequestBody$, 0, 0, [() => Name, 0]], 1
];
exports.ApiParameter$ = [3, n0, _APp,
    0,
    [_n, _ty, _va],
    [0, 0, 0]
];
exports.ApiRequestBody$ = [3, n0, _ARB,
    0,
    [_co],
    [() => ApiContentMap]
];
exports.ApiResult$ = [3, n0, _AR,
    0,
    [_aG, _hM, _aP, _cS, _rS, _hSC, _rBe, _aI],
    [0, 0, [() => ApiPath, 0], 0, 0, 1, () => ResponseBody, 0], 1
];
exports.Attribution$ = [3, n0, _A,
    0,
    [_ci],
    [[() => Citations, 0]]
];
exports.AudioSegment$ = [3, n0, _AS,
    0,
    [_sU, _tr],
    [0, 0], 1
];
exports.BedrockModelConfigurations$ = [3, n0, _BMC,
    0,
    [_pC],
    [() => exports.PerformanceConfiguration$]
];
exports.BedrockRerankingConfiguration$ = [3, n0, _BRC,
    0,
    [_mC, _nOR],
    [() => exports.BedrockRerankingModelConfiguration$, 1], 1
];
exports.BedrockRerankingModelConfiguration$ = [3, n0, _BRMC,
    0,
    [_mA, _aMRF],
    [0, 128 | 15], 1
];
exports.ByteContentDoc$ = [3, n0, _BCD,
    0,
    [_id, _cT, _da],
    [[() => Identifier, 0], 0, [() => ByteContentBlob, 0]], 3
];
exports.ByteContentFile$ = [3, n0, _BCF,
    0,
    [_mT, _da],
    [0, [() => ByteContentBlob, 0]], 2
];
exports.Citation$ = [3, n0, _C,
    0,
    [_gRP, _rR],
    [[() => exports.GeneratedResponsePart$, 0], [() => RetrievedReferences, 0]]
];
exports.CitationEvent$ = [3, n0, _CEi,
    0,
    [_cit, _gRP, _rR],
    [[() => exports.Citation$, 0], [() => exports.GeneratedResponsePart$, 0], [() => RetrievedReferences, 0]]
];
exports.CodeInterpreterInvocationInput$ = [3, n0, _CIII,
    0,
    [_cod, _fi],
    [0, 64 | 0]
];
exports.CodeInterpreterInvocationOutput$ = [3, n0, _CIIO,
    0,
    [_eO, _eE, _fi, _eTx, _me],
    [0, 0, 64 | 0, 2, [() => exports.Metadata$, 0]]
];
exports.Collaborator$ = [3, n0, _Co,
    0,
    [_fM, _in, _cEKA, _iSTTLIS, _aGc, _kB, _gC, _pOC, _aC, _cC, _aN],
    [0, [() => Instruction, 0], 0, 1, [() => AgentActionGroups, 0], [() => KnowledgeBases, 0], () => exports.GuardrailConfigurationWithArn$, [() => exports.PromptOverrideConfiguration$, 0], 0, [() => CollaboratorConfigurations, 0], [() => Name, 0]], 2
];
exports.CollaboratorConfiguration$ = [3, n0, _CC,
    0,
    [_cN, _cI, _aAA, _rCH],
    [[() => Name, 0], [() => CollaborationInstruction, 0], 0, 0], 2
];
exports.ConditionResultEvent$ = [3, n0, _CRE,
    8,
    [_nN, _ti, _sC],
    [0, 5, [() => SatisfiedConditions, 0]], 3
];
exports.ContentBody$ = [3, n0, _CB,
    0,
    [_b, _im],
    [0, () => ImageInputs]
];
exports.ConversationHistory$ = [3, n0, _CH,
    0,
    [_mes],
    [[() => Messages, 0]]
];
exports.CreateInvocationRequest$ = [3, n0, _CIR,
    0,
    [_sI, _iI, _d],
    [[0, 1], 0, 0], 1
];
exports.CreateInvocationResponse$ = [3, n0, _CIRr,
    0,
    [_sIe, _iI, _cA],
    [0, 0, 5], 3
];
exports.CreateSessionRequest$ = [3, n0, _CSR,
    0,
    [_sM, _eKA, _ta],
    [128 | 0, 0, 128 | 0]
];
exports.CreateSessionResponse$ = [3, n0, _CSRr,
    0,
    [_sIe, _sA, _sS, _cA],
    [0, 0, 0, 5], 4
];
exports.CustomOrchestration$ = [3, n0, _CO,
    0,
    [_ex],
    [() => exports.OrchestrationExecutor$]
];
exports.CustomOrchestrationTrace$ = [3, n0, _COT,
    8,
    [_tI, _ev],
    [0, [() => exports.CustomOrchestrationTraceEvent$, 0]]
];
exports.CustomOrchestrationTraceEvent$ = [3, n0, _COTE,
    8,
    [_t],
    [0]
];
exports.DeleteAgentMemoryRequest$ = [3, n0, _DAMR,
    0,
    [_aI, _aAI, _mI, _sIe],
    [[0, 1], [0, 1], [0, { [_hQ]: _mI }], [0, { [_hQ]: _sIe }]], 2
];
exports.DeleteAgentMemoryResponse$ = [3, n0, _DAMRe,
    0,
    [],
    []
];
exports.DeleteSessionRequest$ = [3, n0, _DSR,
    0,
    [_sI],
    [[0, 1]], 1
];
exports.DeleteSessionResponse$ = [3, n0, _DSRe,
    0,
    [],
    []
];
exports.EndSessionRequest$ = [3, n0, _ESR,
    0,
    [_sI],
    [[0, 1]], 1
];
exports.EndSessionResponse$ = [3, n0, _ESRn,
    0,
    [_sIe, _sA, _sS],
    [0, 0, 0], 3
];
exports.ExternalSource$ = [3, n0, _ES,
    0,
    [_sT, _sL, _bC],
    [0, () => exports.S3ObjectDoc$, [() => exports.ByteContentDoc$, 0]], 1
];
exports.ExternalSourcesGenerationConfiguration$ = [3, n0, _ESGC,
    0,
    [_pT, _gC, _iC, _aMRF, _pC],
    [[() => exports.PromptTemplate$, 0], () => exports.GuardrailConfiguration$, () => exports.InferenceConfig$, 128 | 15, () => exports.PerformanceConfiguration$]
];
exports.ExternalSourcesRetrieveAndGenerateConfiguration$ = [3, n0, _ESRAGC,
    0,
    [_mA, _so, _gCe],
    [0, [() => ExternalSources, 0], [() => exports.ExternalSourcesGenerationConfiguration$, 0]], 2
];
exports.FailureTrace$ = [3, n0, _FT,
    8,
    [_tI, _fR, _fC, _me],
    [0, [() => FailureReasonString, 0], 1, [() => exports.Metadata$, 0]]
];
exports.FieldForReranking$ = [3, n0, _FFR,
    0,
    [_fN],
    [0], 1
];
exports.FilePart$ = [3, n0, _FP,
    0,
    [_fi],
    [[() => OutputFiles, 0]]
];
exports.FileSource$ = [3, n0, _FS,
    0,
    [_sT, _sL, _bC],
    [0, () => exports.S3ObjectFile$, [() => exports.ByteContentFile$, 0]], 1
];
exports.FilterAttribute$ = [3, n0, _FA,
    0,
    [_k, _va],
    [0, 15], 2
];
exports.FinalResponse$ = [3, n0, _FR,
    0,
    [_t, _me],
    [[() => FinalResponseString, 0], [() => exports.Metadata$, 0]]
];
exports.FlowCompletionEvent$ = [3, n0, _FCE,
    8,
    [_cR],
    [0], 1
];
exports.FlowExecutionError$ = [3, n0, _FEE,
    0,
    [_nN, _e, _m],
    [0, 0, 0]
];
exports.FlowExecutionInputEvent$ = [3, n0, _FEIE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => FlowInputFields, 0]], 3
];
exports.FlowExecutionOutputEvent$ = [3, n0, _FEOE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => FlowOutputFields, 0]], 3
];
exports.FlowExecutionSummary$ = [3, n0, _FES,
    0,
    [_eA, _fAI, _fI, _fV, _st, _cA, _eAn],
    [0, 0, 0, 0, 0, 5, 5], 6
];
exports.FlowFailureEvent$ = [3, n0, _FFE,
    8,
    [_ti, _eC, _eM],
    [5, 0, 0], 3
];
exports.FlowInput$ = [3, n0, _FI,
    0,
    [_nN, _co, _nON, _nIN],
    [0, [() => exports.FlowInputContent$, 0], 0, 0], 2
];
exports.FlowInputField$ = [3, n0, _FIF,
    8,
    [_n, _co],
    [0, [() => exports.FlowExecutionContent$, 0]], 2
];
exports.FlowMultiTurnInputRequestEvent$ = [3, n0, _FMTIRE,
    8,
    [_nN, _nT, _co],
    [0, 0, () => exports.FlowMultiTurnInputContent$], 3
];
exports.FlowOutputEvent$ = [3, n0, _FOE,
    8,
    [_nN, _nT, _co],
    [0, 0, () => exports.FlowOutputContent$], 3
];
exports.FlowOutputField$ = [3, n0, _FOF,
    8,
    [_n, _co],
    [0, [() => exports.FlowExecutionContent$, 0]], 2
];
exports.FlowTraceCondition$ = [3, n0, _FTC,
    8,
    [_cNo],
    [0], 1
];
exports.FlowTraceConditionNodeResultEvent$ = [3, n0, _FTCNRE,
    8,
    [_nN, _ti, _sC],
    [0, 5, [() => FlowTraceConditions, 0]], 3
];
exports.FlowTraceDependencyEvent$ = [3, n0, _FTDE,
    8,
    [_nN, _ti, _tE],
    [0, 5, [() => exports.TraceElements$, 0]], 3
];
exports.FlowTraceEvent$ = [3, n0, _FTE,
    0,
    [_tra],
    [[() => exports.FlowTrace$, 0]], 1
];
exports.FlowTraceNodeActionEvent$ = [3, n0, _FTNAE,
    8,
    [_nN, _ti, _rI, _sN, _oN, _oR, _oRp],
    [0, 5, 0, 0, 0, 15, 15], 5
];
exports.FlowTraceNodeInputEvent$ = [3, n0, _FTNIE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => FlowTraceNodeInputFields, 0]], 3
];
exports.FlowTraceNodeInputExecutionChainItem$ = [3, n0, _FTNIECI,
    8,
    [_nN, _ty, _ind],
    [0, 0, 1], 2
];
exports.FlowTraceNodeInputField$ = [3, n0, _FTNIF,
    8,
    [_nIN, _co, _sou, _ty, _ca, _eCx],
    [0, [() => exports.FlowTraceNodeInputContent$, 0], [() => exports.FlowTraceNodeInputSource$, 0], 0, 0, [() => FlowTraceNodeInputExecutionChain, 0]], 2
];
exports.FlowTraceNodeInputSource$ = [3, n0, _FTNIS,
    8,
    [_nN, _oFN, _exp],
    [0, 0, [() => FlowNodeInputExpression, 0]], 3
];
exports.FlowTraceNodeOutputEvent$ = [3, n0, _FTNOE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => FlowTraceNodeOutputFields, 0]], 3
];
exports.FlowTraceNodeOutputField$ = [3, n0, _FTNOF,
    8,
    [_nON, _co, _ne, _ty],
    [0, () => exports.FlowTraceNodeOutputContent$, [() => FlowTraceNodeOutputNextList, 0], 0], 2
];
exports.FlowTraceNodeOutputNext$ = [3, n0, _FTNON,
    8,
    [_nN, _iFN],
    [0, 0], 2
];
exports.FunctionDefinition$ = [3, n0, _FD,
    0,
    [_n, _d, _p, _rC],
    [[() => ResourceName, 0], 0, () => ParameterMap, 0], 1
];
exports.FunctionInvocationInput$ = [3, n0, _FII,
    0,
    [_aG, _p, _f, _aIT, _aI, _cN],
    [0, () => FunctionParameters, 0, 0, 0, [() => Name, 0]], 1
];
exports.FunctionParameter$ = [3, n0, _FPu,
    0,
    [_n, _ty, _va],
    [0, 0, 0]
];
exports.FunctionResult$ = [3, n0, _FRu,
    0,
    [_aG, _cS, _f, _rBe, _rS, _aI],
    [0, 0, 0, () => ResponseBody, 0, 0], 1
];
exports.GeneratedQuery$ = [3, n0, _GQ,
    8,
    [_ty, _sq],
    [0, 0]
];
exports.GeneratedResponsePart$ = [3, n0, _GRP,
    0,
    [_tRP],
    [[() => exports.TextResponsePart$, 0]]
];
exports.GenerateQueryRequest$ = [3, n0, _GQR,
    0,
    [_qGI, _tC],
    [[() => exports.QueryGenerationInput$, 0], () => exports.TransformationConfiguration$], 2
];
exports.GenerateQueryResponse$ = [3, n0, _GQRe,
    0,
    [_q],
    [[() => GeneratedQueries, 0]]
];
exports.GenerationConfiguration$ = [3, n0, _GC,
    0,
    [_pT, _gC, _iC, _aMRF, _pC],
    [[() => exports.PromptTemplate$, 0], () => exports.GuardrailConfiguration$, () => exports.InferenceConfig$, 128 | 15, () => exports.PerformanceConfiguration$]
];
exports.GetAgentMemoryRequest$ = [3, n0, _GAMR,
    0,
    [_aI, _aAI, _mTe, _mI, _nTe, _mIa],
    [[0, 1], [0, 1], [0, { [_hQ]: _mTe }], [0, { [_hQ]: _mI }], [0, { [_hQ]: _nTe }], [1, { [_hQ]: _mIa }]], 4
];
exports.GetAgentMemoryResponse$ = [3, n0, _GAMRe,
    0,
    [_nTe, _mCe],
    [0, () => Memories]
];
exports.GetExecutionFlowSnapshotRequest$ = [3, n0, _GEFSR,
    0,
    [_fI, _fAI, _eI],
    [[0, 1], [0, 1], [0, 1]], 3
];
exports.GetExecutionFlowSnapshotResponse$ = [3, n0, _GEFSRe,
    0,
    [_fI, _fAI, _fV, _eRA, _de, _cEKA],
    [0, 0, 0, 0, 0, 0], 5
];
exports.GetFlowExecutionRequest$ = [3, n0, _GFER,
    0,
    [_fI, _fAI, _eI],
    [[0, 1], [0, 1], [0, 1]], 3
];
exports.GetFlowExecutionResponse$ = [3, n0, _GFERe,
    0,
    [_eA, _st, _sAt, _fAI, _fI, _fV, _eAn, _er],
    [0, 0, 5, 0, 0, 0, 5, () => FlowExecutionErrors], 6
];
exports.GetInvocationStepRequest$ = [3, n0, _GISR,
    0,
    [_iIn, _iSI, _sI],
    [0, [0, 1], [0, 1]], 3
];
exports.GetInvocationStepResponse$ = [3, n0, _GISRe,
    0,
    [_iS],
    [[() => exports.InvocationStep$, 0]], 1
];
exports.GetSessionRequest$ = [3, n0, _GSR,
    0,
    [_sI],
    [[0, 1]], 1
];
exports.GetSessionResponse$ = [3, n0, _GSRe,
    0,
    [_sIe, _sA, _sS, _cA, _lUA, _sM, _eKA],
    [0, 0, 0, 5, 5, 128 | 0, 0], 5
];
exports.GuardrailAssessment$ = [3, n0, _GA,
    8,
    [_tP, _cP, _wP, _sIP],
    [[() => exports.GuardrailTopicPolicyAssessment$, 0], [() => exports.GuardrailContentPolicyAssessment$, 0], [() => exports.GuardrailWordPolicyAssessment$, 0], [() => exports.GuardrailSensitiveInformationPolicyAssessment$, 0]]
];
exports.GuardrailConfiguration$ = [3, n0, _GCu,
    0,
    [_gI, _gV],
    [0, 0], 2
];
exports.GuardrailConfigurationWithArn$ = [3, n0, _GCWA,
    0,
    [_gIu, _gV],
    [0, 0], 2
];
exports.GuardrailContentFilter$ = [3, n0, _GCF,
    8,
    [_ty, _con, _a],
    [0, 0, 0]
];
exports.GuardrailContentPolicyAssessment$ = [3, n0, _GCPA,
    8,
    [_fil],
    [[() => GuardrailContentFilterList, 0]]
];
exports.GuardrailCustomWord$ = [3, n0, _GCW,
    8,
    [_ma, _a],
    [0, 0]
];
exports.GuardrailEvent$ = [3, n0, _GE,
    0,
    [_a],
    [0]
];
exports.GuardrailManagedWord$ = [3, n0, _GMW,
    8,
    [_ma, _ty, _a],
    [0, 0, 0]
];
exports.GuardrailPiiEntityFilter$ = [3, n0, _GPEF,
    8,
    [_ty, _ma, _a],
    [0, 0, 0]
];
exports.GuardrailRegexFilter$ = [3, n0, _GRF,
    8,
    [_n, _re, _ma, _a],
    [0, 0, 0, 0]
];
exports.GuardrailSensitiveInformationPolicyAssessment$ = [3, n0, _GSIPA,
    8,
    [_pE, _reg],
    [[() => GuardrailPiiEntityFilterList, 0], [() => GuardrailRegexFilterList, 0]]
];
exports.GuardrailTopic$ = [3, n0, _GT,
    8,
    [_n, _ty, _a],
    [0, 0, 0]
];
exports.GuardrailTopicPolicyAssessment$ = [3, n0, _GTPA,
    8,
    [_to],
    [[() => GuardrailTopicList, 0]]
];
exports.GuardrailTrace$ = [3, n0, _GTu,
    8,
    [_a, _tI, _iA, _oA, _me],
    [0, 0, [() => GuardrailAssessmentList, 0], [() => GuardrailAssessmentList, 0], [() => exports.Metadata$, 0]]
];
exports.GuardrailWordPolicyAssessment$ = [3, n0, _GWPA,
    8,
    [_cW, _mWL],
    [[() => GuardrailCustomWordList, 0], [() => GuardrailManagedWordList, 0]]
];
exports.ImageBlock$ = [3, n0, _IB,
    0,
    [_fo, _sou],
    [0, () => exports.ImageSource$], 2
];
exports.ImageInput$ = [3, n0, _II,
    0,
    [_fo, _sou],
    [0, () => exports.ImageInputSource$], 2
];
exports.ImplicitFilterConfiguration$ = [3, n0, _IFC,
    0,
    [_mAe, _mA],
    [[() => MetadataAttributeSchemaList, 0], 0], 2
];
exports.InferenceConfig$ = [3, n0, _IC,
    0,
    [_tIC],
    [() => exports.TextInferenceConfig$]
];
exports.InferenceConfiguration$ = [3, n0, _ICn,
    0,
    [_te, _tPo, _tK, _mL, _sSt],
    [1, 1, 1, 1, 64 | 0]
];
exports.InlineAgentFilePart$ = [3, n0, _IAFP,
    0,
    [_fi],
    [[() => OutputFiles, 0]]
];
exports.InlineAgentPayloadPart$ = [3, n0, _IAPP,
    8,
    [_by, _at],
    [[() => PartBody, 0], [() => exports.Attribution$, 0]]
];
exports.InlineAgentReturnControlPayload$ = [3, n0, _IARCP,
    8,
    [_iInv, _iI],
    [[() => InvocationInputs, 0], 0]
];
exports.InlineAgentTracePart$ = [3, n0, _IATP,
    8,
    [_sIe, _tra, _cCa, _eTv, _cN],
    [0, [() => exports.Trace$, 0], () => CallerChain, 5, [() => Name, 0]]
];
exports.InlineBedrockModelConfigurations$ = [3, n0, _IBMC,
    0,
    [_pC],
    [() => exports.PerformanceConfiguration$]
];
exports.InlineSessionState$ = [3, n0, _ISS,
    0,
    [_sAe, _pSA, _rCIR, _iI, _fi, _cH],
    [128 | 0, 128 | 0, [() => ReturnControlInvocationResults, 0], 0, [() => InputFiles, 0], [() => exports.ConversationHistory$, 0]]
];
exports.InputFile$ = [3, n0, _IF,
    0,
    [_n, _sou, _uC],
    [0, [() => exports.FileSource$, 0], 0], 3
];
exports.InputImage$ = [3, n0, _IIn,
    0,
    [_fo, _iCn],
    [0, [() => ByteContentBlob, 0]], 2
];
exports.InvocationInput$ = [3, n0, _IInv,
    8,
    [_tI, _iT, _aGII, _kBLI, _cIII, _aCII],
    [0, 0, [() => exports.ActionGroupInvocationInput$, 0], [() => exports.KnowledgeBaseLookupInput$, 0], () => exports.CodeInterpreterInvocationInput$, [() => exports.AgentCollaboratorInvocationInput$, 0]]
];
exports.InvocationStep$ = [3, n0, _IS,
    0,
    [_sIe, _iI, _iSI, _iST, _pa],
    [0, 0, 0, 5, [() => exports.InvocationStepPayload$, 0]], 5
];
exports.InvocationStepSummary$ = [3, n0, _ISSn,
    0,
    [_sIe, _iI, _iSI, _iST],
    [0, 0, 0, 5], 4
];
exports.InvocationSummary$ = [3, n0, _ISn,
    0,
    [_sIe, _iI, _cA],
    [0, 0, 5], 3
];
exports.InvokeAgentRequest$ = [3, n0, _IAR,
    0,
    [_aI, _aAI, _sIe, _sSe, _eS, _eTn, _iTn, _mI, _bMC, _sCt, _pCC, _sAo],
    [[0, 1], [0, 1], [0, 1], [() => exports.SessionState$, 0], 2, 2, [() => InputText, 0], 0, () => exports.BedrockModelConfigurations$, () => exports.StreamingConfigurations$, () => exports.PromptCreationConfigurations$, [0, { [_hH]: _xasa }]], 3
];
exports.InvokeAgentResponse$ = [3, n0, _IARn,
    0,
    [_com, _cT, _sIe, _mI],
    [[() => exports.ResponseStream$, 16], [0, { [_hH]: _xabact }], [0, { [_hH]: _xabasi }], [0, { [_hH]: _xabami }]], 3
];
exports.InvokeFlowRequest$ = [3, n0, _IFR,
    0,
    [_fI, _fAI, _inp, _eTn, _mPC, _eIx],
    [[0, 1], [0, 1], [() => FlowInputs, 0], 2, () => exports.ModelPerformanceConfiguration$, 0], 3
];
exports.InvokeFlowResponse$ = [3, n0, _IFRn,
    0,
    [_rSe, _eIx],
    [[() => exports.FlowResponseStream$, 16], [0, { [_hH]: _xabfei }]], 1
];
exports.InvokeInlineAgentRequest$ = [3, n0, _IIAR,
    0,
    [_fM, _in, _sIe, _cEKA, _iSTTLIS, _aGc, _kB, _gC, _pOC, _aC, _cC, _aN, _eS, _eTn, _iTn, _sCt, _pCC, _iSS, _col, _bMC, _oT, _cO],
    [0, [() => Instruction, 0], [0, 1], 0, 1, [() => AgentActionGroups, 0], [() => KnowledgeBases, 0], () => exports.GuardrailConfigurationWithArn$, [() => exports.PromptOverrideConfiguration$, 0], 0, [() => CollaboratorConfigurations, 0], [() => Name, 0], 2, 2, [() => InputText, 0], () => exports.StreamingConfigurations$, () => exports.PromptCreationConfigurations$, [() => exports.InlineSessionState$, 0], [() => Collaborators, 0], () => exports.InlineBedrockModelConfigurations$, 0, () => exports.CustomOrchestration$], 3
];
exports.InvokeInlineAgentResponse$ = [3, n0, _IIARn,
    0,
    [_com, _cT, _sIe],
    [[() => exports.InlineAgentResponseStream$, 16], [0, { [_hH]: _xabact }], [0, { [_hH]: _xabasi }]], 3
];
exports.KnowledgeBase$ = [3, n0, _KB,
    0,
    [_kBI, _d, _rCe],
    [0, [() => ResourceDescription, 0], [() => exports.KnowledgeBaseRetrievalConfiguration$, 0]], 2
];
exports.KnowledgeBaseConfiguration$ = [3, n0, _KBC,
    0,
    [_kBI, _rCe],
    [0, [() => exports.KnowledgeBaseRetrievalConfiguration$, 0]], 2
];
exports.KnowledgeBaseLookupInput$ = [3, n0, _KBLI,
    0,
    [_t, _kBI],
    [[() => KnowledgeBaseLookupInputString, 0], [() => TraceKnowledgeBaseId, 0]]
];
exports.KnowledgeBaseLookupOutput$ = [3, n0, _KBLO,
    0,
    [_rR, _me],
    [[() => RetrievedReferences, 0], [() => exports.Metadata$, 0]]
];
exports.KnowledgeBaseQuery$ = [3, n0, _KBQ,
    8,
    [_ty, _t, _ima],
    [0, 0, [() => exports.InputImage$, 0]]
];
exports.KnowledgeBaseRetrievalConfiguration$ = [3, n0, _KBRC,
    0,
    [_vSC],
    [[() => exports.KnowledgeBaseVectorSearchConfiguration$, 0]], 1
];
exports.KnowledgeBaseRetrievalResult$ = [3, n0, _KBRR,
    0,
    [_co, _l, _sc, _me],
    [[() => exports.RetrievalResultContent$, 0], [() => exports.RetrievalResultLocation$, 0], 1, [() => RetrievalResultMetadata, 0]], 1
];
exports.KnowledgeBaseRetrieveAndGenerateConfiguration$ = [3, n0, _KBRAGC,
    0,
    [_kBI, _mA, _rCe, _gCe, _oC],
    [0, 0, [() => exports.KnowledgeBaseRetrievalConfiguration$, 0], [() => exports.GenerationConfiguration$, 0], [() => exports.OrchestrationConfiguration$, 0]], 2
];
exports.KnowledgeBaseVectorSearchConfiguration$ = [3, n0, _KBVSC,
    0,
    [_nOR, _oST, _filt, _rCer, _iFC],
    [1, 0, [() => exports.RetrievalFilter$, 0], [() => exports.VectorSearchRerankingConfiguration$, 0], [() => exports.ImplicitFilterConfiguration$, 0]]
];
exports.ListFlowExecutionEventsRequest$ = [3, n0, _LFEER,
    0,
    [_fI, _fAI, _eI, _eTve, _mR, _nTe],
    [[0, 1], [0, 1], [0, 1], [0, { [_hQ]: _eTve }], [1, { [_hQ]: _mR }], [0, { [_hQ]: _nTe }]], 4
];
exports.ListFlowExecutionEventsResponse$ = [3, n0, _LFEERi,
    0,
    [_fEE, _nTe],
    [[() => FlowExecutionEvents, 0], 0], 1
];
exports.ListFlowExecutionsRequest$ = [3, n0, _LFER,
    0,
    [_fI, _fAI, _mR, _nTe],
    [[0, 1], [0, { [_hQ]: _fAI }], [1, { [_hQ]: _mR }], [0, { [_hQ]: _nTe }]], 1
];
exports.ListFlowExecutionsResponse$ = [3, n0, _LFERi,
    0,
    [_fES, _nTe],
    [() => FlowExecutionSummaries, 0], 1
];
exports.ListInvocationsRequest$ = [3, n0, _LIR,
    0,
    [_sI, _nTe, _mR],
    [[0, 1], [0, { [_hQ]: _nTe }], [1, { [_hQ]: _mR }]], 1
];
exports.ListInvocationsResponse$ = [3, n0, _LIRi,
    0,
    [_iSn, _nTe],
    [() => InvocationSummaries, 0], 1
];
exports.ListInvocationStepsRequest$ = [3, n0, _LISR,
    0,
    [_sI, _iIn, _nTe, _mR],
    [[0, 1], 0, [0, { [_hQ]: _nTe }], [1, { [_hQ]: _mR }]], 1
];
exports.ListInvocationStepsResponse$ = [3, n0, _LISRi,
    0,
    [_iSSn, _nTe],
    [() => InvocationStepSummaries, 0], 1
];
exports.ListSessionsRequest$ = [3, n0, _LSR,
    0,
    [_mR, _nTe],
    [[1, { [_hQ]: _mR }], [0, { [_hQ]: _nTe }]]
];
exports.ListSessionsResponse$ = [3, n0, _LSRi,
    0,
    [_sSes, _nTe],
    [() => SessionSummaries, 0], 1
];
exports.ListTagsForResourceRequest$ = [3, n0, _LTFRR,
    0,
    [_rA],
    [[0, 1]], 1
];
exports.ListTagsForResourceResponse$ = [3, n0, _LTFRRi,
    0,
    [_ta],
    [128 | 0]
];
exports.MemorySessionSummary$ = [3, n0, _MSS,
    0,
    [_mI, _sIe, _sST, _sET, _sTu],
    [0, 0, 5, 5, 0]
];
exports.Message$ = [3, n0, _M,
    0,
    [_ro, _co],
    [0, [() => ContentBlocks, 0]], 2
];
exports.Metadata$ = [3, n0, _Me,
    8,
    [_sTt, _eTnd, _tTM, _oTTM, _cRI, _u],
    [5, 5, 1, 1, 0, [() => exports.Usage$, 0]]
];
exports.MetadataAttributeSchema$ = [3, n0, _MAS,
    8,
    [_k, _ty, _d],
    [0, 0, 0], 3
];
exports.MetadataConfigurationForReranking$ = [3, n0, _MCFR,
    0,
    [_sMe, _sMC],
    [0, [() => exports.RerankingMetadataSelectiveModeConfiguration$, 0]], 1
];
exports.ModelInvocationInput$ = [3, n0, _MII,
    8,
    [_tI, _t, _ty, _oL, _pCM, _iCnf, _pM, _fM],
    [0, [() => PromptText, 0], 0, 0, 0, () => exports.InferenceConfiguration$, 0, 0]
];
exports.ModelPerformanceConfiguration$ = [3, n0, _MPC,
    0,
    [_pC],
    [() => exports.PerformanceConfiguration$]
];
exports.NodeActionEvent$ = [3, n0, _NAE,
    8,
    [_nN, _ti, _rI, _sN, _oN, _oR, _oRp],
    [0, 5, 0, 0, 0, 15, 15], 5
];
exports.NodeDependencyEvent$ = [3, n0, _NDE,
    8,
    [_nN, _ti, _tE],
    [0, 5, [() => exports.NodeTraceElements$, 0]], 3
];
exports.NodeFailureEvent$ = [3, n0, _NFE,
    8,
    [_nN, _ti, _eC, _eM],
    [0, 5, 0, 0], 4
];
exports.NodeInputEvent$ = [3, n0, _NIE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => NodeInputFields, 0]], 3
];
exports.NodeInputExecutionChainItem$ = [3, n0, _NIECI,
    0,
    [_nN, _ty, _ind],
    [0, 0, 1], 2
];
exports.NodeInputField$ = [3, n0, _NIF,
    8,
    [_n, _co, _sou, _ty, _ca, _eCx],
    [0, [() => exports.NodeExecutionContent$, 0], [() => exports.NodeInputSource$, 0], 0, 0, () => NodeInputExecutionChain], 2
];
exports.NodeInputSource$ = [3, n0, _NIS,
    0,
    [_nN, _oFN, _exp],
    [0, 0, [() => FlowNodeInputExpression, 0]], 3
];
exports.NodeOutputEvent$ = [3, n0, _NOE,
    8,
    [_nN, _ti, _fie],
    [0, 5, [() => NodeOutputFields, 0]], 3
];
exports.NodeOutputField$ = [3, n0, _NOF,
    8,
    [_n, _co, _ne, _ty],
    [0, [() => exports.NodeExecutionContent$, 0], [() => NodeOutputNextList, 0], 0], 2
];
exports.NodeOutputNext$ = [3, n0, _NON,
    8,
    [_nN, _iFN],
    [0, 0], 2
];
exports.Observation$ = [3, n0, _O,
    8,
    [_tI, _ty, _aGIO, _aCIO, _kBLO, _fRi, _rRe, _cIIO],
    [0, 0, [() => exports.ActionGroupInvocationOutput$, 0], [() => exports.AgentCollaboratorInvocationOutput$, 0], [() => exports.KnowledgeBaseLookupOutput$, 0], [() => exports.FinalResponse$, 0], [() => exports.RepromptResponse$, 0], [() => exports.CodeInterpreterInvocationOutput$, 0]]
];
exports.OptimizedPromptEvent$ = [3, n0, _OPE,
    8,
    [_oP],
    [[() => exports.OptimizedPrompt$, 0]]
];
exports.OptimizePromptRequest$ = [3, n0, _OPR,
    0,
    [_i, _tMI],
    [[() => exports.InputPrompt$, 0], 0], 2
];
exports.OptimizePromptResponse$ = [3, n0, _OPRp,
    0,
    [_oP],
    [[() => exports.OptimizedPromptStream$, 16]], 1
];
exports.OrchestrationConfiguration$ = [3, n0, _OC,
    0,
    [_pT, _iC, _aMRF, _qTC, _pC],
    [[() => exports.PromptTemplate$, 0], () => exports.InferenceConfig$, 128 | 15, () => exports.QueryTransformationConfiguration$, () => exports.PerformanceConfiguration$]
];
exports.OrchestrationModelInvocationOutput$ = [3, n0, _OMIO,
    8,
    [_tI, _rRa, _me, _rCea],
    [0, [() => exports.RawResponse$, 0], [() => exports.Metadata$, 0], [() => exports.ReasoningContentBlock$, 0]]
];
exports.OutputFile$ = [3, n0, _OF,
    8,
    [_n, _ty, _by],
    [0, 0, [() => FileBody, 0]]
];
exports.Parameter$ = [3, n0, _Pa,
    0,
    [_n, _ty, _va],
    [0, 0, 0]
];
exports.ParameterDetail$ = [3, n0, _PD,
    0,
    [_ty, _d, _req],
    [0, 0, 2], 1
];
exports.PayloadPart$ = [3, n0, _PP,
    8,
    [_by, _at],
    [[() => PartBody, 0], [() => exports.Attribution$, 0]]
];
exports.PerformanceConfiguration$ = [3, n0, _PC,
    0,
    [_la],
    [0]
];
exports.PostProcessingModelInvocationOutput$ = [3, n0, _PPMIO,
    8,
    [_tI, _pR, _rRa, _me, _rCea],
    [0, [() => exports.PostProcessingParsedResponse$, 0], [() => exports.RawResponse$, 0], [() => exports.Metadata$, 0], [() => exports.ReasoningContentBlock$, 0]]
];
exports.PostProcessingParsedResponse$ = [3, n0, _PPPR,
    8,
    [_t],
    [[() => OutputString, 0]]
];
exports.PreProcessingModelInvocationOutput$ = [3, n0, _PPMIOr,
    8,
    [_tI, _pR, _rRa, _me, _rCea],
    [0, [() => exports.PreProcessingParsedResponse$, 0], [() => exports.RawResponse$, 0], [() => exports.Metadata$, 0], [() => exports.ReasoningContentBlock$, 0]]
];
exports.PreProcessingParsedResponse$ = [3, n0, _PPPRr,
    8,
    [_ra, _iV],
    [[() => RationaleString, 0], 2]
];
exports.PromptConfiguration$ = [3, n0, _PCr,
    0,
    [_pTr, _pCM, _pS, _bPT, _iCnf, _pM, _fM, _aMRF],
    [0, 0, 0, [() => BasePromptTemplate, 0], () => exports.InferenceConfiguration$, 0, 0, 15]
];
exports.PromptCreationConfigurations$ = [3, n0, _PCC,
    0,
    [_pCTTI, _ePTS],
    [1, 2]
];
exports.PromptOverrideConfiguration$ = [3, n0, _POC,
    8,
    [_pCr, _oL],
    [[() => PromptConfigurations, 0], 0], 1
];
exports.PromptTemplate$ = [3, n0, _PTr,
    0,
    [_tPT],
    [[() => TextPromptTemplate, 0]]
];
exports.PropertyParameters$ = [3, n0, _PPr,
    0,
    [_pr],
    [() => ParameterList]
];
exports.PutInvocationStepRequest$ = [3, n0, _PISR,
    0,
    [_sI, _iIn, _iST, _pa, _iSI],
    [[0, 1], 0, 5, [() => exports.InvocationStepPayload$, 0], 0], 4
];
exports.PutInvocationStepResponse$ = [3, n0, _PISRu,
    0,
    [_iSI],
    [0], 1
];
exports.QueryGenerationInput$ = [3, n0, _QGI,
    8,
    [_ty, _t],
    [0, 0], 2
];
exports.QueryTransformationConfiguration$ = [3, n0, _QTC,
    0,
    [_ty],
    [0], 1
];
exports.Rationale$ = [3, n0, _R,
    8,
    [_tI, _t],
    [0, [() => RationaleString, 0]]
];
exports.RawResponse$ = [3, n0, _RR,
    8,
    [_co],
    [0]
];
exports.ReasoningTextBlock$ = [3, n0, _RTB,
    8,
    [_t, _si],
    [0, 0], 1
];
exports.RepromptResponse$ = [3, n0, _RRe,
    8,
    [_t, _sou],
    [0, [() => Source, 0]]
];
exports.RequestBody$ = [3, n0, _RB,
    0,
    [_co],
    [() => ContentMap]
];
exports.RerankDocument$ = [3, n0, _RDe,
    8,
    [_ty, _tD, _jD],
    [0, [() => exports.RerankTextDocument$, 0], 15], 1
];
exports.RerankingConfiguration$ = [3, n0, _RC,
    0,
    [_ty, _bRC],
    [0, () => exports.BedrockRerankingConfiguration$], 2
];
exports.RerankQuery$ = [3, n0, _RQ,
    8,
    [_ty, _tQ],
    [0, [() => exports.RerankTextDocument$, 0]], 2
];
exports.RerankRequest$ = [3, n0, _RRer,
    0,
    [_q, _so, _rCer, _nTe],
    [[() => RerankQueriesList, 0], [() => RerankSourcesList, 0], () => exports.RerankingConfiguration$, 0], 3
];
exports.RerankResponse$ = [3, n0, _RRera,
    0,
    [_res, _nTe],
    [[() => RerankResultsList, 0], 0], 1
];
exports.RerankResult$ = [3, n0, _RReran,
    0,
    [_ind, _rSel, _do],
    [1, 1, [() => exports.RerankDocument$, 0]], 2
];
exports.RerankSource$ = [3, n0, _RSe,
    8,
    [_ty, _iDS],
    [0, [() => exports.RerankDocument$, 0]], 2
];
exports.RerankTextDocument$ = [3, n0, _RTD,
    8,
    [_t],
    [0]
];
exports.RetrievalResultConfluenceLocation$ = [3, n0, _RRCL,
    0,
    [_ur],
    [0]
];
exports.RetrievalResultContent$ = [3, n0, _RRC,
    8,
    [_ty, _t, _bC, _vi, _au, _row],
    [0, 0, 0, () => exports.VideoSegment$, () => exports.AudioSegment$, [() => RetrievalResultContentRow, 0]]
];
exports.RetrievalResultContentColumn$ = [3, n0, _RRCC,
    8,
    [_cNol, _cV, _ty],
    [0, 0, 0]
];
exports.RetrievalResultCustomDocumentLocation$ = [3, n0, _RRCDL,
    0,
    [_id_],
    [0]
];
exports.RetrievalResultKendraDocumentLocation$ = [3, n0, _RRKDL,
    0,
    [_uri],
    [0]
];
exports.RetrievalResultLocation$ = [3, n0, _RRL,
    8,
    [_ty, _sL, _wL, _cL, _sLa, _sPL, _cDL, _kDL, _sLq],
    [0, () => exports.RetrievalResultS3Location$, () => exports.RetrievalResultWebLocation$, () => exports.RetrievalResultConfluenceLocation$, () => exports.RetrievalResultSalesforceLocation$, () => exports.RetrievalResultSharePointLocation$, () => exports.RetrievalResultCustomDocumentLocation$, () => exports.RetrievalResultKendraDocumentLocation$, () => exports.RetrievalResultSqlLocation$], 1
];
exports.RetrievalResultS3Location$ = [3, n0, _RRSL,
    0,
    [_uri],
    [0]
];
exports.RetrievalResultSalesforceLocation$ = [3, n0, _RRSLe,
    0,
    [_ur],
    [0]
];
exports.RetrievalResultSharePointLocation$ = [3, n0, _RRSPL,
    0,
    [_ur],
    [0]
];
exports.RetrievalResultSqlLocation$ = [3, n0, _RRSLet,
    0,
    [_qu],
    [0]
];
exports.RetrievalResultWebLocation$ = [3, n0, _RRWL,
    0,
    [_ur],
    [0]
];
exports.RetrieveAndGenerateConfiguration$ = [3, n0, _RAGC,
    0,
    [_ty, _kBC, _eSC],
    [0, [() => exports.KnowledgeBaseRetrieveAndGenerateConfiguration$, 0], [() => exports.ExternalSourcesRetrieveAndGenerateConfiguration$, 0]], 1
];
exports.RetrieveAndGenerateInput$ = [3, n0, _RAGI,
    8,
    [_t],
    [0], 1
];
exports.RetrieveAndGenerateOutput$ = [3, n0, _RAGO,
    8,
    [_t],
    [0], 1
];
exports.RetrieveAndGenerateOutputEvent$ = [3, n0, _RAGOE,
    8,
    [_t],
    [0], 1
];
exports.RetrieveAndGenerateRequest$ = [3, n0, _RAGR,
    0,
    [_i, _sIe, _rAGC, _sCe],
    [[() => exports.RetrieveAndGenerateInput$, 0], 0, [() => exports.RetrieveAndGenerateConfiguration$, 0], () => exports.RetrieveAndGenerateSessionConfiguration$], 1
];
exports.RetrieveAndGenerateResponse$ = [3, n0, _RAGRe,
    0,
    [_sIe, _o, _ci, _gA],
    [0, [() => exports.RetrieveAndGenerateOutput$, 0], [() => Citations, 0], 0], 2
];
exports.RetrieveAndGenerateSessionConfiguration$ = [3, n0, _RAGSC,
    0,
    [_kKA],
    [0], 1
];
exports.RetrieveAndGenerateStreamRequest$ = [3, n0, _RAGSR,
    0,
    [_i, _sIe, _rAGC, _sCe],
    [[() => exports.RetrieveAndGenerateInput$, 0], 0, [() => exports.RetrieveAndGenerateConfiguration$, 0], () => exports.RetrieveAndGenerateSessionConfiguration$], 1
];
exports.RetrieveAndGenerateStreamResponse$ = [3, n0, _RAGSRe,
    0,
    [_str, _sIe],
    [[() => exports.RetrieveAndGenerateStreamResponseOutput$, 16], [0, { [_hH]: _xabkbsi }]], 2
];
exports.RetrievedReference$ = [3, n0, _RRet,
    0,
    [_co, _l, _me],
    [[() => exports.RetrievalResultContent$, 0], [() => exports.RetrievalResultLocation$, 0], [() => RetrievalResultMetadata, 0]]
];
exports.RetrieveRequest$ = [3, n0, _RRetr,
    0,
    [_kBI, _rQ, _rCe, _gC, _nTe],
    [[0, 1], [() => exports.KnowledgeBaseQuery$, 0], [() => exports.KnowledgeBaseRetrievalConfiguration$, 0], () => exports.GuardrailConfiguration$, 0], 2
];
exports.RetrieveResponse$ = [3, n0, _RRetri,
    0,
    [_rRet, _gA, _nTe],
    [[() => KnowledgeBaseRetrievalResults, 0], 0, 0], 1
];
exports.ReturnControlPayload$ = [3, n0, _RCP,
    8,
    [_iInv, _iI],
    [[() => InvocationInputs, 0], 0]
];
exports.ReturnControlResults$ = [3, n0, _RCR,
    0,
    [_iI, _rCIR],
    [0, [() => ReturnControlInvocationResults, 0]]
];
exports.RoutingClassifierModelInvocationOutput$ = [3, n0, _RCMIO,
    8,
    [_tI, _rRa, _me],
    [0, [() => exports.RawResponse$, 0], [() => exports.Metadata$, 0]]
];
exports.S3Identifier$ = [3, n0, _SI,
    0,
    [_sBN, _sOK],
    [0, 0]
];
exports.S3Location$ = [3, n0, _SL,
    0,
    [_uri],
    [0], 1
];
exports.S3ObjectDoc$ = [3, n0, _SOD,
    0,
    [_uri],
    [0], 1
];
exports.S3ObjectFile$ = [3, n0, _SOF,
    0,
    [_uri],
    [0], 1
];
exports.SatisfiedCondition$ = [3, n0, _SC,
    8,
    [_cNo],
    [0], 1
];
exports.SessionState$ = [3, n0, _SS,
    0,
    [_sAe, _pSA, _rCIR, _iI, _fi, _kBCn, _cH],
    [128 | 0, 128 | 0, [() => ReturnControlInvocationResults, 0], 0, [() => InputFiles, 0], [() => KnowledgeBaseConfigurations, 0], [() => exports.ConversationHistory$, 0]]
];
exports.SessionSummary$ = [3, n0, _SSe,
    0,
    [_sIe, _sA, _sS, _cA, _lUA],
    [0, 0, 0, 5, 5], 5
];
exports.Span$ = [3, n0, _Sp,
    0,
    [_sta, _en],
    [1, 1]
];
exports.StartFlowExecutionRequest$ = [3, n0, _SFER,
    0,
    [_fI, _fAI, _inp, _fEN, _mPC],
    [[0, 1], [0, 1], [() => FlowInputs, 0], 0, () => exports.ModelPerformanceConfiguration$], 3
];
exports.StartFlowExecutionResponse$ = [3, n0, _SFERt,
    0,
    [_eA],
    [0]
];
exports.StopFlowExecutionRequest$ = [3, n0, _SFERto,
    0,
    [_fI, _fAI, _eI],
    [[0, 1], [0, 1], [0, 1]], 3
];
exports.StopFlowExecutionResponse$ = [3, n0, _SFERtop,
    0,
    [_st, _eA],
    [0, 0], 1
];
exports.StreamingConfigurations$ = [3, n0, _SCt,
    0,
    [_sFR, _aGI],
    [2, 1]
];
exports.TagResourceRequest$ = [3, n0, _TRR,
    0,
    [_rA, _ta],
    [[0, 1], 128 | 0], 2
];
exports.TagResourceResponse$ = [3, n0, _TRRa,
    0,
    [],
    []
];
exports.TextInferenceConfig$ = [3, n0, _TIC,
    0,
    [_te, _tPo, _mTa, _sSt],
    [1, 1, 1, 64 | 0]
];
exports.TextPrompt$ = [3, n0, _TP,
    8,
    [_t],
    [0], 1
];
exports.TextResponsePart$ = [3, n0, _TRP,
    8,
    [_t, _sp],
    [0, () => exports.Span$]
];
exports.TextToSqlConfiguration$ = [3, n0, _TTSC,
    0,
    [_ty, _kBC],
    [0, () => exports.TextToSqlKnowledgeBaseConfiguration$], 1
];
exports.TextToSqlKnowledgeBaseConfiguration$ = [3, n0, _TTSKBC,
    0,
    [_kBA],
    [0], 1
];
exports.TracePart$ = [3, n0, _TPr,
    8,
    [_sIe, _tra, _cCa, _eTv, _cN, _aI, _aAI, _aV],
    [0, [() => exports.Trace$, 0], () => CallerChain, 5, [() => Name, 0], 0, 0, 0]
];
exports.TransformationConfiguration$ = [3, n0, _TC,
    0,
    [_mo, _tTSC],
    [0, () => exports.TextToSqlConfiguration$], 1
];
exports.UntagResourceRequest$ = [3, n0, _URR,
    0,
    [_rA, _tKa],
    [[0, 1], [64 | 0, { [_hQ]: _tKa }]], 2
];
exports.UntagResourceResponse$ = [3, n0, _URRn,
    0,
    [],
    []
];
exports.UpdateSessionRequest$ = [3, n0, _USR,
    0,
    [_sI, _sM],
    [[0, 1], 128 | 0], 1
];
exports.UpdateSessionResponse$ = [3, n0, _USRp,
    0,
    [_sIe, _sA, _sS, _cA, _lUA],
    [0, 0, 0, 5, 5], 5
];
exports.Usage$ = [3, n0, _U,
    8,
    [_iTnp, _oTu],
    [1, 1]
];
exports.VectorSearchBedrockRerankingConfiguration$ = [3, n0, _VSBRC,
    0,
    [_mC, _nORR, _mCet],
    [() => exports.VectorSearchBedrockRerankingModelConfiguration$, 1, [() => exports.MetadataConfigurationForReranking$, 0]], 1
];
exports.VectorSearchBedrockRerankingModelConfiguration$ = [3, n0, _VSBRMC,
    0,
    [_mA, _aMRF],
    [0, 128 | 15], 1
];
exports.VectorSearchRerankingConfiguration$ = [3, n0, _VSRC,
    0,
    [_ty, _bRC],
    [0, [() => exports.VectorSearchBedrockRerankingConfiguration$, 0]], 1
];
exports.VideoSegment$ = [3, n0, _VS,
    0,
    [_sU, _su],
    [0, 0], 1
];
var AgentActionGroups = [1, n0, _AAGg,
    0, [() => exports.AgentActionGroup$,
        0]
];
var AgentTraces = [1, n0, _AT,
    0, [() => exports.TracePart$,
        0]
];
var ApiParameters = [1, n0, _APpi,
    0, () => exports.ApiParameter$
];
var BedrockSessionContentBlocks = [1, n0, _BSCB,
    0, [() => exports.BedrockSessionContentBlock$,
        0]
];
var CallerChain = [1, n0, _CCa,
    0, () => exports.Caller$
];
var Citations = [1, n0, _Ci,
    0, [() => exports.Citation$,
        0]
];
var CollaboratorConfigurations = [1, n0, _CCo,
    0, [() => exports.CollaboratorConfiguration$,
        0]
];
var Collaborators = [1, n0, _Col,
    0, [() => exports.Collaborator$,
        0]
];
var ContentBlocks = [1, n0, _CBo,
    0, [() => exports.ContentBlock$,
        0]
];
var ExternalSources = [1, n0, _ESx,
    0, [() => exports.ExternalSource$,
        0]
];
var FieldsForReranking = [1, n0, _FFRi,
    8, () => exports.FieldForReranking$
];
var Files = 64 | 0;
var FlowExecutionErrors = [1, n0, _FEEl,
    0, () => exports.FlowExecutionError$
];
var FlowExecutionEvents = [1, n0, _FEElo,
    0, [() => exports.FlowExecutionEvent$,
        0]
];
var FlowExecutionSummaries = [1, n0, _FESl,
    0, () => exports.FlowExecutionSummary$
];
var FlowInputFields = [1, n0, _FIFl,
    0, [() => exports.FlowInputField$,
        0]
];
var FlowInputs = [1, n0, _FIl,
    0, [() => exports.FlowInput$,
        0]
];
var FlowOutputFields = [1, n0, _FOFl,
    0, [() => exports.FlowOutputField$,
        0]
];
var FlowTraceConditions = [1, n0, _FTCl,
    0, [() => exports.FlowTraceCondition$,
        0]
];
var FlowTraceNodeInputExecutionChain = [1, n0, _FTNIEC,
    8, [() => exports.FlowTraceNodeInputExecutionChainItem$,
        0]
];
var FlowTraceNodeInputFields = [1, n0, _FTNIFl,
    0, [() => exports.FlowTraceNodeInputField$,
        0]
];
var FlowTraceNodeOutputFields = [1, n0, _FTNOFl,
    0, [() => exports.FlowTraceNodeOutputField$,
        0]
];
var FlowTraceNodeOutputNextList = [1, n0, _FTNONL,
    0, [() => exports.FlowTraceNodeOutputNext$,
        0]
];
var FunctionParameters = [1, n0, _FPun,
    0, () => exports.FunctionParameter$
];
var Functions = [1, n0, _Fu,
    0, [() => exports.FunctionDefinition$,
        0]
];
var GeneratedQueries = [1, n0, _GQe,
    0, [() => exports.GeneratedQuery$,
        0]
];
var GuardrailAssessmentList = [1, n0, _GAL,
    0, [() => exports.GuardrailAssessment$,
        0]
];
var GuardrailContentFilterList = [1, n0, _GCFL,
    8, [() => exports.GuardrailContentFilter$,
        0]
];
var GuardrailCustomWordList = [1, n0, _GCWL,
    8, [() => exports.GuardrailCustomWord$,
        0]
];
var GuardrailManagedWordList = [1, n0, _GMWL,
    8, [() => exports.GuardrailManagedWord$,
        0]
];
var GuardrailPiiEntityFilterList = [1, n0, _GPEFL,
    8, [() => exports.GuardrailPiiEntityFilter$,
        0]
];
var GuardrailRegexFilterList = [1, n0, _GRFL,
    8, [() => exports.GuardrailRegexFilter$,
        0]
];
var GuardrailTopicList = [1, n0, _GTL,
    8, [() => exports.GuardrailTopic$,
        0]
];
var ImageInputs = [1, n0, _IIm,
    0, () => exports.ImageInput$
];
var InputFiles = [1, n0, _IFn,
    0, [() => exports.InputFile$,
        0]
];
var InvocationInputs = [1, n0, _IInvo,
    0, [() => exports.InvocationInputMember$,
        0]
];
var InvocationStepSummaries = [1, n0, _ISSnv,
    0, () => exports.InvocationStepSummary$
];
var InvocationSummaries = [1, n0, _ISnv,
    0, () => exports.InvocationSummary$
];
var KnowledgeBaseConfigurations = [1, n0, _KBCn,
    0, [() => exports.KnowledgeBaseConfiguration$,
        0]
];
var KnowledgeBaseRetrievalResults = [1, n0, _KBRRn,
    8, [() => exports.KnowledgeBaseRetrievalResult$,
        0]
];
var KnowledgeBases = [1, n0, _KBn,
    0, [() => exports.KnowledgeBase$,
        0]
];
var Memories = [1, n0, _Mem,
    0, () => exports.Memory$
];
var Messages = [1, n0, _Mes,
    0, [() => exports.Message$,
        0]
];
var MetadataAttributeSchemaList = [1, n0, _MASL,
    0, [() => exports.MetadataAttributeSchema$,
        0]
];
var NodeInputExecutionChain = [1, n0, _NIEC,
    0, () => exports.NodeInputExecutionChainItem$
];
var NodeInputFields = [1, n0, _NIFo,
    0, [() => exports.NodeInputField$,
        0]
];
var NodeOutputFields = [1, n0, _NOFo,
    0, [() => exports.NodeOutputField$,
        0]
];
var NodeOutputNextList = [1, n0, _NONL,
    0, [() => exports.NodeOutputNext$,
        0]
];
var OutputFiles = [1, n0, _OFu,
    0, [() => exports.OutputFile$,
        0]
];
var ParameterList = [1, n0, _PL,
    0, () => exports.Parameter$
];
var _Parameters = [1, n0, _Par,
    0, () => exports.Parameter$
];
var PromptConfigurations = [1, n0, _PCro,
    0, [() => exports.PromptConfiguration$,
        0]
];
var RAGStopSequences = 64 | 0;
var RerankQueriesList = [1, n0, _RQL,
    8, [() => exports.RerankQuery$,
        0]
];
var RerankResultsList = [1, n0, _RRLe,
    0, [() => exports.RerankResult$,
        0]
];
var RerankSourcesList = [1, n0, _RSL,
    8, [() => exports.RerankSource$,
        0]
];
var RetrievalFilterList = [1, n0, _RFL,
    0, [() => exports.RetrievalFilter$,
        0]
];
var RetrievalResultContentRow = [1, n0, _RRCR,
    8, [() => exports.RetrievalResultContentColumn$,
        0]
];
var RetrievedReferences = [1, n0, _RRetrie,
    0, [() => exports.RetrievedReference$,
        0]
];
var ReturnControlInvocationResults = [1, n0, _RCIR,
    0, [() => exports.InvocationResultMember$,
        0]
];
var SatisfiedConditions = [1, n0, _SCa,
    0, [() => exports.SatisfiedCondition$,
        0]
];
var SessionSummaries = [1, n0, _SSes,
    0, () => exports.SessionSummary$
];
var StopSequences = 64 | 0;
var TagKeyList = 64 | 0;
var ActionGroupSignatureParams = 128 | 0;
var AdditionalModelRequestFields = 128 | 15;
var ApiContentMap = [2, n0, _ACM,
    0, 0, () => exports.PropertyParameters$
];
var ContentMap = [2, n0, _CM,
    0, 0, () => _Parameters
];
var ParameterMap = [2, n0, _PM,
    0, 0, () => exports.ParameterDetail$
];
var PromptSessionAttributesMap = 128 | 0;
var ResponseBody = [2, n0, _RBe,
    0, 0, () => exports.ContentBody$
];
var RetrievalResultMetadata = [2, n0, _RRM,
    8, 0, 15
];
var SessionAttributesMap = 128 | 0;
var SessionMetadataMap = 128 | 0;
var TagsMap = 128 | 0;
exports.ActionGroupExecutor$ = [4, n0, _AGE,
    0,
    [_lam, _cCu],
    [0, 0]
];
exports.APISchema$ = [4, n0, _APIS,
    0,
    [_s_, _pa],
    [() => exports.S3Identifier$, [() => Payload, 0]]
];
exports.BedrockSessionContentBlock$ = [4, n0, _BSCBe,
    8,
    [_t, _ima],
    [0, () => exports.ImageBlock$]
];
exports.Caller$ = [4, n0, _Ca,
    0,
    [_aAA],
    [0]
];
exports.ContentBlock$ = [4, n0, _CBon,
    8,
    [_t],
    [0]
];
exports.FlowExecutionContent$ = [4, n0, _FEC,
    8,
    [_do],
    [15]
];
exports.FlowExecutionEvent$ = [4, n0, _FEElow,
    0,
    [_fIE, _fOE, _nIE, _nOE, _cRE, _nFE, _fFE, _nAE, _nDE],
    [[() => exports.FlowExecutionInputEvent$, 0], [() => exports.FlowExecutionOutputEvent$, 0], [() => exports.NodeInputEvent$, 0], [() => exports.NodeOutputEvent$, 0], [() => exports.ConditionResultEvent$, 0], [() => exports.NodeFailureEvent$, 0], [() => exports.FlowFailureEvent$, 0], [() => exports.NodeActionEvent$, 0], [() => exports.NodeDependencyEvent$, 0]]
];
exports.FlowInputContent$ = [4, n0, _FIC,
    8,
    [_do],
    [15]
];
exports.FlowMultiTurnInputContent$ = [4, n0, _FMTIC,
    0,
    [_do],
    [15]
];
exports.FlowOutputContent$ = [4, n0, _FOC,
    0,
    [_do],
    [15]
];
exports.FlowResponseStream$ = [4, n0, _FRSl,
    { [_stre]: 1 },
    [_fOE, _fCE, _fTE, _iSE, _vE, _rNFE, _sQEE, _tEh, _aDE, _cE, _dFE, _bGE, _fMTIRE],
    [[() => exports.FlowOutputEvent$, 0], [() => exports.FlowCompletionEvent$, 0], [() => exports.FlowTraceEvent$, 0], [() => exports.InternalServerException$, 0], [() => exports.ValidationException$, 0], [() => exports.ResourceNotFoundException$, 0], [() => exports.ServiceQuotaExceededException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.AccessDeniedException$, 0], [() => exports.ConflictException$, 0], [() => exports.DependencyFailedException$, 0], [() => exports.BadGatewayException$, 0], [() => exports.FlowMultiTurnInputRequestEvent$, 0]]
];
exports.FlowTrace$ = [4, n0, _FTl,
    8,
    [_nIT, _nOT, _cNRT, _nAT, _nDT],
    [[() => exports.FlowTraceNodeInputEvent$, 0], [() => exports.FlowTraceNodeOutputEvent$, 0], [() => exports.FlowTraceConditionNodeResultEvent$, 0], [() => exports.FlowTraceNodeActionEvent$, 0], [() => exports.FlowTraceDependencyEvent$, 0]]
];
exports.FlowTraceNodeInputContent$ = [4, n0, _FTNIC,
    8,
    [_do],
    [15]
];
exports.FlowTraceNodeOutputContent$ = [4, n0, _FTNOC,
    0,
    [_do],
    [15]
];
exports.FunctionSchema$ = [4, n0, _FSu,
    0,
    [_fu],
    [[() => Functions, 0]]
];
exports.ImageInputSource$ = [4, n0, _IIS,
    0,
    [_by],
    [21]
];
exports.ImageSource$ = [4, n0, _ISm,
    0,
    [_by, _sL],
    [21, () => exports.S3Location$]
];
exports.InlineAgentResponseStream$ = [4, n0, _IARS,
    { [_stre]: 1 },
    [_ch, _tra, _rCet, _iSE, _vE, _rNFE, _sQEE, _tEh, _aDE, _cE, _dFE, _bGE, _fi],
    [[() => exports.InlineAgentPayloadPart$, 0], [() => exports.InlineAgentTracePart$, 0], [() => exports.InlineAgentReturnControlPayload$, 0], [() => exports.InternalServerException$, 0], [() => exports.ValidationException$, 0], [() => exports.ResourceNotFoundException$, 0], [() => exports.ServiceQuotaExceededException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.AccessDeniedException$, 0], [() => exports.ConflictException$, 0], [() => exports.DependencyFailedException$, 0], [() => exports.BadGatewayException$, 0], [() => exports.InlineAgentFilePart$, 0]]
];
exports.InputPrompt$ = [4, n0, _IP,
    0,
    [_tPe],
    [[() => exports.TextPrompt$, 0]]
];
exports.InvocationInputMember$ = [4, n0, _IIM,
    0,
    [_aII, _fII],
    [[() => exports.ApiInvocationInput$, 0], [() => exports.FunctionInvocationInput$, 0]]
];
exports.InvocationResultMember$ = [4, n0, _IRM,
    0,
    [_aR, _fRu],
    [[() => exports.ApiResult$, 0], () => exports.FunctionResult$]
];
exports.InvocationStepPayload$ = [4, n0, _ISP,
    0,
    [_cB],
    [[() => BedrockSessionContentBlocks, 0]]
];
exports.Memory$ = [4, n0, _Memo,
    0,
    [_sSess],
    [() => exports.MemorySessionSummary$]
];
exports.NodeExecutionContent$ = [4, n0, _NEC,
    8,
    [_do],
    [15]
];
exports.NodeTraceElements$ = [4, n0, _NTE,
    8,
    [_aT],
    [[() => AgentTraces, 0]]
];
exports.OptimizedPrompt$ = [4, n0, _OP,
    0,
    [_tPe],
    [[() => exports.TextPrompt$, 0]]
];
exports.OptimizedPromptStream$ = [4, n0, _OPS,
    { [_stre]: 1 },
    [_oPE, _aPE, _iSE, _tEh, _vE, _dFE, _aDE, _bGE],
    [[() => exports.OptimizedPromptEvent$, 0], [() => exports.AnalyzePromptEvent$, 0], [() => exports.InternalServerException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ValidationException$, 0], [() => exports.DependencyFailedException$, 0], [() => exports.AccessDeniedException$, 0], [() => exports.BadGatewayException$, 0]]
];
exports.OrchestrationExecutor$ = [4, n0, _OE,
    0,
    [_lam],
    [0]
];
exports.OrchestrationTrace$ = [4, n0, _OT,
    8,
    [_ra, _iInvo, _ob, _mII, _mIO],
    [[() => exports.Rationale$, 0], [() => exports.InvocationInput$, 0], [() => exports.Observation$, 0], [() => exports.ModelInvocationInput$, 0], [() => exports.OrchestrationModelInvocationOutput$, 0]]
];
exports.PostProcessingTrace$ = [4, n0, _PPT,
    8,
    [_mII, _mIO],
    [[() => exports.ModelInvocationInput$, 0], [() => exports.PostProcessingModelInvocationOutput$, 0]]
];
exports.PreProcessingTrace$ = [4, n0, _PPTr,
    8,
    [_mII, _mIO],
    [[() => exports.ModelInvocationInput$, 0], [() => exports.PreProcessingModelInvocationOutput$, 0]]
];
exports.ReasoningContentBlock$ = [4, n0, _RCB,
    8,
    [_rT, _rCed],
    [[() => exports.ReasoningTextBlock$, 0], 21]
];
exports.RerankingMetadataSelectiveModeConfiguration$ = [4, n0, _RMSMC,
    0,
    [_fTI, _fTEi],
    [[() => FieldsForReranking, 0], [() => FieldsForReranking, 0]]
];
exports.ResponseStream$ = [4, n0, _RSes,
    { [_stre]: 1 },
    [_ch, _tra, _rCet, _iSE, _vE, _rNFE, _sQEE, _tEh, _aDE, _cE, _dFE, _bGE, _mNRE, _fi],
    [[() => exports.PayloadPart$, 0], [() => exports.TracePart$, 0], [() => exports.ReturnControlPayload$, 0], [() => exports.InternalServerException$, 0], [() => exports.ValidationException$, 0], [() => exports.ResourceNotFoundException$, 0], [() => exports.ServiceQuotaExceededException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.AccessDeniedException$, 0], [() => exports.ConflictException$, 0], [() => exports.DependencyFailedException$, 0], [() => exports.BadGatewayException$, 0], [() => exports.ModelNotReadyException$, 0], [() => exports.FilePart$, 0]]
];
exports.RetrievalFilter$ = [4, n0, _RF,
    8,
    [_eq, _nE, _gT, _gTOE, _lT, _lTOE, _in_, _nI, _sW, _lC, _sCtr, _aA, _oAr],
    [() => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, () => exports.FilterAttribute$, [() => RetrievalFilterList, 0], [() => RetrievalFilterList, 0]]
];
exports.RetrieveAndGenerateStreamResponseOutput$ = [4, n0, _RAGSRO,
    { [_stre]: 1 },
    [_o, _cit, _g, _iSE, _vE, _rNFE, _sQEE, _tEh, _aDE, _cE, _dFE, _bGE],
    [[() => exports.RetrieveAndGenerateOutputEvent$, 0], [() => exports.CitationEvent$, 0], () => exports.GuardrailEvent$, [() => exports.InternalServerException$, 0], [() => exports.ValidationException$, 0], [() => exports.ResourceNotFoundException$, 0], [() => exports.ServiceQuotaExceededException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.AccessDeniedException$, 0], [() => exports.ConflictException$, 0], [() => exports.DependencyFailedException$, 0], [() => exports.BadGatewayException$, 0]]
];
exports.RoutingClassifierTrace$ = [4, n0, _RCT,
    8,
    [_iInvo, _ob, _mII, _mIO],
    [[() => exports.InvocationInput$, 0], [() => exports.Observation$, 0], [() => exports.ModelInvocationInput$, 0], [() => exports.RoutingClassifierModelInvocationOutput$, 0]]
];
exports.Trace$ = [4, n0, _T,
    8,
    [_gTu, _pPT, _oTr, _pPTo, _rCT, _fT, _cOT],
    [[() => exports.GuardrailTrace$, 0], [() => exports.PreProcessingTrace$, 0], [() => exports.OrchestrationTrace$, 0], [() => exports.PostProcessingTrace$, 0], [() => exports.RoutingClassifierTrace$, 0], [() => exports.FailureTrace$, 0], [() => exports.CustomOrchestrationTrace$, 0]]
];
exports.TraceElements$ = [4, n0, _TEr,
    8,
    [_aT],
    [[() => AgentTraces, 0]]
];
exports.CreateInvocation$ = [9, n0, _CIr,
    { [_h]: ["PUT", "/sessions/{sessionIdentifier}/invocations/", 201] }, () => exports.CreateInvocationRequest$, () => exports.CreateInvocationResponse$
];
exports.CreateSession$ = [9, n0, _CS,
    { [_h]: ["PUT", "/sessions/", 201] }, () => exports.CreateSessionRequest$, () => exports.CreateSessionResponse$
];
exports.DeleteAgentMemory$ = [9, n0, _DAM,
    { [_h]: ["DELETE", "/agents/{agentId}/agentAliases/{agentAliasId}/memories", 202] }, () => exports.DeleteAgentMemoryRequest$, () => exports.DeleteAgentMemoryResponse$
];
exports.DeleteSession$ = [9, n0, _DS,
    { [_h]: ["DELETE", "/sessions/{sessionIdentifier}/", 200] }, () => exports.DeleteSessionRequest$, () => exports.DeleteSessionResponse$
];
exports.EndSession$ = [9, n0, _ESn,
    { [_h]: ["PATCH", "/sessions/{sessionIdentifier}", 200] }, () => exports.EndSessionRequest$, () => exports.EndSessionResponse$
];
exports.GenerateQuery$ = [9, n0, _GQen,
    { [_h]: ["POST", "/generateQuery", 200] }, () => exports.GenerateQueryRequest$, () => exports.GenerateQueryResponse$
];
exports.GetAgentMemory$ = [9, n0, _GAM,
    { [_h]: ["GET", "/agents/{agentId}/agentAliases/{agentAliasId}/memories", 200] }, () => exports.GetAgentMemoryRequest$, () => exports.GetAgentMemoryResponse$
];
exports.GetExecutionFlowSnapshot$ = [9, n0, _GEFS,
    { [_h]: ["GET", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}/executions/{executionIdentifier}/flowsnapshot", 200] }, () => exports.GetExecutionFlowSnapshotRequest$, () => exports.GetExecutionFlowSnapshotResponse$
];
exports.GetFlowExecution$ = [9, n0, _GFE,
    { [_h]: ["GET", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}/executions/{executionIdentifier}", 200] }, () => exports.GetFlowExecutionRequest$, () => exports.GetFlowExecutionResponse$
];
exports.GetInvocationStep$ = [9, n0, _GIS,
    { [_h]: ["POST", "/sessions/{sessionIdentifier}/invocationSteps/{invocationStepId}", 200] }, () => exports.GetInvocationStepRequest$, () => exports.GetInvocationStepResponse$
];
exports.GetSession$ = [9, n0, _GS,
    { [_h]: ["GET", "/sessions/{sessionIdentifier}/", 200] }, () => exports.GetSessionRequest$, () => exports.GetSessionResponse$
];
exports.InvokeAgent$ = [9, n0, _IA,
    { [_h]: ["POST", "/agents/{agentId}/agentAliases/{agentAliasId}/sessions/{sessionId}/text", 200] }, () => exports.InvokeAgentRequest$, () => exports.InvokeAgentResponse$
];
exports.InvokeFlow$ = [9, n0, _IFnv,
    { [_h]: ["POST", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}", 200] }, () => exports.InvokeFlowRequest$, () => exports.InvokeFlowResponse$
];
exports.InvokeInlineAgent$ = [9, n0, _IIA,
    { [_h]: ["POST", "/agents/{sessionId}", 200] }, () => exports.InvokeInlineAgentRequest$, () => exports.InvokeInlineAgentResponse$
];
exports.ListFlowExecutionEvents$ = [9, n0, _LFEE,
    { [_h]: ["GET", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}/executions/{executionIdentifier}/events", 200] }, () => exports.ListFlowExecutionEventsRequest$, () => exports.ListFlowExecutionEventsResponse$
];
exports.ListFlowExecutions$ = [9, n0, _LFE,
    { [_h]: ["GET", "/flows/{flowIdentifier}/executions", 200] }, () => exports.ListFlowExecutionsRequest$, () => exports.ListFlowExecutionsResponse$
];
exports.ListInvocations$ = [9, n0, _LI,
    { [_h]: ["POST", "/sessions/{sessionIdentifier}/invocations/", 200] }, () => exports.ListInvocationsRequest$, () => exports.ListInvocationsResponse$
];
exports.ListInvocationSteps$ = [9, n0, _LIS,
    { [_h]: ["POST", "/sessions/{sessionIdentifier}/invocationSteps/", 200] }, () => exports.ListInvocationStepsRequest$, () => exports.ListInvocationStepsResponse$
];
exports.ListSessions$ = [9, n0, _LS,
    { [_h]: ["POST", "/sessions/", 200] }, () => exports.ListSessionsRequest$, () => exports.ListSessionsResponse$
];
exports.ListTagsForResource$ = [9, n0, _LTFR,
    { [_h]: ["GET", "/tags/{resourceArn}", 200] }, () => exports.ListTagsForResourceRequest$, () => exports.ListTagsForResourceResponse$
];
exports.OptimizePrompt$ = [9, n0, _OPp,
    { [_h]: ["POST", "/optimize-prompt", 200] }, () => exports.OptimizePromptRequest$, () => exports.OptimizePromptResponse$
];
exports.PutInvocationStep$ = [9, n0, _PIS,
    { [_h]: ["PUT", "/sessions/{sessionIdentifier}/invocationSteps/", 201] }, () => exports.PutInvocationStepRequest$, () => exports.PutInvocationStepResponse$
];
exports.Rerank$ = [9, n0, _Re,
    { [_h]: ["POST", "/rerank", 200] }, () => exports.RerankRequest$, () => exports.RerankResponse$
];
exports.Retrieve$ = [9, n0, _Ret,
    { [_h]: ["POST", "/knowledgebases/{knowledgeBaseId}/retrieve", 200] }, () => exports.RetrieveRequest$, () => exports.RetrieveResponse$
];
exports.RetrieveAndGenerate$ = [9, n0, _RAG,
    { [_h]: ["POST", "/retrieveAndGenerate", 200] }, () => exports.RetrieveAndGenerateRequest$, () => exports.RetrieveAndGenerateResponse$
];
exports.RetrieveAndGenerateStream$ = [9, n0, _RAGS,
    { [_h]: ["POST", "/retrieveAndGenerateStream", 200] }, () => exports.RetrieveAndGenerateStreamRequest$, () => exports.RetrieveAndGenerateStreamResponse$
];
exports.StartFlowExecution$ = [9, n0, _SFE,
    { [_h]: ["POST", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}/executions", 200] }, () => exports.StartFlowExecutionRequest$, () => exports.StartFlowExecutionResponse$
];
exports.StopFlowExecution$ = [9, n0, _SFEt,
    { [_h]: ["POST", "/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}/executions/{executionIdentifier}/stop", 200] }, () => exports.StopFlowExecutionRequest$, () => exports.StopFlowExecutionResponse$
];
exports.TagResource$ = [9, n0, _TR,
    { [_h]: ["POST", "/tags/{resourceArn}", 200] }, () => exports.TagResourceRequest$, () => exports.TagResourceResponse$
];
exports.UntagResource$ = [9, n0, _UR,
    { [_h]: ["DELETE", "/tags/{resourceArn}", 200] }, () => exports.UntagResourceRequest$, () => exports.UntagResourceResponse$
];
exports.UpdateSession$ = [9, n0, _US,
    { [_h]: ["PUT", "/sessions/{sessionIdentifier}/", 200] }, () => exports.UpdateSessionRequest$, () => exports.UpdateSessionResponse$
];
