import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { DocumentType as __DocumentType } from "@smithy/types";
import { BedrockAgentRuntimeServiceException as __BaseException } from "./BedrockAgentRuntimeServiceException";
export declare class AccessDeniedException extends __BaseException {
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<AccessDeniedException, __BaseException>
  );
}
export declare const CustomControlMethod: {
  readonly RETURN_CONTROL: "RETURN_CONTROL";
};
export type CustomControlMethod =
  (typeof CustomControlMethod)[keyof typeof CustomControlMethod];
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
  const visit: <T>(value: ActionGroupExecutor, visitor: Visitor<T>) => T;
}
export declare const ExecutionType: {
  readonly LAMBDA: "LAMBDA";
  readonly RETURN_CONTROL: "RETURN_CONTROL";
};
export type ExecutionType = (typeof ExecutionType)[keyof typeof ExecutionType];
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
export interface ActionGroupInvocationOutput {
  text?: string | undefined;
}
export declare const ActionGroupSignature: {
  readonly AMAZON_CODEINTERPRETER: "AMAZON.CodeInterpreter";
  readonly AMAZON_USERINPUT: "AMAZON.UserInput";
  readonly ANTHROPIC_BASH: "ANTHROPIC.Bash";
  readonly ANTHROPIC_COMPUTER: "ANTHROPIC.Computer";
  readonly ANTHROPIC_TEXTEDITOR: "ANTHROPIC.TextEditor";
};
export type ActionGroupSignature =
  (typeof ActionGroupSignature)[keyof typeof ActionGroupSignature];
export declare const ActionInvocationType: {
  readonly RESULT: "RESULT";
  readonly USER_CONFIRMATION: "USER_CONFIRMATION";
  readonly USER_CONFIRMATION_AND_RESULT: "USER_CONFIRMATION_AND_RESULT";
};
export type ActionInvocationType =
  (typeof ActionInvocationType)[keyof typeof ActionInvocationType];
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
  const visit: <T>(value: APISchema, visitor: Visitor<T>) => T;
}
export declare const ParameterType: {
  readonly ARRAY: "array";
  readonly BOOLEAN: "boolean";
  readonly INTEGER: "integer";
  readonly NUMBER: "number";
  readonly STRING: "string";
};
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType];
export interface ParameterDetail {
  description?: string | undefined;
  type: ParameterType | undefined;
  required?: boolean | undefined;
}
export declare const RequireConfirmation: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
};
export type RequireConfirmation =
  (typeof RequireConfirmation)[keyof typeof RequireConfirmation];
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
  const visit: <T>(value: FunctionSchema, visitor: Visitor<T>) => T;
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
export declare const AgentCollaboration: {
  readonly DISABLED: "DISABLED";
  readonly SUPERVISOR: "SUPERVISOR";
  readonly SUPERVISOR_ROUTER: "SUPERVISOR_ROUTER";
};
export type AgentCollaboration =
  (typeof AgentCollaboration)[keyof typeof AgentCollaboration];
export declare const ConfirmationState: {
  readonly CONFIRM: "CONFIRM";
  readonly DENY: "DENY";
};
export type ConfirmationState =
  (typeof ConfirmationState)[keyof typeof ConfirmationState];
export declare const ImageInputFormat: {
  readonly GIF: "gif";
  readonly JPEG: "jpeg";
  readonly PNG: "png";
  readonly WEBP: "webp";
};
export type ImageInputFormat =
  (typeof ImageInputFormat)[keyof typeof ImageInputFormat];
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
  const visit: <T>(value: ImageInputSource, visitor: Visitor<T>) => T;
}
export interface ImageInput {
  format: ImageInputFormat | undefined;
  source: ImageInputSource | undefined;
}
export interface ContentBody {
  body?: string | undefined;
  images?: ImageInput[] | undefined;
}
export declare const ResponseState: {
  readonly FAILURE: "FAILURE";
  readonly REPROMPT: "REPROMPT";
};
export type ResponseState = (typeof ResponseState)[keyof typeof ResponseState];
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
  const visit: <T>(value: InvocationResultMember, visitor: Visitor<T>) => T;
}
export interface ReturnControlResults {
  invocationId?: string | undefined;
  returnControlInvocationResults?: InvocationResultMember[] | undefined;
}
export declare const PayloadType: {
  readonly RETURN_CONTROL: "RETURN_CONTROL";
  readonly TEXT: "TEXT";
};
export type PayloadType = (typeof PayloadType)[keyof typeof PayloadType];
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
  const visit: <T>(value: InvocationInputMember, visitor: Visitor<T>) => T;
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
}
export declare class BadGatewayException extends __BaseException {
  readonly name: "BadGatewayException";
  readonly $fault: "server";
  resourceName?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<BadGatewayException, __BaseException>
  );
}
export declare class ConflictException extends __BaseException {
  readonly name: "ConflictException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
export declare class DependencyFailedException extends __BaseException {
  readonly name: "DependencyFailedException";
  readonly $fault: "client";
  resourceName?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<DependencyFailedException, __BaseException>
  );
}
export declare class InternalServerException extends __BaseException {
  readonly name: "InternalServerException";
  readonly $fault: "server";
  reason?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InternalServerException, __BaseException>
  );
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
  const visit: <T>(value: FlowInputContent, visitor: Visitor<T>) => T;
}
export interface FlowInput {
  nodeName: string | undefined;
  nodeOutputName?: string | undefined;
  content: FlowInputContent | undefined;
  nodeInputName?: string | undefined;
}
export declare const PerformanceConfigLatency: {
  readonly OPTIMIZED: "optimized";
  readonly STANDARD: "standard";
};
export type PerformanceConfigLatency =
  (typeof PerformanceConfigLatency)[keyof typeof PerformanceConfigLatency];
