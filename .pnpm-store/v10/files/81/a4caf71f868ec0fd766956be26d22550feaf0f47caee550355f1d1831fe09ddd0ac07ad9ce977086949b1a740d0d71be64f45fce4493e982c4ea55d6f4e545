import { DocumentType as __DocumentType } from "@smithy/types";
import {
  ActionGroupSignature,
  ActionInvocationType,
  AgentCollaboration,
  AttributeType,
  ConfirmationState,
  ConversationRole,
  CreationMode,
  CustomControlMethod,
  ExecutionType,
  ExternalSourceType,
  FileSourceType,
  FileUseCase,
  FlowCompletionReason,
  FlowControlNodeType,
  FlowErrorCode,
  FlowExecutionErrorType,
  FlowExecutionEventType,
  FlowExecutionStatus,
  FlowNodeInputCategory,
  FlowNodeIODataType,
  GeneratedQueryType,
  GuadrailAction,
  GuardrailAction,
  GuardrailContentFilterConfidence,
  GuardrailContentFilterType,
  GuardrailContentPolicyAction,
  GuardrailManagedWordType,
  GuardrailPiiEntityType,
  GuardrailSensitiveInformationPolicyAction,
  GuardrailTopicPolicyAction,
  GuardrailTopicType,
  GuardrailWordPolicyAction,
  ImageFormat,
  ImageInputFormat,
  InputImageFormat,
  InputQueryType,
  InvocationType,
  KnowledgeBaseQueryType,
  MemoryType,
  NodeErrorCode,
  NodeType,
  ParameterType,
  PayloadType,
  PerformanceConfigLatency,
  PromptState,
  PromptType,
  QueryTransformationMode,
  QueryTransformationType,
  RelayConversationHistory,
  RequireConfirmation,
  RerankDocumentType,
  RerankingConfigurationType,
  RerankingMetadataSelectionMode,
  RerankQueryContentType,
  RerankSourceType,
  ResponseState,
  RetrievalResultContentColumnType,
  RetrievalResultContentType,
  RetrievalResultLocationType,
  RetrieveAndGenerateType,
  SearchType,
  SessionStatus,
  Source,
  TextToSqlConfigurationType,
  Type,
  VectorSearchRerankingConfigurationType,
} from "./enums";
import {
  AccessDeniedException,
  BadGatewayException,
  ConflictException,
  DependencyFailedException,
  InternalServerException,
  ModelNotReadyException,
  ResourceNotFoundException,
  ServiceQuotaExceededException,
  ThrottlingException,
  ValidationException,
} from "./errors";
export type ActionGroupExecutor =
  | ActionGroupExecutor.CustomControlMember
  | ActionGroupExecutor.LambdaMember
  | ActionGroupExecutor.$UnknownMember;
export declare namespace ActionGroupExecutor {
  interface LambdaMember {
    lambda: string;
    customControl?: never;
    $unknown?: never;
  }
  interface CustomControlMember {
    lambda?: never;
    customControl: CustomControlMethod;
    $unknown?: never;
  }
  interface $UnknownMember {
    lambda?: never;
    customControl?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    lambda: (value: string) => T;
    customControl: (value: CustomControlMethod) => T;
    _: (name: string, value: any) => T;
  }
}
export interface Parameter {
  name?: string | undefined;
  type?: string | undefined;
  value?: string | undefined;
}
export interface RequestBody {
  content?: Record<string, Parameter[]> | undefined;
}
export interface ActionGroupInvocationInput {
  actionGroupName?: string | undefined;
  verb?: string | undefined;
  apiPath?: string | undefined;
  parameters?: Parameter[] | undefined;
  requestBody?: RequestBody | undefined;
  function?: string | undefined;
  executionType?: ExecutionType | undefined;
  invocationId?: string | undefined;
}
export interface Usage {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}
export interface Metadata {
  startTime?: Date | undefined;
  endTime?: Date | undefined;
  totalTimeMs?: number | undefined;
  operationTotalTimeMs?: number | undefined;
  clientRequestId?: string | undefined;
  usage?: Usage | undefined;
}
export interface ActionGroupInvocationOutput {
  text?: string | undefined;
  metadata?: Metadata | undefined;
}
export interface S3Identifier {
  s3BucketName?: string | undefined;
  s3ObjectKey?: string | undefined;
}
export type APISchema =
  | APISchema.PayloadMember
  | APISchema.S3Member
  | APISchema.$UnknownMember;