export interface PerformanceConfiguration {
  latency?: PerformanceConfigLatency | undefined;
}
export interface ModelPerformanceConfiguration {
  performanceConfig?: PerformanceConfiguration | undefined;
}
export interface InvokeFlowRequest {
  flowIdentifier: string | undefined;
  flowAliasIdentifier: string | undefined;
  inputs: FlowInput[] | undefined;
  enableTrace?: boolean | undefined;
  modelPerformanceConfiguration?: ModelPerformanceConfiguration | undefined;
  executionId?: string | undefined;
}
export declare const FlowCompletionReason: {
  readonly INPUT_REQUIRED: "INPUT_REQUIRED";
  readonly SUCCESS: "SUCCESS";
};
export type FlowCompletionReason =
  (typeof FlowCompletionReason)[keyof typeof FlowCompletionReason];
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
  const visit: <T>(value: FlowMultiTurnInputContent, visitor: Visitor<T>) => T;
}
export declare const NodeType: {
  readonly CONDITION_NODE: "ConditionNode";
  readonly FLOW_INPUT_NODE: "FlowInputNode";
  readonly FLOW_OUTPUT_NODE: "FlowOutputNode";
  readonly KNOWLEDGE_BASE_NODE: "KnowledgeBaseNode";
  readonly LAMBDA_FUNCTION_NODE: "LambdaFunctionNode";
  readonly LEX_NODE: "LexNode";
  readonly PROMPT_NODE: "PromptNode";
};
export type NodeType = (typeof NodeType)[keyof typeof NodeType];
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
  const visit: <T>(value: FlowOutputContent, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: FlowTraceNodeInputContent, visitor: Visitor<T>) => T;
}
export interface FlowTraceNodeInputField {
  nodeInputName: string | undefined;
  content: FlowTraceNodeInputContent | undefined;
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
  const visit: <T>(value: FlowTraceNodeOutputContent, visitor: Visitor<T>) => T;
}
export interface FlowTraceNodeOutputField {
  nodeOutputName: string | undefined;
  content: FlowTraceNodeOutputContent | undefined;
}
export interface FlowTraceNodeOutputEvent {
  nodeName: string | undefined;
  timestamp: Date | undefined;
  fields: FlowTraceNodeOutputField[] | undefined;
}
export type FlowTrace =
  | FlowTrace.ConditionNodeResultTraceMember
  | FlowTrace.NodeActionTraceMember
  | FlowTrace.NodeInputTraceMember
  | FlowTrace.NodeOutputTraceMember
  | FlowTrace.$UnknownMember;
export declare namespace FlowTrace {
  interface NodeInputTraceMember {
    nodeInputTrace: FlowTraceNodeInputEvent;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    $unknown?: never;
  }
  interface NodeOutputTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace: FlowTraceNodeOutputEvent;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    $unknown?: never;
  }
  interface ConditionNodeResultTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace: FlowTraceConditionNodeResultEvent;
    nodeActionTrace?: never;
    $unknown?: never;
  }
  interface NodeActionTraceMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace: FlowTraceNodeActionEvent;
    $unknown?: never;
  }
  interface $UnknownMember {
    nodeInputTrace?: never;
    nodeOutputTrace?: never;
    conditionNodeResultTrace?: never;
    nodeActionTrace?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    nodeInputTrace: (value: FlowTraceNodeInputEvent) => T;
    nodeOutputTrace: (value: FlowTraceNodeOutputEvent) => T;
    conditionNodeResultTrace: (value: FlowTraceConditionNodeResultEvent) => T;
    nodeActionTrace: (value: FlowTraceNodeActionEvent) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: FlowTrace, visitor: Visitor<T>) => T;
}
export interface FlowTraceEvent {
  trace: FlowTrace | undefined;
}
export declare class ResourceNotFoundException extends __BaseException {
  readonly name: "ResourceNotFoundException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>
  );
}
export declare class ServiceQuotaExceededException extends __BaseException {
  readonly name: "ServiceQuotaExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>
  );
}
export declare class ThrottlingException extends __BaseException {
  readonly name: "ThrottlingException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ThrottlingException, __BaseException>
  );
}
export declare class ValidationException extends __BaseException {
  readonly name: "ValidationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ValidationException, __BaseException>
  );
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
  const visit: <T>(value: FlowResponseStream, visitor: Visitor<T>) => T;
}
export interface InvokeFlowResponse {
  responseStream: AsyncIterable<FlowResponseStream> | undefined;
  executionId?: string | undefined;
}
export declare const InputQueryType: {
  readonly TEXT: "TEXT";
};
export type InputQueryType =
  (typeof InputQueryType)[keyof typeof InputQueryType];
export interface QueryGenerationInput {
  type: InputQueryType | undefined;
  text: string | undefined;
}
export declare const QueryTransformationMode: {
  readonly TEXT_TO_SQL: "TEXT_TO_SQL";
};
export type QueryTransformationMode =
  (typeof QueryTransformationMode)[keyof typeof QueryTransformationMode];
export interface TextToSqlKnowledgeBaseConfiguration {
  knowledgeBaseArn: string | undefined;
}
export declare const TextToSqlConfigurationType: {
  readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
export type TextToSqlConfigurationType =
  (typeof TextToSqlConfigurationType)[keyof typeof TextToSqlConfigurationType];
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
export declare const GeneratedQueryType: {
  readonly REDSHIFT_SQL: "REDSHIFT_SQL";
};
export type GeneratedQueryType =
  (typeof GeneratedQueryType)[keyof typeof GeneratedQueryType];
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
  const visit: <T>(value: ContentBlock, visitor: Visitor<T>) => T;
}
export declare const ConversationRole: {
  readonly ASSISTANT: "assistant";
  readonly USER: "user";
};
export type ConversationRole =
  (typeof ConversationRole)[keyof typeof ConversationRole];
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
export declare const FileSourceType: {
  readonly BYTE_CONTENT: "BYTE_CONTENT";
  readonly S3: "S3";
};
export type FileSourceType =
  (typeof FileSourceType)[keyof typeof FileSourceType];
export interface FileSource {
  sourceType: FileSourceType | undefined;
  s3Location?: S3ObjectFile | undefined;
  byteContent?: ByteContentFile | undefined;
}
export declare const FileUseCase: {
  readonly CHAT: "CHAT";
  readonly CODE_INTERPRETER: "CODE_INTERPRETER";
};
export type FileUseCase = (typeof FileUseCase)[keyof typeof FileUseCase];
export interface InputFile {
  name: string | undefined;
  source: FileSource | undefined;
  useCase: FileUseCase | undefined;
}
export interface FilterAttribute {
  key: string | undefined;
  value: __DocumentType | undefined;
}
export declare const AttributeType: {
  readonly BOOLEAN: "BOOLEAN";
  readonly NUMBER: "NUMBER";
  readonly STRING: "STRING";
  readonly STRING_LIST: "STRING_LIST";
};
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];
export interface MetadataAttributeSchema {
  key: string | undefined;
  type: AttributeType | undefined;
  description: string | undefined;
}
export interface ImplicitFilterConfiguration {
  metadataAttributes: MetadataAttributeSchema[] | undefined;
  modelArn: string | undefined;
}
export declare const SearchType: {
  readonly HYBRID: "HYBRID";
  readonly SEMANTIC: "SEMANTIC";
};
export type SearchType = (typeof SearchType)[keyof typeof SearchType];
export declare const RerankingMetadataSelectionMode: {
  readonly ALL: "ALL";
  readonly SELECTIVE: "SELECTIVE";
};
export type RerankingMetadataSelectionMode =
  (typeof RerankingMetadataSelectionMode)[keyof typeof RerankingMetadataSelectionMode];
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
  const visit: <T>(
    value: RerankingMetadataSelectiveModeConfiguration,
    visitor: Visitor<T>
  ) => T;
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
export declare const VectorSearchRerankingConfigurationType: {
  readonly BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL";
};
export type VectorSearchRerankingConfigurationType =
  (typeof VectorSearchRerankingConfigurationType)[keyof typeof VectorSearchRerankingConfigurationType];
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
export declare const RetrievalResultContentColumnType: {
  readonly BLOB: "BLOB";
  readonly BOOLEAN: "BOOLEAN";
  readonly DOUBLE: "DOUBLE";
  readonly LONG: "LONG";
  readonly NULL: "NULL";
  readonly STRING: "STRING";
};
export type RetrievalResultContentColumnType =
  (typeof RetrievalResultContentColumnType)[keyof typeof RetrievalResultContentColumnType];
export interface RetrievalResultContentColumn {
  columnName?: string | undefined;
  columnValue?: string | undefined;
  type?: RetrievalResultContentColumnType | undefined;
}
export declare const RetrievalResultContentType: {
  readonly IMAGE: "IMAGE";
  readonly ROW: "ROW";
  readonly TEXT: "TEXT";
};
export type RetrievalResultContentType =
  (typeof RetrievalResultContentType)[keyof typeof RetrievalResultContentType];
export interface RetrievalResultContent {
  type?: RetrievalResultContentType | undefined;
  text?: string | undefined;
  byteContent?: string | undefined;
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
export declare const RetrievalResultLocationType: {
  readonly CONFLUENCE: "CONFLUENCE";
  readonly CUSTOM: "CUSTOM";
  readonly KENDRA: "KENDRA";
  readonly S3: "S3";
  readonly SALESFORCE: "SALESFORCE";
  readonly SHAREPOINT: "SHAREPOINT";
  readonly SQL: "SQL";
  readonly WEB: "WEB";
};
export type RetrievalResultLocationType =
  (typeof RetrievalResultLocationType)[keyof typeof RetrievalResultLocationType];
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
export declare class ModelNotReadyException extends __BaseException {
  readonly name: "ModelNotReadyException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ModelNotReadyException, __BaseException>
  );
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
  const visit: <T>(value: Caller, visitor: Visitor<T>) => T;
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
}
export declare const GuardrailAction: {
  readonly INTERVENED: "INTERVENED";
  readonly NONE: "NONE";
};
export type GuardrailAction =
  (typeof GuardrailAction)[keyof typeof GuardrailAction];
export declare const GuardrailContentPolicyAction: {
  readonly BLOCKED: "BLOCKED";
};
export type GuardrailContentPolicyAction =
  (typeof GuardrailContentPolicyAction)[keyof typeof GuardrailContentPolicyAction];
export declare const GuardrailContentFilterConfidence: {
  readonly HIGH: "HIGH";
  readonly LOW: "LOW";
  readonly MEDIUM: "MEDIUM";
  readonly NONE: "NONE";
};
export type GuardrailContentFilterConfidence =
  (typeof GuardrailContentFilterConfidence)[keyof typeof GuardrailContentFilterConfidence];
export declare const GuardrailContentFilterType: {
  readonly HATE: "HATE";
  readonly INSULTS: "INSULTS";
  readonly MISCONDUCT: "MISCONDUCT";
  readonly PROMPT_ATTACK: "PROMPT_ATTACK";
  readonly SEXUAL: "SEXUAL";
  readonly VIOLENCE: "VIOLENCE";
};
export type GuardrailContentFilterType =
  (typeof GuardrailContentFilterType)[keyof typeof GuardrailContentFilterType];
export interface GuardrailContentFilter {
  type?: GuardrailContentFilterType | undefined;
  confidence?: GuardrailContentFilterConfidence | undefined;
  action?: GuardrailContentPolicyAction | undefined;
}
export interface GuardrailContentPolicyAssessment {
  filters?: GuardrailContentFilter[] | undefined;
}
export declare const GuardrailSensitiveInformationPolicyAction: {
  readonly ANONYMIZED: "ANONYMIZED";
  readonly BLOCKED: "BLOCKED";
};
export type GuardrailSensitiveInformationPolicyAction =
  (typeof GuardrailSensitiveInformationPolicyAction)[keyof typeof GuardrailSensitiveInformationPolicyAction];