export declare namespace APISchema {
  interface S3Member {
    s3: S3Identifier;
    payload?: never;
    $unknown?: never;
  }
  interface PayloadMember {
    s3?: never;
    payload: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    s3?: never;
    payload?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    s3: (value: S3Identifier) => T;
    payload: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ParameterDetail {
  description?: string | undefined;
  type: ParameterType | undefined;
  required?: boolean | undefined;
}
export interface FunctionDefinition {
  name: string | undefined;
  description?: string | undefined;
  parameters?: Record<string, ParameterDetail> | undefined;
  requireConfirmation?: RequireConfirmation | undefined;
}
export type FunctionSchema =
  | FunctionSchema.FunctionsMember
  | FunctionSchema.$UnknownMember;
export declare namespace FunctionSchema {
  interface FunctionsMember {
    functions: FunctionDefinition[];
    $unknown?: never;
  }
  interface $UnknownMember {
    functions?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    functions: (value: FunctionDefinition[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface AgentActionGroup {
  actionGroupName: string | undefined;
  description?: string | undefined;
  parentActionGroupSignature?: ActionGroupSignature | undefined;
  actionGroupExecutor?: ActionGroupExecutor | undefined;
  apiSchema?: APISchema | undefined;
  functionSchema?: FunctionSchema | undefined;
  parentActionGroupSignatureParams?: Record<string, string> | undefined;
}
export type ImageInputSource =
  | ImageInputSource.BytesMember
  | ImageInputSource.$UnknownMember;
export declare namespace ImageInputSource {
  interface BytesMember {
    bytes: Uint8Array;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ImageInput {
  format: ImageInputFormat | undefined;
  source: ImageInputSource | undefined;
}
export interface ContentBody {
  body?: string | undefined;
  images?: ImageInput[] | undefined;
}
export interface ApiResult {
  actionGroup: string | undefined;
  httpMethod?: string | undefined;
  apiPath?: string | undefined;
  confirmationState?: ConfirmationState | undefined;
  responseState?: ResponseState | undefined;
  httpStatusCode?: number | undefined;
  responseBody?: Record<string, ContentBody> | undefined;
  agentId?: string | undefined;
}
export interface FunctionResult {
  actionGroup: string | undefined;
  confirmationState?: ConfirmationState | undefined;
  function?: string | undefined;
  responseBody?: Record<string, ContentBody> | undefined;
  responseState?: ResponseState | undefined;
  agentId?: string | undefined;
}
export type InvocationResultMember =
  | InvocationResultMember.ApiResultMember
  | InvocationResultMember.FunctionResultMember
  | InvocationResultMember.$UnknownMember;
export declare namespace InvocationResultMember {
  interface ApiResultMember {
    apiResult: ApiResult;
    functionResult?: never;
    $unknown?: never;
  }
  interface FunctionResultMember {
    apiResult?: never;
    functionResult: FunctionResult;
    $unknown?: never;
  }
  interface $UnknownMember {
    apiResult?: never;
    functionResult?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    apiResult: (value: ApiResult) => T;
    functionResult: (value: FunctionResult) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ReturnControlResults {
  invocationId?: string | undefined;
  returnControlInvocationResults?: InvocationResultMember[] | undefined;
}
export interface AgentCollaboratorInputPayload {
  type?: PayloadType | undefined;
  text?: string | undefined;
  returnControlResults?: ReturnControlResults | undefined;
}
export interface AgentCollaboratorInvocationInput {
  agentCollaboratorName?: string | undefined;
  agentCollaboratorAliasArn?: string | undefined;
  input?: AgentCollaboratorInputPayload | undefined;
}
export interface ApiParameter {
  name?: string | undefined;
  type?: string | undefined;
  value?: string | undefined;
}
export interface PropertyParameters {
  properties?: Parameter[] | undefined;
}
export interface ApiRequestBody {
  content?: Record<string, PropertyParameters> | undefined;
}
export interface ApiInvocationInput {
  actionGroup: string | undefined;
  httpMethod?: string | undefined;
  apiPath?: string | undefined;
  parameters?: ApiParameter[] | undefined;
  requestBody?: ApiRequestBody | undefined;
  actionInvocationType?: ActionInvocationType | undefined;
  agentId?: string | undefined;
  collaboratorName?: string | undefined;
}
export interface FunctionParameter {
  name?: string | undefined;
  type?: string | undefined;
  value?: string | undefined;
}
export interface FunctionInvocationInput {
  actionGroup: string | undefined;
  parameters?: FunctionParameter[] | undefined;
  function?: string | undefined;
  actionInvocationType?: ActionInvocationType | undefined;
  agentId?: string | undefined;
  collaboratorName?: string | undefined;
}
export type InvocationInputMember =
  | InvocationInputMember.ApiInvocationInputMember
  | InvocationInputMember.FunctionInvocationInputMember
  | InvocationInputMember.$UnknownMember;
export declare namespace InvocationInputMember {
  interface ApiInvocationInputMember {
    apiInvocationInput: ApiInvocationInput;
    functionInvocationInput?: never;
    $unknown?: never;
  }
  interface FunctionInvocationInputMember {
    apiInvocationInput?: never;
    functionInvocationInput: FunctionInvocationInput;
    $unknown?: never;
  }
  interface $UnknownMember {
    apiInvocationInput?: never;
    functionInvocationInput?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    apiInvocationInput: (value: ApiInvocationInput) => T;
    functionInvocationInput: (value: FunctionInvocationInput) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ReturnControlPayload {
  invocationInputs?: InvocationInputMember[] | undefined;
  invocationId?: string | undefined;
}
export interface AgentCollaboratorOutputPayload {
  type?: PayloadType | undefined;
  text?: string | undefined;
  returnControlPayload?: ReturnControlPayload | undefined;
}
export interface AgentCollaboratorInvocationOutput {
  agentCollaboratorName?: string | undefined;
  agentCollaboratorAliasArn?: string | undefined;
  output?: AgentCollaboratorOutputPayload | undefined;
  metadata?: Metadata | undefined;
}
export type Caller = Caller.AgentAliasArnMember | Caller.$UnknownMember;
export declare namespace Caller {
  interface AgentAliasArnMember {
    agentAliasArn: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    agentAliasArn?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    agentAliasArn: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface CustomOrchestrationTraceEvent {
  text?: string | undefined;
}
export interface CustomOrchestrationTrace {
  traceId?: string | undefined;
  event?: CustomOrchestrationTraceEvent | undefined;
}
export interface FailureTrace {
  traceId?: string | undefined;
  failureReason?: string | undefined;
  failureCode?: number | undefined;
  metadata?: Metadata | undefined;
}
export interface GuardrailContentFilter {
  type?: GuardrailContentFilterType | undefined;
  confidence?: GuardrailContentFilterConfidence | undefined;
  action?: GuardrailContentPolicyAction | undefined;
}
export interface GuardrailContentPolicyAssessment {
  filters?: GuardrailContentFilter[] | undefined;
}
export interface GuardrailPiiEntityFilter {
  type?: GuardrailPiiEntityType | undefined;
  match?: string | undefined;
  action?: GuardrailSensitiveInformationPolicyAction | undefined;
}
export interface GuardrailRegexFilter {
  name?: string | undefined;
  regex?: string | undefined;
  match?: string | undefined;
  action?: GuardrailSensitiveInformationPolicyAction | undefined;
}
export interface GuardrailSensitiveInformationPolicyAssessment {
  piiEntities?: GuardrailPiiEntityFilter[] | undefined;
  regexes?: GuardrailRegexFilter[] | undefined;
}
export interface GuardrailTopic {
  name?: string | undefined;
  type?: GuardrailTopicType | undefined;
  action?: GuardrailTopicPolicyAction | undefined;
}
export interface GuardrailTopicPolicyAssessment {
  topics?: GuardrailTopic[] | undefined;
}
export interface GuardrailCustomWord {
  match?: string | undefined;
  action?: GuardrailWordPolicyAction | undefined;
}
export interface GuardrailManagedWord {
  match?: string | undefined;
  type?: GuardrailManagedWordType | undefined;
  action?: GuardrailWordPolicyAction | undefined;
}
export interface GuardrailWordPolicyAssessment {
  customWords?: GuardrailCustomWord[] | undefined;
  managedWordLists?: GuardrailManagedWord[] | undefined;
}
export interface GuardrailAssessment {
  topicPolicy?: GuardrailTopicPolicyAssessment | undefined;
  contentPolicy?: GuardrailContentPolicyAssessment | undefined;
  wordPolicy?: GuardrailWordPolicyAssessment | undefined;
  sensitiveInformationPolicy?:
    | GuardrailSensitiveInformationPolicyAssessment
    | undefined;
}
export interface GuardrailTrace {
  action?: GuardrailAction | undefined;
  traceId?: string | undefined;
  inputAssessments?: GuardrailAssessment[] | undefined;
  outputAssessments?: GuardrailAssessment[] | undefined;
  metadata?: Metadata | undefined;
}
export interface CodeInterpreterInvocationInput {
  code?: string | undefined;
  files?: string[] | undefined;
}
export interface KnowledgeBaseLookupInput {
  text?: string | undefined;
  knowledgeBaseId?: string | undefined;
}
export interface InvocationInput {
  traceId?: string | undefined;
  invocationType?: InvocationType | undefined;
  actionGroupInvocationInput?: ActionGroupInvocationInput | undefined;
  knowledgeBaseLookupInput?: KnowledgeBaseLookupInput | undefined;
  codeInterpreterInvocationInput?: CodeInterpreterInvocationInput | undefined;
  agentCollaboratorInvocationInput?:
    | AgentCollaboratorInvocationInput
    | undefined;
}
export interface InferenceConfiguration {
  temperature?: number | undefined;
  topP?: number | undefined;
  topK?: number | undefined;
  maximumLength?: number | undefined;
  stopSequences?: string[] | undefined;
}
export interface ModelInvocationInput {
  traceId?: string | undefined;
  text?: string | undefined;
  type?: PromptType | undefined;
  overrideLambda?: string | undefined;
  promptCreationMode?: CreationMode | undefined;
  inferenceConfiguration?: InferenceConfiguration | undefined;
  parserMode?: CreationMode | undefined;
  foundationModel?: string | undefined;
}
export interface RawResponse {
  content?: string | undefined;
}
export interface ReasoningTextBlock {
  text: string | undefined;
  signature?: string | undefined;
}
export type ReasoningContentBlock =
  | ReasoningContentBlock.ReasoningTextMember
  | ReasoningContentBlock.RedactedContentMember
  | ReasoningContentBlock.$UnknownMember;
export declare namespace ReasoningContentBlock {
  interface ReasoningTextMember {
    reasoningText: ReasoningTextBlock;
    redactedContent?: never;
    $unknown?: never;
  }
  interface RedactedContentMember {
    reasoningText?: never;
    redactedContent: Uint8Array;
    $unknown?: never;
  }
  interface $UnknownMember {
    reasoningText?: never;
    redactedContent?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    reasoningText: (value: ReasoningTextBlock) => T;
    redactedContent: (value: Uint8Array) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OrchestrationModelInvocationOutput {
  traceId?: string | undefined;
  rawResponse?: RawResponse | undefined;
  metadata?: Metadata | undefined;
  reasoningContent?: ReasoningContentBlock | undefined;
}
export interface CodeInterpreterInvocationOutput {
  executionOutput?: string | undefined;
  executionError?: string | undefined;
  files?: string[] | undefined;
  executionTimeout?: boolean | undefined;
  metadata?: Metadata | undefined;
}
export interface FinalResponse {
  text?: string | undefined;
  metadata?: Metadata | undefined;
}
export interface AudioSegment {
  s3Uri: string | undefined;
  transcription?: string | undefined;
}
export interface RetrievalResultContentColumn {
  columnName?: string | undefined;
  columnValue?: string | undefined;
  type?: RetrievalResultContentColumnType | undefined;
}
export interface VideoSegment {
  s3Uri: string | undefined;
  summary?: string | undefined;
}
export interface RetrievalResultContent {
  type?: RetrievalResultContentType | undefined;
  text?: string | undefined;
  byteContent?: string | undefined;
  video?: VideoSegment | undefined;
  audio?: AudioSegment | undefined;
  row?: RetrievalResultContentColumn[] | undefined;
}
export interface RetrievalResultConfluenceLocation {
  url?: string | undefined;
}
export interface RetrievalResultCustomDocumentLocation {
  id?: string | undefined;
}
export interface RetrievalResultKendraDocumentLocation {
  uri?: string | undefined;
}
export interface RetrievalResultS3Location {
  uri?: string | undefined;
}
export interface RetrievalResultSalesforceLocation {
  url?: string | undefined;
}
export interface RetrievalResultSharePointLocation {
  url?: string | undefined;
}
export interface RetrievalResultSqlLocation {
  query?: string | undefined;
}
export interface RetrievalResultWebLocation {
  url?: string | undefined;
}
export interface RetrievalResultLocation {
  type: RetrievalResultLocationType | undefined;
  s3Location?: RetrievalResultS3Location | undefined;
  webLocation?: RetrievalResultWebLocation | undefined;
  confluenceLocation?: RetrievalResultConfluenceLocation | undefined;
  salesforceLocation?: RetrievalResultSalesforceLocation | undefined;
  sharePointLocation?: RetrievalResultSharePointLocation | undefined;
  customDocumentLocation?: RetrievalResultCustomDocumentLocation | undefined;
  kendraDocumentLocation?: RetrievalResultKendraDocumentLocation | undefined;
  sqlLocation?: RetrievalResultSqlLocation | undefined;
}
export interface RetrievedReference {
  content?: RetrievalResultContent | undefined;
  location?: RetrievalResultLocation | undefined;
  metadata?: Record<string, __DocumentType> | undefined;
}
export interface KnowledgeBaseLookupOutput {
  retrievedReferences?: RetrievedReference[] | undefined;
  metadata?: Metadata | undefined;
}
export interface RepromptResponse {
  text?: string | undefined;
  source?: Source | undefined;
}
export interface Observation {
  traceId?: string | undefined;
  type?: Type | undefined;
  actionGroupInvocationOutput?: ActionGroupInvocationOutput | undefined;
  agentCollaboratorInvocationOutput?:
    | AgentCollaboratorInvocationOutput
    | undefined;
  knowledgeBaseLookupOutput?: KnowledgeBaseLookupOutput | undefined;
  finalResponse?: FinalResponse | undefined;
  repromptResponse?: RepromptResponse | undefined;
  codeInterpreterInvocationOutput?: CodeInterpreterInvocationOutput | undefined;
}
export interface Rationale {
  traceId?: string | undefined;
  text?: string | undefined;
}
export type OrchestrationTrace =
  | OrchestrationTrace.InvocationInputMember
  | OrchestrationTrace.ModelInvocationInputMember
  | OrchestrationTrace.ModelInvocationOutputMember
  | OrchestrationTrace.ObservationMember
  | OrchestrationTrace.RationaleMember
  | OrchestrationTrace.$UnknownMember;
export declare namespace OrchestrationTrace {
  interface RationaleMember {
    rationale: Rationale;
    invocationInput?: never;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface InvocationInputMember {
    rationale?: never;
    invocationInput: InvocationInput;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ObservationMember {
    rationale?: never;
    invocationInput?: never;
    observation: Observation;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationInputMember {
    rationale?: never;
    invocationInput?: never;
    observation?: never;
    modelInvocationInput: ModelInvocationInput;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationOutputMember {
    rationale?: never;
    invocationInput?: never;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput: OrchestrationModelInvocationOutput;
    $unknown?: never;
  }
  interface $UnknownMember {
    rationale?: never;
    invocationInput?: never;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    rationale: (value: Rationale) => T;
    invocationInput: (value: InvocationInput) => T;
    observation: (value: Observation) => T;
    modelInvocationInput: (value: ModelInvocationInput) => T;
    modelInvocationOutput: (value: OrchestrationModelInvocationOutput) => T;
    _: (name: string, value: any) => T;
  }
}
export interface PostProcessingParsedResponse {
  text?: string | undefined;
}
export interface PostProcessingModelInvocationOutput {
  traceId?: string | undefined;
  parsedResponse?: PostProcessingParsedResponse | undefined;
  rawResponse?: RawResponse | undefined;
  metadata?: Metadata | undefined;
  reasoningContent?: ReasoningContentBlock | undefined;
}
export type PostProcessingTrace =
  | PostProcessingTrace.ModelInvocationInputMember
  | PostProcessingTrace.ModelInvocationOutputMember
  | PostProcessingTrace.$UnknownMember;
export declare namespace PostProcessingTrace {
  interface ModelInvocationInputMember {
    modelInvocationInput: ModelInvocationInput;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationOutputMember {
    modelInvocationInput?: never;
    modelInvocationOutput: PostProcessingModelInvocationOutput;
    $unknown?: never;
  }
  interface $UnknownMember {
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    modelInvocationInput: (value: ModelInvocationInput) => T;
    modelInvocationOutput: (value: PostProcessingModelInvocationOutput) => T;
    _: (name: string, value: any) => T;
  }
}
export interface PreProcessingParsedResponse {
  rationale?: string | undefined;
  isValid?: boolean | undefined;
}
export interface PreProcessingModelInvocationOutput {
  traceId?: string | undefined;
  parsedResponse?: PreProcessingParsedResponse | undefined;
  rawResponse?: RawResponse | undefined;
  metadata?: Metadata | undefined;
  reasoningContent?: ReasoningContentBlock | undefined;
}
export type PreProcessingTrace =
  | PreProcessingTrace.ModelInvocationInputMember
  | PreProcessingTrace.ModelInvocationOutputMember
  | PreProcessingTrace.$UnknownMember;
export declare namespace PreProcessingTrace {
  interface ModelInvocationInputMember {
    modelInvocationInput: ModelInvocationInput;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationOutputMember {
    modelInvocationInput?: never;
    modelInvocationOutput: PreProcessingModelInvocationOutput;
    $unknown?: never;
  }
  interface $UnknownMember {
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    modelInvocationInput: (value: ModelInvocationInput) => T;
    modelInvocationOutput: (value: PreProcessingModelInvocationOutput) => T;
    _: (name: string, value: any) => T;
  }
}
export interface RoutingClassifierModelInvocationOutput {
  traceId?: string | undefined;
  rawResponse?: RawResponse | undefined;
  metadata?: Metadata | undefined;
}
export type RoutingClassifierTrace =
  | RoutingClassifierTrace.InvocationInputMember
  | RoutingClassifierTrace.ModelInvocationInputMember
  | RoutingClassifierTrace.ModelInvocationOutputMember
  | RoutingClassifierTrace.ObservationMember
  | RoutingClassifierTrace.$UnknownMember;
export declare namespace RoutingClassifierTrace {
  interface InvocationInputMember {
    invocationInput: InvocationInput;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ObservationMember {
    invocationInput?: never;
    observation: Observation;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationInputMember {
    invocationInput?: never;
    observation?: never;
    modelInvocationInput: ModelInvocationInput;
    modelInvocationOutput?: never;
    $unknown?: never;
  }
  interface ModelInvocationOutputMember {
    invocationInput?: never;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput: RoutingClassifierModelInvocationOutput;
    $unknown?: never;
  }
  interface $UnknownMember {
    invocationInput?: never;
    observation?: never;
    modelInvocationInput?: never;
    modelInvocationOutput?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    invocationInput: (value: InvocationInput) => T;
    observation: (value: Observation) => T;
    modelInvocationInput: (value: ModelInvocationInput) => T;
    modelInvocationOutput: (value: RoutingClassifierModelInvocationOutput) => T;
    _: (name: string, value: any) => T;
  }
}
export type Trace =
  | Trace.CustomOrchestrationTraceMember
  | Trace.FailureTraceMember
  | Trace.GuardrailTraceMember
  | Trace.OrchestrationTraceMember
  | Trace.PostProcessingTraceMember
  | Trace.PreProcessingTraceMember
  | Trace.RoutingClassifierTraceMember
  | Trace.$UnknownMember;
export declare namespace Trace {
  interface GuardrailTraceMember {
    guardrailTrace: GuardrailTrace;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface PreProcessingTraceMember {
    guardrailTrace?: never;
    preProcessingTrace: PreProcessingTrace;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface OrchestrationTraceMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace: OrchestrationTrace;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface PostProcessingTraceMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace: PostProcessingTrace;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface RoutingClassifierTraceMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace: RoutingClassifierTrace;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface FailureTraceMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace: FailureTrace;
    customOrchestrationTrace?: never;
    $unknown?: never;
  }
  interface CustomOrchestrationTraceMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace: CustomOrchestrationTrace;
    $unknown?: never;
  }
  interface $UnknownMember {
    guardrailTrace?: never;
    preProcessingTrace?: never;
    orchestrationTrace?: never;
    postProcessingTrace?: never;
    routingClassifierTrace?: never;
    failureTrace?: never;
    customOrchestrationTrace?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    guardrailTrace: (value: GuardrailTrace) => T;
    preProcessingTrace: (value: PreProcessingTrace) => T;
    orchestrationTrace: (value: OrchestrationTrace) => T;
    postProcessingTrace: (value: PostProcessingTrace) => T;
    routingClassifierTrace: (value: RoutingClassifierTrace) => T;
    failureTrace: (value: FailureTrace) => T;
    customOrchestrationTrace: (value: CustomOrchestrationTrace) => T;
    _: (name: string, value: any) => T;
  }
}
export interface TracePart {
  sessionId?: string | undefined;
  trace?: Trace | undefined;
  callerChain?: Caller[] | undefined;
  eventTime?: Date | undefined;
  collaboratorName?: string | undefined;
  agentId?: string | undefined;
  agentAliasId?: string | undefined;
  agentVersion?: string | undefined;
}
export interface GetExecutionFlowSnapshotRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  executionIdentifier: string | undefined;
}
export interface GetExecutionFlowSnapshotResponse {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  flowVersion: string | undefined;
  executionRoleArn: string | undefined;
  definition: string | undefined;
  customerEncryptionKeyArn?: string | undefined;
}
export interface GetFlowExecutionRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  executionIdentifier: string | undefined;
}
export interface FlowExecutionError {
  nodeName?: string | undefined;
  error?: FlowExecutionErrorType | undefined;
  message?: string | undefined;
}
export interface GetFlowExecutionResponse {
  executionArn: string | undefined;
  status: FlowExecutionStatus | undefined;
  startedAt: Date | undefined;
  endedAt?: Date | undefined;
  errors?: FlowExecutionError[] | undefined;
  flowAliasIdentifier: string | undefined;
  flowIdentifier: string | undefined;
  flowVersion: string | undefined;
}
export interface ListFlowExecutionEventsRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  executionIdentifier: string | undefined;
  maxResults?: number | undefined;
  nextToken?: string | undefined;
  eventType: FlowExecutionEventType | undefined;
}
export interface SatisfiedCondition {
  conditionName: string | undefined;
}
export interface ConditionResultEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  satisfiedConditions: SatisfiedCondition[] | undefined;
}
export interface FlowFailureEvent {
  timestamp: Date | undefined;
  errorCode: FlowErrorCode | undefined;
  errorMessage: string | undefined;
}
export type FlowExecutionContent =
  | FlowExecutionContent.DocumentMember
  | FlowExecutionContent.$UnknownMember;
export declare namespace FlowExecutionContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowInputField {
  name: string | undefined;
  content: FlowExecutionContent | undefined;
}
export interface FlowExecutionInputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: FlowInputField[] | undefined;
}
export interface FlowOutputField {
  name: string | undefined;
  content: FlowExecutionContent | undefined;
}
export interface FlowExecutionOutputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: FlowOutputField[] | undefined;
}
export interface NodeActionEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  requestId: string | undefined;
  serviceName: string | undefined;
  operationName: string | undefined;
  operationRequest?: __DocumentType | undefined;
  operationResponse?: __DocumentType | undefined;
}
export type NodeTraceElements =
  | NodeTraceElements.AgentTracesMember
  | NodeTraceElements.$UnknownMember;
export declare namespace NodeTraceElements {
  interface AgentTracesMember {
    agentTraces: TracePart[];
    $unknown?: never;
  }
  interface $UnknownMember {
    agentTraces?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    agentTraces: (value: TracePart[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface NodeDependencyEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  traceElements: NodeTraceElements | undefined;
}
export interface NodeFailureEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  errorCode: NodeErrorCode | undefined;
  errorMessage: string | undefined;
}
export type NodeExecutionContent =
  | NodeExecutionContent.DocumentMember
  | NodeExecutionContent.$UnknownMember;
export declare namespace NodeExecutionContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface NodeInputExecutionChainItem {
  nodeName: string | undefined;
  index?: number | undefined;
  type: FlowControlNodeType | undefined;
}
export interface NodeInputSource {
  nodeName: string | undefined;
  outputFieldName: string | undefined;
  expression: string | undefined;
}
export interface NodeInputField {
  name: string | undefined;
  content: NodeExecutionContent | undefined;
  source?: NodeInputSource | undefined;
  type?: FlowNodeIODataType | undefined;
  category?: FlowNodeInputCategory | undefined;
  executionChain?: NodeInputExecutionChainItem[] | undefined;
}
export interface NodeInputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: NodeInputField[] | undefined;
}
export interface NodeOutputNext {
  nodeName: string | undefined;
  inputFieldName: string | undefined;
}
export interface NodeOutputField {
  name: string | undefined;
  content: NodeExecutionContent | undefined;
  next?: NodeOutputNext[] | undefined;
  type?: FlowNodeIODataType | undefined;
}
export interface NodeOutputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: NodeOutputField[] | undefined;
}
export type FlowExecutionEvent =
  | FlowExecutionEvent.ConditionResultEventMember
  | FlowExecutionEvent.FlowFailureEventMember
  | FlowExecutionEvent.FlowInputEventMember
  | FlowExecutionEvent.FlowOutputEventMember
  | FlowExecutionEvent.NodeActionEventMember
  | FlowExecutionEvent.NodeDependencyEventMember
  | FlowExecutionEvent.NodeFailureEventMember
  | FlowExecutionEvent.NodeInputEventMember
  | FlowExecutionEvent.NodeOutputEventMember
  | FlowExecutionEvent.$UnknownMember;
export declare namespace FlowExecutionEvent {
  interface FlowInputEventMember {
    flowInputEvent: FlowExecutionInputEvent;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface FlowOutputEventMember {
    flowInputEvent?: never;
    flowOutputEvent: FlowExecutionOutputEvent;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface NodeInputEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent: NodeInputEvent;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface NodeOutputEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent: NodeOutputEvent;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface ConditionResultEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent: ConditionResultEvent;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface NodeFailureEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent: NodeFailureEvent;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface FlowFailureEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent: FlowFailureEvent;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface NodeActionEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent: NodeActionEvent;
    nodeDependencyEvent?: never;
    $unknown?: never;
  }
  interface NodeDependencyEventMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent: NodeDependencyEvent;
    $unknown?: never;
  }
  interface $UnknownMember {
    flowInputEvent?: never;
    flowOutputEvent?: never;
    nodeInputEvent?: never;
    nodeOutputEvent?: never;
    conditionResultEvent?: never;
    nodeFailureEvent?: never;
    flowFailureEvent?: never;
    nodeActionEvent?: never;
    nodeDependencyEvent?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    flowInputEvent: (value: FlowExecutionInputEvent) => T;
    flowOutputEvent: (value: FlowExecutionOutputEvent) => T;
    nodeInputEvent: (value: NodeInputEvent) => T;
    nodeOutputEvent: (value: NodeOutputEvent) => T;
    conditionResultEvent: (value: ConditionResultEvent) => T;
    nodeFailureEvent: (value: NodeFailureEvent) => T;
    flowFailureEvent: (value: FlowFailureEvent) => T;
    nodeActionEvent: (value: NodeActionEvent) => T;
    nodeDependencyEvent: (value: NodeDependencyEvent) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ListFlowExecutionEventsResponse {
  flowExecutionEvents: FlowExecutionEvent[] | undefined;
  nextToken?: string | undefined;
}
export interface ListFlowExecutionsRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier?: string | undefined;
  maxResults?: number | undefined;
  nextToken?: string | undefined;
}
export interface FlowExecutionSummary {
  executionArn: string | undefined;
  flowAliasIdentifier: string | undefined;
  flowIdentifier: string | undefined;
  flowVersion: string | undefined;
  status: FlowExecutionStatus | undefined;
  createdAt: Date | undefined;
  endedAt?: Date | undefined;
}
export interface ListFlowExecutionsResponse {
  flowExecutionSummaries: FlowExecutionSummary[] | undefined;
  nextToken?: string | undefined;
}
export type FlowInputContent =
  | FlowInputContent.DocumentMember
  | FlowInputContent.$UnknownMember;
export declare namespace FlowInputContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowInput {
  nodeName: string | undefined;
  nodeOutputName?: string | undefined;
  content: FlowInputContent | undefined;
  nodeInputName?: string | undefined;
}
export interface PerformanceConfiguration {
  latency?: PerformanceConfigLatency | undefined;
}
export interface ModelPerformanceConfiguration {
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface StartFlowExecutionRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  flowExecutionName?: string | undefined;
  inputs: FlowInput[] | undefined;
  modelPerformanceConfiguration?: ModelPerformanceConfiguration | undefined;
}
export interface StartFlowExecutionResponse {
  executionArn?: string | undefined;
}
export interface StopFlowExecutionRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  executionIdentifier: string | undefined;
}
export interface StopFlowExecutionResponse {
  executionArn?: string | undefined;
  status: FlowExecutionStatus | undefined;
}
export interface InvokeFlowRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  inputs: FlowInput[] | undefined;
  enableTrace?: boolean | undefined;
  modelPerformanceConfiguration?: ModelPerformanceConfiguration | undefined;
  executionId?: string | undefined;
}
export interface FlowCompletionEvent {
  completionReason: FlowCompletionReason | undefined;
}
export type FlowMultiTurnInputContent =
  | FlowMultiTurnInputContent.DocumentMember
  | FlowMultiTurnInputContent.$UnknownMember;
export declare namespace FlowMultiTurnInputContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowMultiTurnInputRequestEvent {
  nodeName: string | undefined;
  nodeType: NodeType | undefined;
  content: FlowMultiTurnInputContent | undefined;
}
export type FlowOutputContent =
  | FlowOutputContent.DocumentMember
  | FlowOutputContent.$UnknownMember;
export declare namespace FlowOutputContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowOutputEvent {
  nodeName: string | undefined;
  nodeType: NodeType | undefined;
  content: FlowOutputContent | undefined;
}
export interface FlowTraceCondition {
  conditionName: string | undefined;
}
export interface FlowTraceConditionNodeResultEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  satisfiedConditions: FlowTraceCondition[] | undefined;
}
export interface FlowTraceNodeActionEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  requestId: string | undefined;
  serviceName: string | undefined;
  operationName: string | undefined;
  operationRequest?: __DocumentType | undefined;
  operationResponse?: __DocumentType | undefined;
}
export type TraceElements =
  | TraceElements.AgentTracesMember
  | TraceElements.$UnknownMember;
export declare namespace TraceElements {
  interface AgentTracesMember {
    agentTraces: TracePart[];
    $unknown?: never;
  }
  interface $UnknownMember {
    agentTraces?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    agentTraces: (value: TracePart[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowTraceDependencyEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  traceElements: TraceElements | undefined;
}
export type FlowTraceNodeInputContent =
  | FlowTraceNodeInputContent.DocumentMember
  | FlowTraceNodeInputContent.$UnknownMember;
export declare namespace FlowTraceNodeInputContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowTraceNodeInputExecutionChainItem {
  nodeName: string | undefined;
  index?: number | undefined;
  type: FlowControlNodeType | undefined;
}
export interface FlowTraceNodeInputSource {
  nodeName: string | undefined;
  outputFieldName: string | undefined;
  expression: string | undefined;
}
export interface FlowTraceNodeInputField {
  nodeInputName: string | undefined;
  content: FlowTraceNodeInputContent | undefined;
  source?: FlowTraceNodeInputSource | undefined;
  type?: FlowNodeIODataType | undefined;
  category?: FlowNodeInputCategory | undefined;
  executionChain?: FlowTraceNodeInputExecutionChainItem[] | undefined;
}
export interface FlowTraceNodeInputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: FlowTraceNodeInputField[] | undefined;
}
export type FlowTraceNodeOutputContent =
  | FlowTraceNodeOutputContent.DocumentMember
  | FlowTraceNodeOutputContent.$UnknownMember;
export declare namespace FlowTraceNodeOutputContent {
  interface DocumentMember {
    document: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    document?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    document: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowTraceNodeOutputNext {
  nodeName: string | undefined;
  inputFieldName: string | undefined;
}
export interface FlowTraceNodeOutputField {
  nodeOutputName: string | undefined;
  content: FlowTraceNodeOutputContent | undefined;
  next?: FlowTraceNodeOutputNext[] | undefined;
  type?: FlowNodeIODataType | undefined;
}
export interface FlowTraceNodeOutputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: FlowTraceNodeOutputField[] | undefined;
}
export type FlowTrace =
  | FlowTrace.ConditionNodeResultTraceMember
  | FlowTrace.NodeActionTraceMember
  | FlowTrace.NodeDependencyTraceMember
  | FlowTrace.NodeInputTraceMember
  | FlowTrace.NodeOutputTraceMember
  | FlowTrace.$UnknownMember;
export declare namespace FlowTrace {
  interface NodeInputTraceMember {
    nodeInputTrace: FlowTraceNodeInputEvent;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    nodeDependencyTrace?: never;
    $unknown?: never;
  }
  interface NodeOutputTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace: FlowTraceNodeOutputEvent;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    nodeDependencyTrace?: never;
    $unknown?: never;
  }
  interface ConditionNodeResultTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace: FlowTraceConditionNodeResultEvent;
    nodeActionTrace?: never;
    nodeDependencyTrace?: never;
    $unknown?: never;
  }
  interface NodeActionTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace: FlowTraceNodeActionEvent;
    nodeDependencyTrace?: never;
    $unknown?: never;
  }
  interface NodeDependencyTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    nodeDependencyTrace: FlowTraceDependencyEvent;
    $unknown?: never;
  }
  interface $UnknownMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    nodeDependencyTrace?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    nodeInputTrace: (value: FlowTraceNodeInputEvent) => T;
    nodeOutputTrace: (value: FlowTraceNodeOutputEvent) => T;
    conditionNodeResultTrace: (value: FlowTraceConditionNodeResultEvent) => T;
    nodeActionTrace: (value: FlowTraceNodeActionEvent) => T;
    nodeDependencyTrace: (value: FlowTraceDependencyEvent) => T;
    _: (name: string, value: any) => T;
  }
}
export interface FlowTraceEvent {
  trace: FlowTrace | undefined;
}
export type FlowResponseStream =
  | FlowResponseStream.AccessDeniedExceptionMember
  | FlowResponseStream.BadGatewayExceptionMember
  | FlowResponseStream.ConflictExceptionMember
  | FlowResponseStream.DependencyFailedExceptionMember
  | FlowResponseStream.FlowCompletionEventMember
  | FlowResponseStream.FlowMultiTurnInputRequestEventMember
  | FlowResponseStream.FlowOutputEventMember
  | FlowResponseStream.FlowTraceEventMember
  | FlowResponseStream.InternalServerExceptionMember
  | FlowResponseStream.ResourceNotFoundExceptionMember
  | FlowResponseStream.ServiceQuotaExceededExceptionMember
  | FlowResponseStream.ThrottlingExceptionMember
  | FlowResponseStream.ValidationExceptionMember
  | FlowResponseStream.$UnknownMember;
export declare namespace FlowResponseStream {
  interface FlowOutputEventMember {
    flowOutputEvent: FlowOutputEvent;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface FlowCompletionEventMember {
    flowOutputEvent?: never;
    flowCompletionEvent: FlowCompletionEvent;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface FlowTraceEventMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent: FlowTraceEvent;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException: InternalServerException;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException: ValidationException;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface ResourceNotFoundExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException: ResourceNotFoundException;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface ServiceQuotaExceededExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException: ServiceQuotaExceededException;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException: ThrottlingException;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface AccessDeniedExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException: AccessDeniedException;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface ConflictExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException: ConflictException;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface DependencyFailedExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException: DependencyFailedException;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface BadGatewayExceptionMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException: BadGatewayException;
    flowMultiTurnInputRequestEvent?: never;
    $unknown?: never;
  }
  interface FlowMultiTurnInputRequestEventMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent: FlowMultiTurnInputRequestEvent;
    $unknown?: never;
  }
  interface $UnknownMember {
    flowOutputEvent?: never;
    flowCompletionEvent?: never;
    flowTraceEvent?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    flowMultiTurnInputRequestEvent?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    flowOutputEvent: (value: FlowOutputEvent) => T;
    flowCompletionEvent: (value: FlowCompletionEvent) => T;
    flowTraceEvent: (value: FlowTraceEvent) => T;
    internalServerException: (value: InternalServerException) => T;
    validationException: (value: ValidationException) => T;
    resourceNotFoundException: (value: ResourceNotFoundException) => T;
    serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
    throttlingException: (value: ThrottlingException) => T;
    accessDeniedException: (value: AccessDeniedException) => T;
    conflictException: (value: ConflictException) => T;
    dependencyFailedException: (value: DependencyFailedException) => T;
    badGatewayException: (value: BadGatewayException) => T;
    flowMultiTurnInputRequestEvent: (
      value: FlowMultiTurnInputRequestEvent
    ) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeFlowResponse {
  responseStream: AsyncIterable<FlowResponseStream> | undefined;
  executionId?: string | undefined;
}
export interface QueryGenerationInput {
  type: InputQueryType | undefined;
  text: string | undefined;
}
export interface TextToSqlKnowledgeBaseConfiguration {
  knowledgeBaseArn: string | undefined;
}
export interface TextToSqlConfiguration {
  type: TextToSqlConfigurationType | undefined;
  knowledgeBaseConfiguration?: TextToSqlKnowledgeBaseConfiguration | undefined;
}
export interface TransformationConfiguration {
  mode: QueryTransformationMode | undefined;
  textToSqlConfiguration?: TextToSqlConfiguration | undefined;
}
export interface GenerateQueryRequest {
  queryGenerationInput: QueryGenerationInput | undefined;
  transformationConfiguration: TransformationConfiguration | undefined;
}
export interface GeneratedQuery {
  type?: GeneratedQueryType | undefined;
  sql?: string | undefined;
}
export interface GenerateQueryResponse {
  queries?: GeneratedQuery[] | undefined;
}
export interface BedrockModelConfigurations {
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface PromptCreationConfigurations {
  previousConversationTurnsToInclude?: number | undefined;
  excludePreviousThinkingSteps?: boolean | undefined;
}
export type ContentBlock =
  | ContentBlock.TextMember
  | ContentBlock.$UnknownMember;
export declare namespace ContentBlock {
  interface TextMember {
    text: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface Message {
  role: ConversationRole | undefined;
  content: ContentBlock[] | undefined;
}
export interface ConversationHistory {
  messages?: Message[] | undefined;
}
export interface ByteContentFile {
  mediaType: string | undefined;
  data: Uint8Array | undefined;
}
export interface S3ObjectFile {
  uri: string | undefined;
}
export interface FileSource {
  sourceType: FileSourceType | undefined;
  s3Location?: S3ObjectFile | undefined;
  byteContent?: ByteContentFile | undefined;
}
export interface InputFile {
  name: string | undefined;
  source: FileSource | undefined;
  useCase: FileUseCase | undefined;
}
export interface FilterAttribute {
  key: string | undefined;
  value: __DocumentType | undefined;
}
export interface MetadataAttributeSchema {
  key: string | undefined;
  type: AttributeType | undefined;
  description: string | undefined;
}
export interface ImplicitFilterConfiguration {
  metadataAttributes: MetadataAttributeSchema[] | undefined;
  modelArn: string | undefined;
}
export interface FieldForReranking {
  fieldName: string | undefined;
}
export type RerankingMetadataSelectiveModeConfiguration =
  | RerankingMetadataSelectiveModeConfiguration.FieldsToExcludeMember
  | RerankingMetadataSelectiveModeConfiguration.FieldsToIncludeMember
  | RerankingMetadataSelectiveModeConfiguration.$UnknownMember;
export declare namespace RerankingMetadataSelectiveModeConfiguration {
  interface FieldsToIncludeMember {
    fieldsToInclude: FieldForReranking[];
    fieldsToExclude?: never;
    $unknown?: never;
  }
  interface FieldsToExcludeMember {
    fieldsToInclude?: never;
    fieldsToExclude: FieldForReranking[];
    $unknown?: never;
  }
  interface $UnknownMember {
    fieldsToInclude?: never;
    fieldsToExclude?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    fieldsToInclude: (value: FieldForReranking[]) => T;
    fieldsToExclude: (value: FieldForReranking[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface MetadataConfigurationForReranking {
  selectionMode: RerankingMetadataSelectionMode | undefined;
  selectiveModeConfiguration?:
    | RerankingMetadataSelectiveModeConfiguration
    | undefined;
}
export interface VectorSearchBedrockRerankingModelConfiguration {
  modelArn: string | undefined;
  additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
}
export interface VectorSearchBedrockRerankingConfiguration {
  modelConfiguration:
    | VectorSearchBedrockRerankingModelConfiguration
    | undefined;
  numberOfRerankedResults?: number | undefined;
  metadataConfiguration?: MetadataConfigurationForReranking | undefined;
}
export interface VectorSearchRerankingConfiguration {
  type: VectorSearchRerankingConfigurationType | undefined;
  bedrockRerankingConfiguration?:
    | VectorSearchBedrockRerankingConfiguration
    | undefined;
}
export interface StreamingConfigurations {
  streamFinalResponse?: boolean | undefined;
  applyGuardrailInterval?: number | undefined;
}
export interface Span {
  start?: number | undefined;
  end?: number | undefined;
}
export interface TextResponsePart {
  text?: string | undefined;
  span?: Span | undefined;
}
export interface GeneratedResponsePart {
  textResponsePart?: TextResponsePart | undefined;
}
export interface Citation {
  generatedResponsePart?: GeneratedResponsePart | undefined;
  retrievedReferences?: RetrievedReference[] | undefined;
}
export interface Attribution {
  citations?: Citation[] | undefined;
}
export interface PayloadPart {
  bytes?: Uint8Array | undefined;
  attribution?: Attribution | undefined;
}
export interface OutputFile {
  name?: string | undefined;
  type?: string | undefined;
  bytes?: Uint8Array | undefined;
}
export interface FilePart {
  files?: OutputFile[] | undefined;
}
export type ResponseStream =
  | ResponseStream.AccessDeniedExceptionMember
  | ResponseStream.BadGatewayExceptionMember
  | ResponseStream.ChunkMember
  | ResponseStream.ConflictExceptionMember
  | ResponseStream.DependencyFailedExceptionMember
  | ResponseStream.FilesMember
  | ResponseStream.InternalServerExceptionMember
  | ResponseStream.ModelNotReadyExceptionMember
  | ResponseStream.ResourceNotFoundExceptionMember
  | ResponseStream.ReturnControlMember
  | ResponseStream.ServiceQuotaExceededExceptionMember
  | ResponseStream.ThrottlingExceptionMember
  | ResponseStream.TraceMember
  | ResponseStream.ValidationExceptionMember
  | ResponseStream.$UnknownMember;
export declare namespace ResponseStream {
  interface ChunkMember {
    chunk: PayloadPart;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface TraceMember {
    chunk?: never;
    trace: TracePart;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ReturnControlMember {
    chunk?: never;
    trace?: never;
    returnControl: ReturnControlPayload;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException: InternalServerException;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException: ValidationException;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ResourceNotFoundExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException: ResourceNotFoundException;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ServiceQuotaExceededExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException: ServiceQuotaExceededException;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException: ThrottlingException;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface AccessDeniedExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException: AccessDeniedException;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ConflictExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException: ConflictException;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface DependencyFailedExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException: DependencyFailedException;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface BadGatewayExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException: BadGatewayException;
    modelNotReadyException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ModelNotReadyExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException: ModelNotReadyException;
    files?: never;
    $unknown?: never;
  }
  interface FilesMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files: FilePart;
    $unknown?: never;
  }
  interface $UnknownMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    modelNotReadyException?: never;
    files?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    chunk: (value: PayloadPart) => T;
    trace: (value: TracePart) => T;
    returnControl: (value: ReturnControlPayload) => T;
    internalServerException: (value: InternalServerException) => T;
    validationException: (value: ValidationException) => T;
    resourceNotFoundException: (value: ResourceNotFoundException) => T;
    serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
    throttlingException: (value: ThrottlingException) => T;
    accessDeniedException: (value: AccessDeniedException) => T;
    conflictException: (value: ConflictException) => T;
    dependencyFailedException: (value: DependencyFailedException) => T;
    badGatewayException: (value: BadGatewayException) => T;
    modelNotReadyException: (value: ModelNotReadyException) => T;
    files: (value: FilePart) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeAgentResponse {
  completion: AsyncIterable<ResponseStream> | undefined;
  contentType: string | undefined;
  sessionId: string | undefined;
  memoryId?: string | undefined;
}
export interface InlineBedrockModelConfigurations {
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface CollaboratorConfiguration {
  collaboratorName: string | undefined;
  collaboratorInstruction: string | undefined;
  agentAliasArn?: string | undefined;
  relayConversationHistory?: RelayConversationHistory | undefined;
}
export interface GuardrailConfigurationWithArn {
  guardrailIdentifier: string | undefined;
  guardrailVersion: string | undefined;
}
export interface PromptConfiguration {
  promptType?: PromptType | undefined;
  promptCreationMode?: CreationMode | undefined;
  promptState?: PromptState | undefined;
  basePromptTemplate?: string | undefined;
  inferenceConfiguration?: InferenceConfiguration | undefined;
  parserMode?: CreationMode | undefined;
  foundationModel?: string | undefined;
  additionalModelRequestFields?: __DocumentType | undefined;
}
export interface PromptOverrideConfiguration {
  promptConfigurations: PromptConfiguration[] | undefined;
  overrideLambda?: string | undefined;
}
export type OrchestrationExecutor =
  | OrchestrationExecutor.LambdaMember
  | OrchestrationExecutor.$UnknownMember;
export declare namespace OrchestrationExecutor {
  interface LambdaMember {
    lambda: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    lambda?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    lambda: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface CustomOrchestration {
  executor?: OrchestrationExecutor | undefined;
}
export interface InlineSessionState {
  sessionAttributes?: Record<string, string> | undefined;
  promptSessionAttributes?: Record<string, string> | undefined;
  returnControlInvocationResults?: InvocationResultMember[] | undefined;
  invocationId?: string | undefined;
  files?: InputFile[] | undefined;
  conversationHistory?: ConversationHistory | undefined;
}
export interface InlineAgentPayloadPart {
  bytes?: Uint8Array | undefined;
  attribution?: Attribution | undefined;
}
export interface InlineAgentFilePart {
  files?: OutputFile[] | undefined;
}
export interface InlineAgentReturnControlPayload {
  invocationInputs?: InvocationInputMember[] | undefined;
  invocationId?: string | undefined;
}
export interface InlineAgentTracePart {
  sessionId?: string | undefined;
  trace?: Trace | undefined;
  callerChain?: Caller[] | undefined;
  eventTime?: Date | undefined;
  collaboratorName?: string | undefined;
}
export type InlineAgentResponseStream =
  | InlineAgentResponseStream.AccessDeniedExceptionMember
  | InlineAgentResponseStream.BadGatewayExceptionMember
  | InlineAgentResponseStream.ChunkMember
  | InlineAgentResponseStream.ConflictExceptionMember
  | InlineAgentResponseStream.DependencyFailedExceptionMember
  | InlineAgentResponseStream.FilesMember
  | InlineAgentResponseStream.InternalServerExceptionMember
  | InlineAgentResponseStream.ResourceNotFoundExceptionMember
  | InlineAgentResponseStream.ReturnControlMember
  | InlineAgentResponseStream.ServiceQuotaExceededExceptionMember
  | InlineAgentResponseStream.ThrottlingExceptionMember
  | InlineAgentResponseStream.TraceMember
  | InlineAgentResponseStream.ValidationExceptionMember
  | InlineAgentResponseStream.$UnknownMember;
export declare namespace InlineAgentResponseStream {
  interface ChunkMember {
    chunk: InlineAgentPayloadPart;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface TraceMember {
    chunk?: never;
    trace: InlineAgentTracePart;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ReturnControlMember {
    chunk?: never;
    trace?: never;
    returnControl: InlineAgentReturnControlPayload;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException: InternalServerException;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException: ValidationException;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ResourceNotFoundExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException: ResourceNotFoundException;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ServiceQuotaExceededExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException: ServiceQuotaExceededException;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException: ThrottlingException;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface AccessDeniedExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException: AccessDeniedException;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface ConflictExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException: ConflictException;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface DependencyFailedExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException: DependencyFailedException;
    badGatewayException?: never;
    files?: never;
    $unknown?: never;
  }
  interface BadGatewayExceptionMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException: BadGatewayException;
    files?: never;
    $unknown?: never;
  }
  interface FilesMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files: InlineAgentFilePart;
    $unknown?: never;
  }
  interface $UnknownMember {
    chunk?: never;
    trace?: never;
    returnControl?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    files?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    chunk: (value: InlineAgentPayloadPart) => T;
    trace: (value: InlineAgentTracePart) => T;
    returnControl: (value: InlineAgentReturnControlPayload) => T;
    internalServerException: (value: InternalServerException) => T;
    validationException: (value: ValidationException) => T;
    resourceNotFoundException: (value: ResourceNotFoundException) => T;
    serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
    throttlingException: (value: ThrottlingException) => T;
    accessDeniedException: (value: AccessDeniedException) => T;
    conflictException: (value: ConflictException) => T;
    dependencyFailedException: (value: DependencyFailedException) => T;
    badGatewayException: (value: BadGatewayException) => T;
    files: (value: InlineAgentFilePart) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeInlineAgentResponse {
  completion: AsyncIterable<InlineAgentResponseStream> | undefined;
  contentType: string | undefined;
  sessionId: string | undefined;
}
export interface DeleteAgentMemoryRequest {
  agentId: string | undefined;
  agentAliasId: string | undefined;
  memoryId?: string | undefined;
  sessionId?: string | undefined;
}
export interface DeleteAgentMemoryResponse {}
export interface GetAgentMemoryRequest {
  nextToken?: string | undefined;
  maxItems?: number | undefined;
  agentId: string | undefined;
  agentAliasId: string | undefined;
  memoryType: MemoryType | undefined;
  memoryId: string | undefined;
}
export interface MemorySessionSummary {
  memoryId?: string | undefined;
  sessionId?: string | undefined;
  sessionStartTime?: Date | undefined;
  sessionExpiryTime?: Date | undefined;
  summaryText?: string | undefined;
}
export type Memory = Memory.SessionSummaryMember | Memory.$UnknownMember;
export declare namespace Memory {
  interface SessionSummaryMember {
    sessionSummary: MemorySessionSummary;
    $unknown?: never;
  }
  interface $UnknownMember {
    sessionSummary?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    sessionSummary: (value: MemorySessionSummary) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GetAgentMemoryResponse {
  nextToken?: string | undefined;
  memoryContents?: Memory[] | undefined;
}
export interface TextPrompt {
  text: string | undefined;
}
export type InputPrompt =
  | InputPrompt.TextPromptMember
  | InputPrompt.$UnknownMember;
export declare namespace InputPrompt {
  interface TextPromptMember {
    textPrompt: TextPrompt;
    $unknown?: never;
  }
  interface $UnknownMember {
    textPrompt?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    textPrompt: (value: TextPrompt) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OptimizePromptRequest {
  input: InputPrompt | undefined;
  targetModelId: string | undefined;
}
export interface AnalyzePromptEvent {
  message?: string | undefined;
}
export type OptimizedPrompt =
  | OptimizedPrompt.TextPromptMember
  | OptimizedPrompt.$UnknownMember;
export declare namespace OptimizedPrompt {
  interface TextPromptMember {
    textPrompt: TextPrompt;
    $unknown?: never;
  }
  interface $UnknownMember {
    textPrompt?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    textPrompt: (value: TextPrompt) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OptimizedPromptEvent {
  optimizedPrompt?: OptimizedPrompt | undefined;
}
export type OptimizedPromptStream =
  | OptimizedPromptStream.AccessDeniedExceptionMember
  | OptimizedPromptStream.AnalyzePromptEventMember
  | OptimizedPromptStream.BadGatewayExceptionMember
  | OptimizedPromptStream.DependencyFailedExceptionMember
  | OptimizedPromptStream.InternalServerExceptionMember
  | OptimizedPromptStream.OptimizedPromptEventMember
  | OptimizedPromptStream.ThrottlingExceptionMember
  | OptimizedPromptStream.ValidationExceptionMember
  | OptimizedPromptStream.$UnknownMember;
export declare namespace OptimizedPromptStream {
  interface OptimizedPromptEventMember {
    optimizedPromptEvent: OptimizedPromptEvent;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface AnalyzePromptEventMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent: AnalyzePromptEvent;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException: InternalServerException;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException: ThrottlingException;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException: ValidationException;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface DependencyFailedExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException: DependencyFailedException;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface AccessDeniedExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException: AccessDeniedException;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface BadGatewayExceptionMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException: BadGatewayException;
    $unknown?: never;
  }
  interface $UnknownMember {
    optimizedPromptEvent?: never;
    analyzePromptEvent?: never;
    internalServerException?: never;
    throttlingException?: never;
    validationException?: never;
    dependencyFailedException?: never;
    accessDeniedException?: never;
    badGatewayException?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    optimizedPromptEvent: (value: OptimizedPromptEvent) => T;
    analyzePromptEvent: (value: AnalyzePromptEvent) => T;
    internalServerException: (value: InternalServerException) => T;
    throttlingException: (value: ThrottlingException) => T;
    validationException: (value: ValidationException) => T;
    dependencyFailedException: (value: DependencyFailedException) => T;
    accessDeniedException: (value: AccessDeniedException) => T;
    badGatewayException: (value: BadGatewayException) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OptimizePromptResponse {
  optimizedPrompt: AsyncIterable<OptimizedPromptStream> | undefined;
}
export interface RerankTextDocument {
  text?: string | undefined;
}
export interface RerankQuery {
  type: RerankQueryContentType | undefined;
  textQuery: RerankTextDocument | undefined;
}
export interface BedrockRerankingModelConfiguration {
  modelArn: string | undefined;
  additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
}
export interface BedrockRerankingConfiguration {
  numberOfResults?: number | undefined;
  modelConfiguration: BedrockRerankingModelConfiguration | undefined;
}
export interface RerankingConfiguration {
  type: RerankingConfigurationType | undefined;
  bedrockRerankingConfiguration: BedrockRerankingConfiguration | undefined;
}
export interface RerankDocument {
  type: RerankDocumentType | undefined;
  textDocument?: RerankTextDocument | undefined;
  jsonDocument?: __DocumentType | undefined;
}
export interface RerankSource {
  type: RerankSourceType | undefined;
  inlineDocumentSource: RerankDocument | undefined;
}
export interface RerankRequest {
  queries: RerankQuery[] | undefined;
  sources: RerankSource[] | undefined;
  rerankingConfiguration: RerankingConfiguration | undefined;
  nextToken?: string | undefined;
}
export interface RerankResult {
  index: number | undefined;
  relevanceScore: number | undefined;
  document?: RerankDocument | undefined;
}
export interface RerankResponse {
  results: RerankResult[] | undefined;
  nextToken?: string | undefined;
}
export interface RetrieveAndGenerateInput {
  text: string | undefined;
}
export interface GuardrailConfiguration {
  guardrailId: string | undefined;
  guardrailVersion: string | undefined;
}
export interface TextInferenceConfig {
  temperature?: number | undefined;
  topP?: number | undefined;
  maxTokens?: number | undefined;
  stopSequences?: string[] | undefined;
}
export interface InferenceConfig {
  textInferenceConfig?: TextInferenceConfig | undefined;
}
export interface PromptTemplate {
  textPromptTemplate?: string | undefined;
}
export interface ExternalSourcesGenerationConfiguration {
  promptTemplate?: PromptTemplate | undefined;
  guardrailConfiguration?: GuardrailConfiguration | undefined;
  inferenceConfig?: InferenceConfig | undefined;
  additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface ByteContentDoc {
  identifier: string | undefined;
  contentType: string | undefined;
  data: Uint8Array | undefined;
}
export interface S3ObjectDoc {
  uri: string | undefined;
}
export interface ExternalSource {
  sourceType: ExternalSourceType | undefined;
  s3Location?: S3ObjectDoc | undefined;
  byteContent?: ByteContentDoc | undefined;
}
export interface ExternalSourcesRetrieveAndGenerateConfiguration {
  modelArn: string | undefined;
  sources: ExternalSource[] | undefined;
  generationConfiguration?: ExternalSourcesGenerationConfiguration | undefined;
}
export interface GenerationConfiguration {
  promptTemplate?: PromptTemplate | undefined;
  guardrailConfiguration?: GuardrailConfiguration | undefined;
  inferenceConfig?: InferenceConfig | undefined;
  additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface QueryTransformationConfiguration {
  type: QueryTransformationType | undefined;
}
export interface OrchestrationConfiguration {
  promptTemplate?: PromptTemplate | undefined;
  inferenceConfig?: InferenceConfig | undefined;
  additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
  queryTransformationConfiguration?:
    | QueryTransformationConfiguration
    | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface RetrieveAndGenerateSessionConfiguration {
  kmsKeyArn: string | undefined;
}
export interface RetrieveAndGenerateOutput {
  text: string | undefined;
}
export interface RetrieveAndGenerateResponse {
  sessionId: string | undefined;
  output: RetrieveAndGenerateOutput | undefined;
  citations?: Citation[] | undefined;
  guardrailAction?: GuadrailAction | undefined;
}
export interface CitationEvent {
  citation?: Citation | undefined;
  generatedResponsePart?: GeneratedResponsePart | undefined;
  retrievedReferences?: RetrievedReference[] | undefined;
}
export interface GuardrailEvent {
  action?: GuadrailAction | undefined;
}
export interface RetrieveAndGenerateOutputEvent {
  text: string | undefined;
}
export type RetrieveAndGenerateStreamResponseOutput =
  | RetrieveAndGenerateStreamResponseOutput.AccessDeniedExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.BadGatewayExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.CitationMember
  | RetrieveAndGenerateStreamResponseOutput.ConflictExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.DependencyFailedExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.GuardrailMember
  | RetrieveAndGenerateStreamResponseOutput.InternalServerExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.OutputMember
  | RetrieveAndGenerateStreamResponseOutput.ResourceNotFoundExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.ServiceQuotaExceededExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.ThrottlingExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.ValidationExceptionMember
  | RetrieveAndGenerateStreamResponseOutput.$UnknownMember;
export declare namespace RetrieveAndGenerateStreamResponseOutput {
  interface OutputMember {
    output: RetrieveAndGenerateOutputEvent;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface CitationMember {
    output?: never;
    citation: CitationEvent;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface GuardrailMember {
    output?: never;
    citation?: never;
    guardrail: GuardrailEvent;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException: InternalServerException;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException: ValidationException;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ResourceNotFoundExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException: ResourceNotFoundException;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ServiceQuotaExceededExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException: ServiceQuotaExceededException;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException: ThrottlingException;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface AccessDeniedExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException: AccessDeniedException;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface ConflictExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException: ConflictException;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface DependencyFailedExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException: DependencyFailedException;
    badGatewayException?: never;
    $unknown?: never;
  }
  interface BadGatewayExceptionMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException: BadGatewayException;
    $unknown?: never;
  }
  interface $UnknownMember {
    output?: never;
    citation?: never;
    guardrail?: never;
    internalServerException?: never;
    validationException?: never;
    resourceNotFoundException?: never;
    serviceQuotaExceededException?: never;
    throttlingException?: never;
    accessDeniedException?: never;
    conflictException?: never;
    dependencyFailedException?: never;
    badGatewayException?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    output: (value: RetrieveAndGenerateOutputEvent) => T;
    citation: (value: CitationEvent) => T;
    guardrail: (value: GuardrailEvent) => T;
    internalServerException: (value: InternalServerException) => T;
    validationException: (value: ValidationException) => T;
    resourceNotFoundException: (value: ResourceNotFoundException) => T;
    serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
    throttlingException: (value: ThrottlingException) => T;
    accessDeniedException: (value: AccessDeniedException) => T;
    conflictException: (value: ConflictException) => T;
    dependencyFailedException: (value: DependencyFailedException) => T;
    badGatewayException: (value: BadGatewayException) => T;
    _: (name: string, value: any) => T;
  }
}
export interface RetrieveAndGenerateStreamResponse {
  stream: AsyncIterable<RetrieveAndGenerateStreamResponseOutput> | undefined;
  sessionId: string | undefined;
}
export interface InputImage {
  format: InputImageFormat | undefined;
  inlineContent: Uint8Array | undefined;
}
export interface KnowledgeBaseQuery {
  type?: KnowledgeBaseQueryType | undefined;
  text?: string | undefined;
  image?: InputImage | undefined;
}
export interface KnowledgeBaseRetrievalResult {
  content: RetrievalResultContent | undefined;
  location?: RetrievalResultLocation | undefined;
  score?: number | undefined;
  metadata?: Record<string, __DocumentType> | undefined;
}
export interface RetrieveResponse {
  retrievalResults: KnowledgeBaseRetrievalResult[] | undefined;
  guardrailAction?: GuadrailAction | undefined;
  nextToken?: string | undefined;
}
export interface CreateSessionRequest {
  sessionMetadata?: Record<string, string> | undefined;
  encryptionKeyArn?: string | undefined;
  tags?: Record<string, string> | undefined;
}
export interface CreateSessionResponse {
  sessionId: string | undefined;
  sessionArn: string | undefined;
  sessionStatus: SessionStatus | undefined;
  createdAt: Date | undefined;
}
export interface DeleteSessionRequest {
  sessionIdentifier: string | undefined;
}
export interface DeleteSessionResponse {}
export interface EndSessionRequest {
  sessionIdentifier: string | undefined;
}
export interface EndSessionResponse {
  sessionId: string | undefined;
  sessionArn: string | undefined;
  sessionStatus: SessionStatus | undefined;
}
export interface GetSessionRequest {
  sessionIdentifier: string | undefined;
}
export interface GetSessionResponse {
  sessionId: string | undefined;
  sessionArn: string | undefined;
  sessionStatus: SessionStatus | undefined;
  createdAt: Date | undefined;
  lastUpdatedAt: Date | undefined;
  sessionMetadata?: Record<string, string> | undefined;
  encryptionKeyArn?: string | undefined;
}
export interface CreateInvocationRequest {
  invocationId?: string | undefined;
  description?: string | undefined;
  sessionIdentifier: string | undefined;
}
export interface CreateInvocationResponse {
  sessionId: string | undefined;
  invocationId: string | undefined;
  createdAt: Date | undefined;
}
export interface ListInvocationsRequest {
  nextToken?: string | undefined;
  maxResults?: number | undefined;
  sessionIdentifier: string | undefined;
}
export interface InvocationSummary {
  sessionId: string | undefined;
  invocationId: string | undefined;
  createdAt: Date | undefined;
}
export interface ListInvocationsResponse {
  invocationSummaries: InvocationSummary[] | undefined;
  nextToken?: string | undefined;
}
export interface GetInvocationStepRequest {
  invocationIdentifier: string | undefined;
  invocationStepId: string | undefined;
  sessionIdentifier: string | undefined;
}
export interface S3Location {
  uri: string | undefined;
}
export type ImageSource =
  | ImageSource.BytesMember
  | ImageSource.S3LocationMember
  | ImageSource.$UnknownMember;
export declare namespace ImageSource {
  interface BytesMember {
    bytes: Uint8Array;
    s3Location?: never;
    $unknown?: never;
  }
  interface S3LocationMember {
    bytes?: never;
    s3Location: S3Location;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    s3Location?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    s3Location: (value: S3Location) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ImageBlock {
  format: ImageFormat | undefined;
  source: ImageSource | undefined;
}
export type BedrockSessionContentBlock =
  | BedrockSessionContentBlock.ImageMember
  | BedrockSessionContentBlock.TextMember
  | BedrockSessionContentBlock.$UnknownMember;
export declare namespace BedrockSessionContentBlock {
  interface TextMember {
    text: string;
    image?: never;
    $unknown?: never;
  }
  interface ImageMember {
    text?: never;
    image: ImageBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    image?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    image: (value: ImageBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export type InvocationStepPayload =
  | InvocationStepPayload.ContentBlocksMember
  | InvocationStepPayload.$UnknownMember;
export declare namespace InvocationStepPayload {
  interface ContentBlocksMember {
    contentBlocks: BedrockSessionContentBlock[];
    $unknown?: never;
  }
  interface $UnknownMember {
    contentBlocks?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    contentBlocks: (value: BedrockSessionContentBlock[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvocationStep {
  sessionId: string | undefined;
  invocationId: string | undefined;
  invocationStepId: string | undefined;
  invocationStepTime: Date | undefined;
  payload: InvocationStepPayload | undefined;
}
export interface GetInvocationStepResponse {
  invocationStep: InvocationStep | undefined;
}
export interface ListInvocationStepsRequest {
  invocationIdentifier?: string | undefined;
  nextToken?: string | undefined;
  maxResults?: number | undefined;
  sessionIdentifier: string | undefined;
}
export interface InvocationStepSummary {
  sessionId: string | undefined;
  invocationId: string | undefined;
  invocationStepId: string | undefined;
  invocationStepTime: Date | undefined;
}
export interface ListInvocationStepsResponse {
  invocationStepSummaries: InvocationStepSummary[] | undefined;
  nextToken?: string | undefined;
}
export interface PutInvocationStepRequest {
  sessionIdentifier: string | undefined;
  invocationIdentifier: string | undefined;
  invocationStepTime: Date | undefined;
  payload: InvocationStepPayload | undefined;
  invocationStepId?: string | undefined;
}
export interface PutInvocationStepResponse {
  invocationStepId: string | undefined;
}
export interface ListSessionsRequest {
  maxResults?: number | undefined;
  nextToken?: string | undefined;
}
export interface SessionSummary {
  sessionId: string | undefined;
  sessionArn: string | undefined;
  sessionStatus: SessionStatus | undefined;
  createdAt: Date | undefined;
  lastUpdatedAt: Date | undefined;
}
export interface ListSessionsResponse {
  sessionSummaries: SessionSummary[] | undefined;
  nextToken?: string | undefined;
}
export interface UpdateSessionRequest {
  sessionMetadata?: Record<string, string> | undefined;
  sessionIdentifier: string | undefined;
}
export interface UpdateSessionResponse {
  sessionId: string | undefined;
  sessionArn: string | undefined;
  sessionStatus: SessionStatus | undefined;
  createdAt: Date | undefined;
  lastUpdatedAt: Date | undefined;
}
export interface ListTagsForResourceRequest {
  resourceArn: string | undefined;
}
export interface ListTagsForResourceResponse {
  tags?: Record<string, string> | undefined;
}
export interface TagResourceRequest {
  resourceArn: string | undefined;
  tags: Record<string, string> | undefined;
}
export interface TagResourceResponse {}
export interface UntagResourceRequest {
  resourceArn: string | undefined;
  tagKeys: string[] | undefined;
}
export interface UntagResourceResponse {}
export type RetrievalFilter =
  | RetrievalFilter.AndAllMember
  | RetrievalFilter.EqualsMember
  | RetrievalFilter.GreaterThanMember
  | RetrievalFilter.GreaterThanOrEqualsMember
  | RetrievalFilter.InMember
  | RetrievalFilter.LessThanMember
  | RetrievalFilter.LessThanOrEqualsMember
  | RetrievalFilter.ListContainsMember
  | RetrievalFilter.NotEqualsMember
  | RetrievalFilter.NotInMember
  | RetrievalFilter.OrAllMember
  | RetrievalFilter.StartsWithMember
  | RetrievalFilter.StringContainsMember
  | RetrievalFilter.$UnknownMember;
export declare namespace RetrievalFilter {
  interface EqualsMember {
    equals: FilterAttribute;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface NotEqualsMember {
    equals?: never;
    notEquals: FilterAttribute;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface GreaterThanMember {
    equals?: never;
    notEquals?: never;
    greaterThan: FilterAttribute;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface GreaterThanOrEqualsMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals: FilterAttribute;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface LessThanMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan: FilterAttribute;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface LessThanOrEqualsMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals: FilterAttribute;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface InMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in: FilterAttribute;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface NotInMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn: FilterAttribute;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface StartsWithMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith: FilterAttribute;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface ListContainsMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains: FilterAttribute;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface StringContainsMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains: FilterAttribute;
    andAll?: never;
    orAll?: never;
    $unknown?: never;
  }
  interface AndAllMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll: RetrievalFilter[];
    orAll?: never;
    $unknown?: never;
  }
  interface OrAllMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll: RetrievalFilter[];
    $unknown?: never;
  }
  interface $UnknownMember {
    equals?: never;
    notEquals?: never;
    greaterThan?: never;
    greaterThanOrEquals?: never;
    lessThan?: never;
    lessThanOrEquals?: never;
    in?: never;
    notIn?: never;
    startsWith?: never;
    listContains?: never;
    stringContains?: never;
    andAll?: never;
    orAll?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    equals: (value: FilterAttribute) => T;
    notEquals: (value: FilterAttribute) => T;
    greaterThan: (value: FilterAttribute) => T;
    greaterThanOrEquals: (value: FilterAttribute) => T;
    lessThan: (value: FilterAttribute) => T;
    lessThanOrEquals: (value: FilterAttribute) => T;
    in: (value: FilterAttribute) => T;
    notIn: (value: FilterAttribute) => T;
    startsWith: (value: FilterAttribute) => T;
    listContains: (value: FilterAttribute) => T;
    stringContains: (value: FilterAttribute) => T;
    andAll: (value: RetrievalFilter[]) => T;
    orAll: (value: RetrievalFilter[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface KnowledgeBaseVectorSearchConfiguration {
  numberOfResults?: number | undefined;
  overrideSearchType?: SearchType | undefined;
  filter?: RetrievalFilter | undefined;
  rerankingConfiguration?: VectorSearchRerankingConfiguration | undefined;
  implicitFilterConfiguration?: ImplicitFilterConfiguration | undefined;
}
export interface KnowledgeBaseRetrievalConfiguration {
  vectorSearchConfiguration: KnowledgeBaseVectorSearchConfiguration | undefined;
}
export interface KnowledgeBase {
  knowledgeBaseId: string | undefined;
  description: string | undefined;
  retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
}
export interface KnowledgeBaseConfiguration {
  knowledgeBaseId: string | undefined;
  retrievalConfiguration: KnowledgeBaseRetrievalConfiguration | undefined;
}
export interface KnowledgeBaseRetrieveAndGenerateConfiguration {
  knowledgeBaseId: string | undefined;
  modelArn: string | undefined;
  retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
  generationConfiguration?: GenerationConfiguration | undefined;
  orchestrationConfiguration?: OrchestrationConfiguration | undefined;
}
export interface RetrieveRequest {
  knowledgeBaseId: string | undefined;
  retrievalQuery: KnowledgeBaseQuery | undefined;
  retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
  guardrailConfiguration?: GuardrailConfiguration | undefined;
  nextToken?: string | undefined;
}
export interface RetrieveAndGenerateConfiguration {
  type: RetrieveAndGenerateType | undefined;
  knowledgeBaseConfiguration?:
    | KnowledgeBaseRetrieveAndGenerateConfiguration
    | undefined;
  externalSourcesConfiguration?:
    | ExternalSourcesRetrieveAndGenerateConfiguration
    | undefined;
}
export interface Collaborator {
  customerEncryptionKeyArn?: string | undefined;
  foundationModel: string | undefined;
  instruction: string | undefined;
  idleSessionTTLInSeconds?: number | undefined;
  actionGroups?: AgentActionGroup[] | undefined;
  knowledgeBases?: KnowledgeBase[] | undefined;
  guardrailConfiguration?: GuardrailConfigurationWithArn | undefined;
  promptOverrideConfiguration?: PromptOverrideConfiguration | undefined;
  agentCollaboration?: AgentCollaboration | undefined;
  collaboratorConfigurations?: CollaboratorConfiguration[] | undefined;
  agentName?: string | undefined;
}
export interface RetrieveAndGenerateRequest {
  sessionId?: string | undefined;
  input: RetrieveAndGenerateInput | undefined;
  retrieveAndGenerateConfiguration?:
    | RetrieveAndGenerateConfiguration
    | undefined;
  sessionConfiguration?: RetrieveAndGenerateSessionConfiguration | undefined;
}
export interface RetrieveAndGenerateStreamRequest {
  sessionId?: string | undefined;
  input: RetrieveAndGenerateInput | undefined;
  retrieveAndGenerateConfiguration?:
    | RetrieveAndGenerateConfiguration
    | undefined;
  sessionConfiguration?: RetrieveAndGenerateSessionConfiguration | undefined;
}
export interface SessionState {
  sessionAttributes?: Record<string, string> | undefined;
  promptSessionAttributes?: Record<string, string> | undefined;
  returnControlInvocationResults?: InvocationResultMember[] | undefined;
  invocationId?: string | undefined;
  files?: InputFile[] | undefined;
  knowledgeBaseConfigurations?: KnowledgeBaseConfiguration[] | undefined;
  conversationHistory?: ConversationHistory | undefined;
}
export interface InvokeAgentRequest {
  sessionState?: SessionState | undefined;
  agentId: string | undefined;
  agentAliasId: string | undefined;
  sessionId: string | undefined;
  endSession?: boolean | undefined;
  enableTrace?: boolean | undefined;
  inputText?: string | undefined;
  memoryId?: string | undefined;
  bedrockModelConfigurations?: BedrockModelConfigurations | undefined;
  streamingConfigurations?: StreamingConfigurations | undefined;
  promptCreationConfigurations?: PromptCreationConfigurations | undefined;
  sourceArn?: string | undefined;
}