export declare const GuardrailPiiEntityType: {
  readonly ADDRESS: "ADDRESS";
  readonly AGE: "AGE";
  readonly AWS_ACCESS_KEY: "AWS_ACCESS_KEY";
  readonly AWS_SECRET_KEY: "AWS_SECRET_KEY";
  readonly CA_HEALTH_NUMBER: "CA_HEALTH_NUMBER";
  readonly CA_SOCIAL_INSURANCE_NUMBER: "CA_SOCIAL_INSURANCE_NUMBER";
  readonly CREDIT_DEBIT_CARD_CVV: "CREDIT_DEBIT_CARD_CVV";
  readonly CREDIT_DEBIT_CARD_EXPIRY: "CREDIT_DEBIT_CARD_EXPIRY";
  readonly CREDIT_DEBIT_CARD_NUMBER: "CREDIT_DEBIT_CARD_NUMBER";
  readonly DRIVER_ID: "DRIVER_ID";
  readonly EMAIL: "EMAIL";
  readonly INTERNATIONAL_BANK_ACCOUNT_NUMBER: "INTERNATIONAL_BANK_ACCOUNT_NUMBER";
  readonly IP_ADDRESS: "IP_ADDRESS";
  readonly LICENSE_PLATE: "LICENSE_PLATE";
  readonly MAC_ADDRESS: "MAC_ADDRESS";
  readonly NAME: "NAME";
  readonly PASSWORD: "PASSWORD";
  readonly PHONE: "PHONE";
  readonly PIN: "PIN";
  readonly SWIFT_CODE: "SWIFT_CODE";
  readonly UK_NATIONAL_HEALTH_SERVICE_NUMBER: "UK_NATIONAL_HEALTH_SERVICE_NUMBER";
  readonly UK_NATIONAL_INSURANCE_NUMBER: "UK_NATIONAL_INSURANCE_NUMBER";
  readonly UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER";
  readonly URL: "URL";
  readonly USERNAME: "USERNAME";
  readonly US_BANK_ACCOUNT_NUMBER: "US_BANK_ACCOUNT_NUMBER";
  readonly US_BANK_ROUTING_NUMBER: "US_BANK_ROUTING_NUMBER";
  readonly US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER";
  readonly US_PASSPORT_NUMBER: "US_PASSPORT_NUMBER";
  readonly US_SOCIAL_SECURITY_NUMBER: "US_SOCIAL_SECURITY_NUMBER";
  readonly VEHICLE_IDENTIFICATION_NUMBER: "VEHICLE_IDENTIFICATION_NUMBER";
};
export type GuardrailPiiEntityType =
  (typeof GuardrailPiiEntityType)[keyof typeof GuardrailPiiEntityType];
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
export declare const GuardrailTopicPolicyAction: {
  readonly BLOCKED: "BLOCKED";
};
export type GuardrailTopicPolicyAction =
  (typeof GuardrailTopicPolicyAction)[keyof typeof GuardrailTopicPolicyAction];
export declare const GuardrailTopicType: {
  readonly DENY: "DENY";
};
export type GuardrailTopicType =
  (typeof GuardrailTopicType)[keyof typeof GuardrailTopicType];
export interface GuardrailTopic {
  name?: string | undefined;
  type?: GuardrailTopicType | undefined;
  action?: GuardrailTopicPolicyAction | undefined;
}
export interface GuardrailTopicPolicyAssessment {
  topics?: GuardrailTopic[] | undefined;
}
export declare const GuardrailWordPolicyAction: {
  readonly BLOCKED: "BLOCKED";
};
export type GuardrailWordPolicyAction =
  (typeof GuardrailWordPolicyAction)[keyof typeof GuardrailWordPolicyAction];
export interface GuardrailCustomWord {
  match?: string | undefined;
  action?: GuardrailWordPolicyAction | undefined;
}
export declare const GuardrailManagedWordType: {
  readonly PROFANITY: "PROFANITY";
};
export type GuardrailManagedWordType =
  (typeof GuardrailManagedWordType)[keyof typeof GuardrailManagedWordType];
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
}
export interface CodeInterpreterInvocationInput {
  code?: string | undefined;
  files?: string[] | undefined;
}
export declare const InvocationType: {
  readonly ACTION_GROUP: "ACTION_GROUP";
  readonly ACTION_GROUP_CODE_INTERPRETER: "ACTION_GROUP_CODE_INTERPRETER";
  readonly AGENT_COLLABORATOR: "AGENT_COLLABORATOR";
  readonly FINISH: "FINISH";
  readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
export type InvocationType =
  (typeof InvocationType)[keyof typeof InvocationType];
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
export declare const CreationMode: {
  readonly DEFAULT: "DEFAULT";
  readonly OVERRIDDEN: "OVERRIDDEN";
};
export type CreationMode = (typeof CreationMode)[keyof typeof CreationMode];
export declare const PromptType: {
  readonly KNOWLEDGE_BASE_RESPONSE_GENERATION: "KNOWLEDGE_BASE_RESPONSE_GENERATION";
  readonly ORCHESTRATION: "ORCHESTRATION";
  readonly POST_PROCESSING: "POST_PROCESSING";
  readonly PRE_PROCESSING: "PRE_PROCESSING";
  readonly ROUTING_CLASSIFIER: "ROUTING_CLASSIFIER";
};
export type PromptType = (typeof PromptType)[keyof typeof PromptType];
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
export interface Usage {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}
export interface Metadata {
  usage?: Usage | undefined;
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
  const visit: <T>(value: ReasoningContentBlock, visitor: Visitor<T>) => T;
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
}
export interface FinalResponse {
  text?: string | undefined;
}
export interface KnowledgeBaseLookupOutput {
  retrievedReferences?: RetrievedReference[] | undefined;
}
export declare const Source: {
  readonly ACTION_GROUP: "ACTION_GROUP";
  readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
  readonly PARSER: "PARSER";
};
export type Source = (typeof Source)[keyof typeof Source];
export interface RepromptResponse {
  text?: string | undefined;
  source?: Source | undefined;
}
export declare const Type: {
  readonly ACTION_GROUP: "ACTION_GROUP";
  readonly AGENT_COLLABORATOR: "AGENT_COLLABORATOR";
  readonly ASK_USER: "ASK_USER";
  readonly FINISH: "FINISH";
  readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
  readonly REPROMPT: "REPROMPT";
};
export type Type = (typeof Type)[keyof typeof Type];
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
  const visit: <T>(value: OrchestrationTrace, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: PostProcessingTrace, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: PreProcessingTrace, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: RoutingClassifierTrace, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: Trace, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: ResponseStream, visitor: Visitor<T>) => T;
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
export declare const RelayConversationHistory: {
  readonly DISABLED: "DISABLED";
  readonly TO_COLLABORATOR: "TO_COLLABORATOR";
};
export type RelayConversationHistory =
  (typeof RelayConversationHistory)[keyof typeof RelayConversationHistory];
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
export declare const PromptState: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
};
export type PromptState = (typeof PromptState)[keyof typeof PromptState];
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
  const visit: <T>(value: OrchestrationExecutor, visitor: Visitor<T>) => T;
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
export declare const OrchestrationType: {
  readonly CUSTOM_ORCHESTRATION: "CUSTOM_ORCHESTRATION";
  readonly DEFAULT: "DEFAULT";
};
export type OrchestrationType =
  (typeof OrchestrationType)[keyof typeof OrchestrationType];
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
  const visit: <T>(value: InlineAgentResponseStream, visitor: Visitor<T>) => T;
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
export declare const MemoryType: {
  readonly SESSION_SUMMARY: "SESSION_SUMMARY";
};
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];
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
  const visit: <T>(value: Memory, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: InputPrompt, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: OptimizedPrompt, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: OptimizedPromptStream, visitor: Visitor<T>) => T;
}
export interface OptimizePromptResponse {
  optimizedPrompt: AsyncIterable<OptimizedPromptStream> | undefined;
}
export interface RerankTextDocument {
  text?: string | undefined;
}
export declare const RerankQueryContentType: {
  readonly TEXT: "TEXT";
};
export type RerankQueryContentType =
  (typeof RerankQueryContentType)[keyof typeof RerankQueryContentType];
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
export declare const RerankingConfigurationType: {
  readonly BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL";
};
export type RerankingConfigurationType =
  (typeof RerankingConfigurationType)[keyof typeof RerankingConfigurationType];
export interface RerankingConfiguration {
  type: RerankingConfigurationType | undefined;
  bedrockRerankingConfiguration: BedrockRerankingConfiguration | undefined;
}
export declare const RerankDocumentType: {
  readonly JSON: "JSON";
  readonly TEXT: "TEXT";
};
export type RerankDocumentType =
  (typeof RerankDocumentType)[keyof typeof RerankDocumentType];
export interface RerankDocument {
  type: RerankDocumentType | undefined;
  textDocument?: RerankTextDocument | undefined;
  jsonDocument?: __DocumentType | undefined;
}
export declare const RerankSourceType: {
  readonly INLINE: "INLINE";
};
export type RerankSourceType =
  (typeof RerankSourceType)[keyof typeof RerankSourceType];
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
export declare const ExternalSourceType: {
  readonly BYTE_CONTENT: "BYTE_CONTENT";
  readonly S3: "S3";
};
export type ExternalSourceType =
  (typeof ExternalSourceType)[keyof typeof ExternalSourceType];
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
export declare const QueryTransformationType: {
  readonly QUERY_DECOMPOSITION: "QUERY_DECOMPOSITION";
};
export type QueryTransformationType =
  (typeof QueryTransformationType)[keyof typeof QueryTransformationType];
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
export declare const RetrieveAndGenerateType: {
  readonly EXTERNAL_SOURCES: "EXTERNAL_SOURCES";
  readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
export type RetrieveAndGenerateType =
  (typeof RetrieveAndGenerateType)[keyof typeof RetrieveAndGenerateType];
export interface RetrieveAndGenerateSessionConfiguration {
  kmsKeyArn: string | undefined;
}
export declare const GuadrailAction: {
  readonly INTERVENED: "INTERVENED";
  readonly NONE: "NONE";
};
export type GuadrailAction =
  (typeof GuadrailAction)[keyof typeof GuadrailAction];
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
  const visit: <T>(
    value: RetrieveAndGenerateStreamResponseOutput,
    visitor: Visitor<T>
  ) => T;
}
export interface RetrieveAndGenerateStreamResponse {
  stream: AsyncIterable<RetrieveAndGenerateStreamResponseOutput> | undefined;
  sessionId: string | undefined;
}
export interface KnowledgeBaseQuery {
  text: string | undefined;
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
export declare const SessionStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly ENDED: "ENDED";
  readonly EXPIRED: "EXPIRED";
};
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
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
export declare const ImageFormat: {
  readonly GIF: "gif";
  readonly JPEG: "jpeg";
  readonly PNG: "png";
  readonly WEBP: "webp";
};
export type ImageFormat = (typeof ImageFormat)[keyof typeof ImageFormat];
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
  const visit: <T>(value: ImageSource, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: BedrockSessionContentBlock, visitor: Visitor<T>) => T;
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
  const visit: <T>(value: InvocationStepPayload, visitor: Visitor<T>) => T;
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
export declare const ActionGroupInvocationInputFilterSensitiveLog: (
  obj: ActionGroupInvocationInput
) => any;
export declare const ActionGroupInvocationOutputFilterSensitiveLog: (
  obj: ActionGroupInvocationOutput
) => any;
export declare const APISchemaFilterSensitiveLog: (obj: APISchema) => any;
export declare const FunctionDefinitionFilterSensitiveLog: (
  obj: FunctionDefinition
) => any;
export declare const FunctionSchemaFilterSensitiveLog: (
  obj: FunctionSchema
) => any;
export declare const AgentActionGroupFilterSensitiveLog: (
  obj: AgentActionGroup
) => any;
export declare const ApiResultFilterSensitiveLog: (obj: ApiResult) => any;
export declare const InvocationResultMemberFilterSensitiveLog: (
  obj: InvocationResultMember
) => any;
export declare const ReturnControlResultsFilterSensitiveLog: (
  obj: ReturnControlResults
) => any;
export declare const AgentCollaboratorInputPayloadFilterSensitiveLog: (
  obj: AgentCollaboratorInputPayload
) => any;
export declare const AgentCollaboratorInvocationInputFilterSensitiveLog: (
  obj: AgentCollaboratorInvocationInput
) => any;
export declare const ApiInvocationInputFilterSensitiveLog: (
  obj: ApiInvocationInput
) => any;
export declare const FunctionInvocationInputFilterSensitiveLog: (
  obj: FunctionInvocationInput
) => any;
export declare const InvocationInputMemberFilterSensitiveLog: (
  obj: InvocationInputMember
) => any;
export declare const ReturnControlPayloadFilterSensitiveLog: (
  obj: ReturnControlPayload
) => any;
export declare const AgentCollaboratorOutputPayloadFilterSensitiveLog: (
  obj: AgentCollaboratorOutputPayload
) => any;
export declare const AgentCollaboratorInvocationOutputFilterSensitiveLog: (
  obj: AgentCollaboratorInvocationOutput
) => any;
export declare const FlowInputContentFilterSensitiveLog: (
  obj: FlowInputContent
) => any;
export declare const FlowInputFilterSensitiveLog: (obj: FlowInput) => any;
export declare const InvokeFlowRequestFilterSensitiveLog: (
  obj: InvokeFlowRequest
) => any;
export declare const FlowCompletionEventFilterSensitiveLog: (
  obj: FlowCompletionEvent
) => any;
export declare const FlowMultiTurnInputRequestEventFilterSensitiveLog: (
  obj: FlowMultiTurnInputRequestEvent
) => any;
export declare const FlowOutputEventFilterSensitiveLog: (
  obj: FlowOutputEvent
) => any;
export declare const FlowTraceConditionFilterSensitiveLog: (
  obj: FlowTraceCondition
) => any;
export declare const FlowTraceConditionNodeResultEventFilterSensitiveLog: (
  obj: FlowTraceConditionNodeResultEvent
) => any;
export declare const FlowTraceNodeActionEventFilterSensitiveLog: (
  obj: FlowTraceNodeActionEvent
) => any;
export declare const FlowTraceNodeInputContentFilterSensitiveLog: (
  obj: FlowTraceNodeInputContent
) => any;
export declare const FlowTraceNodeInputFieldFilterSensitiveLog: (
  obj: FlowTraceNodeInputField
) => any;
export declare const FlowTraceNodeInputEventFilterSensitiveLog: (
  obj: FlowTraceNodeInputEvent
) => any;
export declare const FlowTraceNodeOutputFieldFilterSensitiveLog: (
  obj: FlowTraceNodeOutputField
) => any;
export declare const FlowTraceNodeOutputEventFilterSensitiveLog: (
  obj: FlowTraceNodeOutputEvent
) => any;
export declare const FlowTraceFilterSensitiveLog: (obj: FlowTrace) => any;
export declare const FlowTraceEventFilterSensitiveLog: (
  obj: FlowTraceEvent
) => any;
export declare const FlowResponseStreamFilterSensitiveLog: (
  obj: FlowResponseStream
) => any;
export declare const InvokeFlowResponseFilterSensitiveLog: (
  obj: InvokeFlowResponse
) => any;
export declare const QueryGenerationInputFilterSensitiveLog: (
  obj: QueryGenerationInput
) => any;
export declare const GenerateQueryRequestFilterSensitiveLog: (
  obj: GenerateQueryRequest
) => any;
export declare const GeneratedQueryFilterSensitiveLog: (
  obj: GeneratedQuery
) => any;
export declare const GenerateQueryResponseFilterSensitiveLog: (
  obj: GenerateQueryResponse
) => any;
export declare const ContentBlockFilterSensitiveLog: (obj: ContentBlock) => any;
export declare const MessageFilterSensitiveLog: (obj: Message) => any;
export declare const ConversationHistoryFilterSensitiveLog: (
  obj: ConversationHistory
) => any;
export declare const ByteContentFileFilterSensitiveLog: (
  obj: ByteContentFile
) => any;
export declare const FileSourceFilterSensitiveLog: (obj: FileSource) => any;
export declare const InputFileFilterSensitiveLog: (obj: InputFile) => any;
export declare const MetadataAttributeSchemaFilterSensitiveLog: (
  obj: MetadataAttributeSchema
) => any;
export declare const ImplicitFilterConfigurationFilterSensitiveLog: (
  obj: ImplicitFilterConfiguration
) => any;
export declare const RerankingMetadataSelectiveModeConfigurationFilterSensitiveLog: (
  obj: RerankingMetadataSelectiveModeConfiguration
) => any;
export declare const MetadataConfigurationForRerankingFilterSensitiveLog: (
  obj: MetadataConfigurationForReranking
) => any;
export declare const VectorSearchBedrockRerankingConfigurationFilterSensitiveLog: (
  obj: VectorSearchBedrockRerankingConfiguration
) => any;
export declare const VectorSearchRerankingConfigurationFilterSensitiveLog: (
  obj: VectorSearchRerankingConfiguration
) => any;
export declare const TextResponsePartFilterSensitiveLog: (
  obj: TextResponsePart
) => any;
export declare const GeneratedResponsePartFilterSensitiveLog: (
  obj: GeneratedResponsePart
) => any;
export declare const RetrievalResultContentColumnFilterSensitiveLog: (
  obj: RetrievalResultContentColumn
) => any;
export declare const RetrievalResultContentFilterSensitiveLog: (
  obj: RetrievalResultContent
) => any;
export declare const RetrievalResultLocationFilterSensitiveLog: (
  obj: RetrievalResultLocation
) => any;
export declare const RetrievedReferenceFilterSensitiveLog: (
  obj: RetrievedReference
) => any;
export declare const CitationFilterSensitiveLog: (obj: Citation) => any;
export declare const AttributionFilterSensitiveLog: (obj: Attribution) => any;
export declare const PayloadPartFilterSensitiveLog: (obj: PayloadPart) => any;
export declare const OutputFileFilterSensitiveLog: (obj: OutputFile) => any;
export declare const FilePartFilterSensitiveLog: (obj: FilePart) => any;
export declare const CustomOrchestrationTraceEventFilterSensitiveLog: (
  obj: CustomOrchestrationTraceEvent
) => any;
export declare const CustomOrchestrationTraceFilterSensitiveLog: (
  obj: CustomOrchestrationTrace
) => any;
export declare const FailureTraceFilterSensitiveLog: (obj: FailureTrace) => any;
export declare const GuardrailContentFilterFilterSensitiveLog: (
  obj: GuardrailContentFilter
) => any;
export declare const GuardrailContentPolicyAssessmentFilterSensitiveLog: (
  obj: GuardrailContentPolicyAssessment
) => any;
export declare const GuardrailPiiEntityFilterFilterSensitiveLog: (
  obj: GuardrailPiiEntityFilter
) => any;
export declare const GuardrailRegexFilterFilterSensitiveLog: (
  obj: GuardrailRegexFilter
) => any;
export declare const GuardrailSensitiveInformationPolicyAssessmentFilterSensitiveLog: (
  obj: GuardrailSensitiveInformationPolicyAssessment
) => any;
export declare const GuardrailTopicFilterSensitiveLog: (
  obj: GuardrailTopic
) => any;
export declare const GuardrailTopicPolicyAssessmentFilterSensitiveLog: (
  obj: GuardrailTopicPolicyAssessment
) => any;
export declare const GuardrailCustomWordFilterSensitiveLog: (
  obj: GuardrailCustomWord
) => any;
export declare const GuardrailManagedWordFilterSensitiveLog: (
  obj: GuardrailManagedWord
) => any;
export declare const GuardrailWordPolicyAssessmentFilterSensitiveLog: (
  obj: GuardrailWordPolicyAssessment
) => any;
export declare const GuardrailAssessmentFilterSensitiveLog: (
  obj: GuardrailAssessment
) => any;
export declare const GuardrailTraceFilterSensitiveLog: (
  obj: GuardrailTrace
) => any;
export declare const KnowledgeBaseLookupInputFilterSensitiveLog: (
  obj: KnowledgeBaseLookupInput
) => any;
export declare const InvocationInputFilterSensitiveLog: (
  obj: InvocationInput
) => any;
export declare const ModelInvocationInputFilterSensitiveLog: (
  obj: ModelInvocationInput
) => any;
export declare const UsageFilterSensitiveLog: (obj: Usage) => any;
export declare const MetadataFilterSensitiveLog: (obj: Metadata) => any;
export declare const RawResponseFilterSensitiveLog: (obj: RawResponse) => any;
export declare const ReasoningTextBlockFilterSensitiveLog: (
  obj: ReasoningTextBlock
) => any;
export declare const ReasoningContentBlockFilterSensitiveLog: (
  obj: ReasoningContentBlock
) => any;
export declare const OrchestrationModelInvocationOutputFilterSensitiveLog: (
  obj: OrchestrationModelInvocationOutput
) => any;
export declare const FinalResponseFilterSensitiveLog: (
  obj: FinalResponse
) => any;
export declare const KnowledgeBaseLookupOutputFilterSensitiveLog: (
  obj: KnowledgeBaseLookupOutput
) => any;
export declare const RepromptResponseFilterSensitiveLog: (
  obj: RepromptResponse
) => any;
export declare const ObservationFilterSensitiveLog: (obj: Observation) => any;
export declare const RationaleFilterSensitiveLog: (obj: Rationale) => any;
export declare const OrchestrationTraceFilterSensitiveLog: (
  obj: OrchestrationTrace
) => any;
export declare const PostProcessingParsedResponseFilterSensitiveLog: (
  obj: PostProcessingParsedResponse
) => any;
export declare const PostProcessingModelInvocationOutputFilterSensitiveLog: (
  obj: PostProcessingModelInvocationOutput
) => any;
export declare const PostProcessingTraceFilterSensitiveLog: (
  obj: PostProcessingTrace
) => any;
export declare const PreProcessingParsedResponseFilterSensitiveLog: (
  obj: PreProcessingParsedResponse
) => any;
export declare const PreProcessingModelInvocationOutputFilterSensitiveLog: (
  obj: PreProcessingModelInvocationOutput
) => any;
export declare const PreProcessingTraceFilterSensitiveLog: (
  obj: PreProcessingTrace
) => any;
export declare const RoutingClassifierModelInvocationOutputFilterSensitiveLog: (
  obj: RoutingClassifierModelInvocationOutput
) => any;
export declare const RoutingClassifierTraceFilterSensitiveLog: (
  obj: RoutingClassifierTrace
) => any;
export declare const TraceFilterSensitiveLog: (obj: Trace) => any;
export declare const TracePartFilterSensitiveLog: (obj: TracePart) => any;
export declare const ResponseStreamFilterSensitiveLog: (
  obj: ResponseStream
) => any;
export declare const InvokeAgentResponseFilterSensitiveLog: (
  obj: InvokeAgentResponse
) => any;
export declare const CollaboratorConfigurationFilterSensitiveLog: (
  obj: CollaboratorConfiguration
) => any;
export declare const PromptConfigurationFilterSensitiveLog: (
  obj: PromptConfiguration
) => any;
export declare const PromptOverrideConfigurationFilterSensitiveLog: (
  obj: PromptOverrideConfiguration
) => any;
export declare const InlineSessionStateFilterSensitiveLog: (
  obj: InlineSessionState
) => any;
export declare const InlineAgentPayloadPartFilterSensitiveLog: (
  obj: InlineAgentPayloadPart
) => any;
export declare const InlineAgentFilePartFilterSensitiveLog: (
  obj: InlineAgentFilePart
) => any;
export declare const InlineAgentReturnControlPayloadFilterSensitiveLog: (
  obj: InlineAgentReturnControlPayload
) => any;
export declare const InlineAgentTracePartFilterSensitiveLog: (
  obj: InlineAgentTracePart
) => any;
export declare const InlineAgentResponseStreamFilterSensitiveLog: (
  obj: InlineAgentResponseStream
) => any;
export declare const InvokeInlineAgentResponseFilterSensitiveLog: (
  obj: InvokeInlineAgentResponse
) => any;
export declare const TextPromptFilterSensitiveLog: (obj: TextPrompt) => any;
export declare const InputPromptFilterSensitiveLog: (obj: InputPrompt) => any;
export declare const OptimizePromptRequestFilterSensitiveLog: (
  obj: OptimizePromptRequest
) => any;
export declare const AnalyzePromptEventFilterSensitiveLog: (
  obj: AnalyzePromptEvent
) => any;
export declare const OptimizedPromptFilterSensitiveLog: (
  obj: OptimizedPrompt
) => any;
export declare const OptimizedPromptEventFilterSensitiveLog: (
  obj: OptimizedPromptEvent
) => any;
export declare const OptimizedPromptStreamFilterSensitiveLog: (
  obj: OptimizedPromptStream
) => any;
export declare const OptimizePromptResponseFilterSensitiveLog: (
  obj: OptimizePromptResponse
) => any;
export declare const RerankTextDocumentFilterSensitiveLog: (
  obj: RerankTextDocument
) => any;
export declare const RerankQueryFilterSensitiveLog: (obj: RerankQuery) => any;
export declare const RerankDocumentFilterSensitiveLog: (
  obj: RerankDocument
) => any;
export declare const RerankSourceFilterSensitiveLog: (obj: RerankSource) => any;
export declare const RerankRequestFilterSensitiveLog: (
  obj: RerankRequest
) => any;
export declare const RerankResultFilterSensitiveLog: (obj: RerankResult) => any;
export declare const RerankResponseFilterSensitiveLog: (
  obj: RerankResponse
) => any;
export declare const RetrieveAndGenerateInputFilterSensitiveLog: (
  obj: RetrieveAndGenerateInput
) => any;
export declare const PromptTemplateFilterSensitiveLog: (
  obj: PromptTemplate
) => any;
export declare const ExternalSourcesGenerationConfigurationFilterSensitiveLog: (
  obj: ExternalSourcesGenerationConfiguration
) => any;
export declare const ByteContentDocFilterSensitiveLog: (
  obj: ByteContentDoc
) => any;
export declare const ExternalSourceFilterSensitiveLog: (
  obj: ExternalSource
) => any;
export declare const ExternalSourcesRetrieveAndGenerateConfigurationFilterSensitiveLog: (
  obj: ExternalSourcesRetrieveAndGenerateConfiguration
) => any;
export declare const GenerationConfigurationFilterSensitiveLog: (
  obj: GenerationConfiguration
) => any;
export declare const OrchestrationConfigurationFilterSensitiveLog: (
  obj: OrchestrationConfiguration
) => any;
export declare const RetrieveAndGenerateOutputFilterSensitiveLog: (
  obj: RetrieveAndGenerateOutput
) => any;
export declare const RetrieveAndGenerateResponseFilterSensitiveLog: (
  obj: RetrieveAndGenerateResponse
) => any;
export declare const CitationEventFilterSensitiveLog: (
  obj: CitationEvent
) => any;
export declare const RetrieveAndGenerateOutputEventFilterSensitiveLog: (
  obj: RetrieveAndGenerateOutputEvent
) => any;
export declare const RetrieveAndGenerateStreamResponseOutputFilterSensitiveLog: (
  obj: RetrieveAndGenerateStreamResponseOutput
) => any;
export declare const RetrieveAndGenerateStreamResponseFilterSensitiveLog: (
  obj: RetrieveAndGenerateStreamResponse
) => any;
export declare const KnowledgeBaseQueryFilterSensitiveLog: (
  obj: KnowledgeBaseQuery
) => any;
export declare const KnowledgeBaseRetrievalResultFilterSensitiveLog: (
  obj: KnowledgeBaseRetrievalResult
) => any;
export declare const RetrieveResponseFilterSensitiveLog: (
  obj: RetrieveResponse
) => any;
export declare const BedrockSessionContentBlockFilterSensitiveLog: (
  obj: BedrockSessionContentBlock
) => any;
export declare const InvocationStepPayloadFilterSensitiveLog: (
  obj: InvocationStepPayload
) => any;
export declare const InvocationStepFilterSensitiveLog: (
  obj: InvocationStep
) => any;
export declare const GetInvocationStepResponseFilterSensitiveLog: (
  obj: GetInvocationStepResponse
) => any;
export declare const PutInvocationStepRequestFilterSensitiveLog: (
  obj: PutInvocationStepRequest
) => any;
