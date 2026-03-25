import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { BedrockAgentRuntimeServiceException as __BaseException } from "./BedrockAgentRuntimeServiceException";
export class AccessDeniedException extends __BaseException {
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
}
export const CustomControlMethod = {
    RETURN_CONTROL: "RETURN_CONTROL",
};
export var ActionGroupExecutor;
(function (ActionGroupExecutor) {
    ActionGroupExecutor.visit = (value, visitor) => {
        if (value.lambda !== undefined)
            return visitor.lambda(value.lambda);
        if (value.customControl !== undefined)
            return visitor.customControl(value.customControl);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ActionGroupExecutor || (ActionGroupExecutor = {}));
export const ExecutionType = {
    LAMBDA: "LAMBDA",
    RETURN_CONTROL: "RETURN_CONTROL",
};
export const ActionGroupSignature = {
    AMAZON_CODEINTERPRETER: "AMAZON.CodeInterpreter",
    AMAZON_USERINPUT: "AMAZON.UserInput",
    ANTHROPIC_BASH: "ANTHROPIC.Bash",
    ANTHROPIC_COMPUTER: "ANTHROPIC.Computer",
    ANTHROPIC_TEXTEDITOR: "ANTHROPIC.TextEditor",
};
export const ActionInvocationType = {
    RESULT: "RESULT",
    USER_CONFIRMATION: "USER_CONFIRMATION",
    USER_CONFIRMATION_AND_RESULT: "USER_CONFIRMATION_AND_RESULT",
};
export var APISchema;
(function (APISchema) {
    APISchema.visit = (value, visitor) => {
        if (value.s3 !== undefined)
            return visitor.s3(value.s3);
        if (value.payload !== undefined)
            return visitor.payload(value.payload);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(APISchema || (APISchema = {}));
export const ParameterType = {
    ARRAY: "array",
    BOOLEAN: "boolean",
    INTEGER: "integer",
    NUMBER: "number",
    STRING: "string",
};
export const RequireConfirmation = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
export var FunctionSchema;
(function (FunctionSchema) {
    FunctionSchema.visit = (value, visitor) => {
        if (value.functions !== undefined)
            return visitor.functions(value.functions);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FunctionSchema || (FunctionSchema = {}));
export const AgentCollaboration = {
    DISABLED: "DISABLED",
    SUPERVISOR: "SUPERVISOR",
    SUPERVISOR_ROUTER: "SUPERVISOR_ROUTER",
};
export const ConfirmationState = {
    CONFIRM: "CONFIRM",
    DENY: "DENY",
};
export const ImageInputFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
export var ImageInputSource;
(function (ImageInputSource) {
    ImageInputSource.visit = (value, visitor) => {
        if (value.bytes !== undefined)
            return visitor.bytes(value.bytes);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ImageInputSource || (ImageInputSource = {}));
export const ResponseState = {
    FAILURE: "FAILURE",
    REPROMPT: "REPROMPT",
};
export var InvocationResultMember;
(function (InvocationResultMember) {
    InvocationResultMember.visit = (value, visitor) => {
        if (value.apiResult !== undefined)
            return visitor.apiResult(value.apiResult);
        if (value.functionResult !== undefined)
            return visitor.functionResult(value.functionResult);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(InvocationResultMember || (InvocationResultMember = {}));
export const PayloadType = {
    RETURN_CONTROL: "RETURN_CONTROL",
    TEXT: "TEXT",
};
export var InvocationInputMember;
(function (InvocationInputMember) {
    InvocationInputMember.visit = (value, visitor) => {
        if (value.apiInvocationInput !== undefined)
            return visitor.apiInvocationInput(value.apiInvocationInput);
        if (value.functionInvocationInput !== undefined)
            return visitor.functionInvocationInput(value.functionInvocationInput);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(InvocationInputMember || (InvocationInputMember = {}));
export class BadGatewayException extends __BaseException {
    name = "BadGatewayException";
    $fault = "server";
    resourceName;
    constructor(opts) {
        super({
            name: "BadGatewayException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, BadGatewayException.prototype);
        this.resourceName = opts.resourceName;
    }
}
export class ConflictException extends __BaseException {
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
}
export class DependencyFailedException extends __BaseException {
    name = "DependencyFailedException";
    $fault = "client";
    resourceName;
    constructor(opts) {
        super({
            name: "DependencyFailedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DependencyFailedException.prototype);
        this.resourceName = opts.resourceName;
    }
}
export class InternalServerException extends __BaseException {
    name = "InternalServerException";
    $fault = "server";
    reason;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.reason = opts.reason;
    }
}
export var FlowInputContent;
(function (FlowInputContent) {
    FlowInputContent.visit = (value, visitor) => {
        if (value.document !== undefined)
            return visitor.document(value.document);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowInputContent || (FlowInputContent = {}));
export const PerformanceConfigLatency = {
    OPTIMIZED: "optimized",
    STANDARD: "standard",
};
export const FlowCompletionReason = {
    INPUT_REQUIRED: "INPUT_REQUIRED",
    SUCCESS: "SUCCESS",
};
export var FlowMultiTurnInputContent;
(function (FlowMultiTurnInputContent) {
    FlowMultiTurnInputContent.visit = (value, visitor) => {
        if (value.document !== undefined)
            return visitor.document(value.document);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowMultiTurnInputContent || (FlowMultiTurnInputContent = {}));
export const NodeType = {
    CONDITION_NODE: "ConditionNode",
    FLOW_INPUT_NODE: "FlowInputNode",
    FLOW_OUTPUT_NODE: "FlowOutputNode",
    KNOWLEDGE_BASE_NODE: "KnowledgeBaseNode",
    LAMBDA_FUNCTION_NODE: "LambdaFunctionNode",
    LEX_NODE: "LexNode",
    PROMPT_NODE: "PromptNode",
};
export var FlowOutputContent;
(function (FlowOutputContent) {
    FlowOutputContent.visit = (value, visitor) => {
        if (value.document !== undefined)
            return visitor.document(value.document);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowOutputContent || (FlowOutputContent = {}));
export var FlowTraceNodeInputContent;
(function (FlowTraceNodeInputContent) {
    FlowTraceNodeInputContent.visit = (value, visitor) => {
        if (value.document !== undefined)
            return visitor.document(value.document);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowTraceNodeInputContent || (FlowTraceNodeInputContent = {}));
export var FlowTraceNodeOutputContent;
(function (FlowTraceNodeOutputContent) {
    FlowTraceNodeOutputContent.visit = (value, visitor) => {
        if (value.document !== undefined)
            return visitor.document(value.document);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowTraceNodeOutputContent || (FlowTraceNodeOutputContent = {}));
export var FlowTrace;
(function (FlowTrace) {
    FlowTrace.visit = (value, visitor) => {
        if (value.nodeInputTrace !== undefined)
            return visitor.nodeInputTrace(value.nodeInputTrace);
        if (value.nodeOutputTrace !== undefined)
            return visitor.nodeOutputTrace(value.nodeOutputTrace);
        if (value.conditionNodeResultTrace !== undefined)
            return visitor.conditionNodeResultTrace(value.conditionNodeResultTrace);
        if (value.nodeActionTrace !== undefined)
            return visitor.nodeActionTrace(value.nodeActionTrace);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowTrace || (FlowTrace = {}));
export class ResourceNotFoundException extends __BaseException {
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
}
export class ServiceQuotaExceededException extends __BaseException {
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
}
export class ThrottlingException extends __BaseException {
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
}
export class ValidationException extends __BaseException {
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
}
export var FlowResponseStream;
(function (FlowResponseStream) {
    FlowResponseStream.visit = (value, visitor) => {
        if (value.flowOutputEvent !== undefined)
            return visitor.flowOutputEvent(value.flowOutputEvent);
        if (value.flowCompletionEvent !== undefined)
            return visitor.flowCompletionEvent(value.flowCompletionEvent);
        if (value.flowTraceEvent !== undefined)
            return visitor.flowTraceEvent(value.flowTraceEvent);
        if (value.internalServerException !== undefined)
            return visitor.internalServerException(value.internalServerException);
        if (value.validationException !== undefined)
            return visitor.validationException(value.validationException);
        if (value.resourceNotFoundException !== undefined)
            return visitor.resourceNotFoundException(value.resourceNotFoundException);
        if (value.serviceQuotaExceededException !== undefined)
            return visitor.serviceQuotaExceededException(value.serviceQuotaExceededException);
        if (value.throttlingException !== undefined)
            return visitor.throttlingException(value.throttlingException);
        if (value.accessDeniedException !== undefined)
            return visitor.accessDeniedException(value.accessDeniedException);
        if (value.conflictException !== undefined)
            return visitor.conflictException(value.conflictException);
        if (value.dependencyFailedException !== undefined)
            return visitor.dependencyFailedException(value.dependencyFailedException);
        if (value.badGatewayException !== undefined)
            return visitor.badGatewayException(value.badGatewayException);
        if (value.flowMultiTurnInputRequestEvent !== undefined)
            return visitor.flowMultiTurnInputRequestEvent(value.flowMultiTurnInputRequestEvent);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(FlowResponseStream || (FlowResponseStream = {}));
export const InputQueryType = {
    TEXT: "TEXT",
};
export const QueryTransformationMode = {
    TEXT_TO_SQL: "TEXT_TO_SQL",
};
export const TextToSqlConfigurationType = {
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
export const GeneratedQueryType = {
    REDSHIFT_SQL: "REDSHIFT_SQL",
};
export var ContentBlock;
(function (ContentBlock) {
    ContentBlock.visit = (value, visitor) => {
        if (value.text !== undefined)
            return visitor.text(value.text);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ContentBlock || (ContentBlock = {}));
export const ConversationRole = {
    ASSISTANT: "assistant",
    USER: "user",
};
export const FileSourceType = {
    BYTE_CONTENT: "BYTE_CONTENT",
    S3: "S3",
};
export const FileUseCase = {
    CHAT: "CHAT",
    CODE_INTERPRETER: "CODE_INTERPRETER",
};
export const AttributeType = {
    BOOLEAN: "BOOLEAN",
    NUMBER: "NUMBER",
    STRING: "STRING",
    STRING_LIST: "STRING_LIST",
};
export const SearchType = {
    HYBRID: "HYBRID",
    SEMANTIC: "SEMANTIC",
};
export const RerankingMetadataSelectionMode = {
    ALL: "ALL",
    SELECTIVE: "SELECTIVE",
};
export var RerankingMetadataSelectiveModeConfiguration;
(function (RerankingMetadataSelectiveModeConfiguration) {
    RerankingMetadataSelectiveModeConfiguration.visit = (value, visitor) => {
        if (value.fieldsToInclude !== undefined)
            return visitor.fieldsToInclude(value.fieldsToInclude);
        if (value.fieldsToExclude !== undefined)
            return visitor.fieldsToExclude(value.fieldsToExclude);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(RerankingMetadataSelectiveModeConfiguration || (RerankingMetadataSelectiveModeConfiguration = {}));
export const VectorSearchRerankingConfigurationType = {
    BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL",
};
export const RetrievalResultContentColumnType = {
    BLOB: "BLOB",
    BOOLEAN: "BOOLEAN",
    DOUBLE: "DOUBLE",
    LONG: "LONG",
    NULL: "NULL",
    STRING: "STRING",
};
export const RetrievalResultContentType = {
    IMAGE: "IMAGE",
    ROW: "ROW",
    TEXT: "TEXT",
};
export const RetrievalResultLocationType = {
    CONFLUENCE: "CONFLUENCE",
    CUSTOM: "CUSTOM",
    KENDRA: "KENDRA",
    S3: "S3",
    SALESFORCE: "SALESFORCE",
    SHAREPOINT: "SHAREPOINT",
    SQL: "SQL",
    WEB: "WEB",
};
export class ModelNotReadyException extends __BaseException {
    name = "ModelNotReadyException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ModelNotReadyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelNotReadyException.prototype);
    }
}
export var Caller;
(function (Caller) {
    Caller.visit = (value, visitor) => {
        if (value.agentAliasArn !== undefined)
            return visitor.agentAliasArn(value.agentAliasArn);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(Caller || (Caller = {}));
export const GuardrailAction = {
    INTERVENED: "INTERVENED",
    NONE: "NONE",
};
export const GuardrailContentPolicyAction = {
    BLOCKED: "BLOCKED",
};
export const GuardrailContentFilterConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
export const GuardrailContentFilterType = {
    HATE: "HATE",
    INSULTS: "INSULTS",
    MISCONDUCT: "MISCONDUCT",
    PROMPT_ATTACK: "PROMPT_ATTACK",
    SEXUAL: "SEXUAL",
    VIOLENCE: "VIOLENCE",
};
export const GuardrailSensitiveInformationPolicyAction = {
    ANONYMIZED: "ANONYMIZED",
    BLOCKED: "BLOCKED",
};
export const GuardrailPiiEntityType = {
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
export const GuardrailTopicPolicyAction = {
    BLOCKED: "BLOCKED",
};
export const GuardrailTopicType = {
    DENY: "DENY",
};
export const GuardrailWordPolicyAction = {
    BLOCKED: "BLOCKED",
};
export const GuardrailManagedWordType = {
    PROFANITY: "PROFANITY",
};
export const InvocationType = {
    ACTION_GROUP: "ACTION_GROUP",
    ACTION_GROUP_CODE_INTERPRETER: "ACTION_GROUP_CODE_INTERPRETER",
    AGENT_COLLABORATOR: "AGENT_COLLABORATOR",
    FINISH: "FINISH",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
export const CreationMode = {
    DEFAULT: "DEFAULT",
    OVERRIDDEN: "OVERRIDDEN",
};
export const PromptType = {
    KNOWLEDGE_BASE_RESPONSE_GENERATION: "KNOWLEDGE_BASE_RESPONSE_GENERATION",
    ORCHESTRATION: "ORCHESTRATION",
    POST_PROCESSING: "POST_PROCESSING",
    PRE_PROCESSING: "PRE_PROCESSING",
    ROUTING_CLASSIFIER: "ROUTING_CLASSIFIER",
};
export var ReasoningContentBlock;
(function (ReasoningContentBlock) {
    ReasoningContentBlock.visit = (value, visitor) => {
        if (value.reasoningText !== undefined)
            return visitor.reasoningText(value.reasoningText);
        if (value.redactedContent !== undefined)
            return visitor.redactedContent(value.redactedContent);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ReasoningContentBlock || (ReasoningContentBlock = {}));
export const Source = {
    ACTION_GROUP: "ACTION_GROUP",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
    PARSER: "PARSER",
};
export const Type = {
    ACTION_GROUP: "ACTION_GROUP",
    AGENT_COLLABORATOR: "AGENT_COLLABORATOR",
    ASK_USER: "ASK_USER",
    FINISH: "FINISH",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
    REPROMPT: "REPROMPT",
};
export var OrchestrationTrace;
(function (OrchestrationTrace) {
    OrchestrationTrace.visit = (value, visitor) => {
        if (value.rationale !== undefined)
            return visitor.rationale(value.rationale);
        if (value.invocationInput !== undefined)
            return visitor.invocationInput(value.invocationInput);
        if (value.observation !== undefined)
            return visitor.observation(value.observation);
        if (value.modelInvocationInput !== undefined)
            return visitor.modelInvocationInput(value.modelInvocationInput);
        if (value.modelInvocationOutput !== undefined)
            return visitor.modelInvocationOutput(value.modelInvocationOutput);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(OrchestrationTrace || (OrchestrationTrace = {}));
export var PostProcessingTrace;
(function (PostProcessingTrace) {
    PostProcessingTrace.visit = (value, visitor) => {
        if (value.modelInvocationInput !== undefined)
            return visitor.modelInvocationInput(value.modelInvocationInput);
        if (value.modelInvocationOutput !== undefined)
            return visitor.modelInvocationOutput(value.modelInvocationOutput);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(PostProcessingTrace || (PostProcessingTrace = {}));
export var PreProcessingTrace;
(function (PreProcessingTrace) {
    PreProcessingTrace.visit = (value, visitor) => {
        if (value.modelInvocationInput !== undefined)
            return visitor.modelInvocationInput(value.modelInvocationInput);
        if (value.modelInvocationOutput !== undefined)
            return visitor.modelInvocationOutput(value.modelInvocationOutput);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(PreProcessingTrace || (PreProcessingTrace = {}));
export var RoutingClassifierTrace;
(function (RoutingClassifierTrace) {
    RoutingClassifierTrace.visit = (value, visitor) => {
        if (value.invocationInput !== undefined)
            return visitor.invocationInput(value.invocationInput);
        if (value.observation !== undefined)
            return visitor.observation(value.observation);
        if (value.modelInvocationInput !== undefined)
            return visitor.modelInvocationInput(value.modelInvocationInput);
        if (value.modelInvocationOutput !== undefined)
            return visitor.modelInvocationOutput(value.modelInvocationOutput);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(RoutingClassifierTrace || (RoutingClassifierTrace = {}));
export var Trace;
(function (Trace) {
    Trace.visit = (value, visitor) => {
        if (value.guardrailTrace !== undefined)
            return visitor.guardrailTrace(value.guardrailTrace);
        if (value.preProcessingTrace !== undefined)
            return visitor.preProcessingTrace(value.preProcessingTrace);
        if (value.orchestrationTrace !== undefined)
            return visitor.orchestrationTrace(value.orchestrationTrace);
        if (value.postProcessingTrace !== undefined)
            return visitor.postProcessingTrace(value.postProcessingTrace);
        if (value.routingClassifierTrace !== undefined)
            return visitor.routingClassifierTrace(value.routingClassifierTrace);
        if (value.failureTrace !== undefined)
            return visitor.failureTrace(value.failureTrace);
        if (value.customOrchestrationTrace !== undefined)
            return visitor.customOrchestrationTrace(value.customOrchestrationTrace);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(Trace || (Trace = {}));
export var ResponseStream;
(function (ResponseStream) {
    ResponseStream.visit = (value, visitor) => {
        if (value.chunk !== undefined)
            return visitor.chunk(value.chunk);
        if (value.trace !== undefined)
            return visitor.trace(value.trace);
        if (value.returnControl !== undefined)
            return visitor.returnControl(value.returnControl);
        if (value.internalServerException !== undefined)
            return visitor.internalServerException(value.internalServerException);
        if (value.validationException !== undefined)
            return visitor.validationException(value.validationException);
        if (value.resourceNotFoundException !== undefined)
            return visitor.resourceNotFoundException(value.resourceNotFoundException);
        if (value.serviceQuotaExceededException !== undefined)
            return visitor.serviceQuotaExceededException(value.serviceQuotaExceededException);
        if (value.throttlingException !== undefined)
            return visitor.throttlingException(value.throttlingException);
        if (value.accessDeniedException !== undefined)
            return visitor.accessDeniedException(value.accessDeniedException);
        if (value.conflictException !== undefined)
            return visitor.conflictException(value.conflictException);
        if (value.dependencyFailedException !== undefined)
            return visitor.dependencyFailedException(value.dependencyFailedException);
        if (value.badGatewayException !== undefined)
            return visitor.badGatewayException(value.badGatewayException);
        if (value.modelNotReadyException !== undefined)
            return visitor.modelNotReadyException(value.modelNotReadyException);
        if (value.files !== undefined)
            return visitor.files(value.files);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ResponseStream || (ResponseStream = {}));
export const RelayConversationHistory = {
    DISABLED: "DISABLED",
    TO_COLLABORATOR: "TO_COLLABORATOR",
};
export const PromptState = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
export var OrchestrationExecutor;
(function (OrchestrationExecutor) {
    OrchestrationExecutor.visit = (value, visitor) => {
        if (value.lambda !== undefined)
            return visitor.lambda(value.lambda);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(OrchestrationExecutor || (OrchestrationExecutor = {}));
export const OrchestrationType = {
    CUSTOM_ORCHESTRATION: "CUSTOM_ORCHESTRATION",
    DEFAULT: "DEFAULT",
};
export var InlineAgentResponseStream;
(function (InlineAgentResponseStream) {
    InlineAgentResponseStream.visit = (value, visitor) => {
        if (value.chunk !== undefined)
            return visitor.chunk(value.chunk);
        if (value.trace !== undefined)
            return visitor.trace(value.trace);
        if (value.returnControl !== undefined)
            return visitor.returnControl(value.returnControl);
        if (value.internalServerException !== undefined)
            return visitor.internalServerException(value.internalServerException);
        if (value.validationException !== undefined)
            return visitor.validationException(value.validationException);
        if (value.resourceNotFoundException !== undefined)
            return visitor.resourceNotFoundException(value.resourceNotFoundException);
        if (value.serviceQuotaExceededException !== undefined)
            return visitor.serviceQuotaExceededException(value.serviceQuotaExceededException);
        if (value.throttlingException !== undefined)
            return visitor.throttlingException(value.throttlingException);
        if (value.accessDeniedException !== undefined)
            return visitor.accessDeniedException(value.accessDeniedException);
        if (value.conflictException !== undefined)
            return visitor.conflictException(value.conflictException);
        if (value.dependencyFailedException !== undefined)
            return visitor.dependencyFailedException(value.dependencyFailedException);
        if (value.badGatewayException !== undefined)
            return visitor.badGatewayException(value.badGatewayException);
        if (value.files !== undefined)
            return visitor.files(value.files);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(InlineAgentResponseStream || (InlineAgentResponseStream = {}));
export const MemoryType = {
    SESSION_SUMMARY: "SESSION_SUMMARY",
};
export var Memory;
(function (Memory) {
    Memory.visit = (value, visitor) => {
        if (value.sessionSummary !== undefined)
            return visitor.sessionSummary(value.sessionSummary);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(Memory || (Memory = {}));
export var InputPrompt;
(function (InputPrompt) {
    InputPrompt.visit = (value, visitor) => {
        if (value.textPrompt !== undefined)
            return visitor.textPrompt(value.textPrompt);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(InputPrompt || (InputPrompt = {}));
export var OptimizedPrompt;
(function (OptimizedPrompt) {
    OptimizedPrompt.visit = (value, visitor) => {
        if (value.textPrompt !== undefined)
            return visitor.textPrompt(value.textPrompt);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(OptimizedPrompt || (OptimizedPrompt = {}));
export var OptimizedPromptStream;
(function (OptimizedPromptStream) {
    OptimizedPromptStream.visit = (value, visitor) => {
        if (value.optimizedPromptEvent !== undefined)
            return visitor.optimizedPromptEvent(value.optimizedPromptEvent);
        if (value.analyzePromptEvent !== undefined)
            return visitor.analyzePromptEvent(value.analyzePromptEvent);
        if (value.internalServerException !== undefined)
            return visitor.internalServerException(value.internalServerException);
        if (value.throttlingException !== undefined)
            return visitor.throttlingException(value.throttlingException);
        if (value.validationException !== undefined)
            return visitor.validationException(value.validationException);
        if (value.dependencyFailedException !== undefined)
            return visitor.dependencyFailedException(value.dependencyFailedException);
        if (value.accessDeniedException !== undefined)
            return visitor.accessDeniedException(value.accessDeniedException);
        if (value.badGatewayException !== undefined)
            return visitor.badGatewayException(value.badGatewayException);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(OptimizedPromptStream || (OptimizedPromptStream = {}));
export const RerankQueryContentType = {
    TEXT: "TEXT",
};
export const RerankingConfigurationType = {
    BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL",
};
export const RerankDocumentType = {
    JSON: "JSON",
    TEXT: "TEXT",
};
export const RerankSourceType = {
    INLINE: "INLINE",
};
export const ExternalSourceType = {
    BYTE_CONTENT: "BYTE_CONTENT",
    S3: "S3",
};
export const QueryTransformationType = {
    QUERY_DECOMPOSITION: "QUERY_DECOMPOSITION",
};
export const RetrieveAndGenerateType = {
    EXTERNAL_SOURCES: "EXTERNAL_SOURCES",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
export const GuadrailAction = {
    INTERVENED: "INTERVENED",
    NONE: "NONE",
};
export var RetrieveAndGenerateStreamResponseOutput;
(function (RetrieveAndGenerateStreamResponseOutput) {
    RetrieveAndGenerateStreamResponseOutput.visit = (value, visitor) => {
        if (value.output !== undefined)
            return visitor.output(value.output);
        if (value.citation !== undefined)
            return visitor.citation(value.citation);
        if (value.guardrail !== undefined)
            return visitor.guardrail(value.guardrail);
        if (value.internalServerException !== undefined)
            return visitor.internalServerException(value.internalServerException);
        if (value.validationException !== undefined)
            return visitor.validationException(value.validationException);
        if (value.resourceNotFoundException !== undefined)
            return visitor.resourceNotFoundException(value.resourceNotFoundException);
        if (value.serviceQuotaExceededException !== undefined)
            return visitor.serviceQuotaExceededException(value.serviceQuotaExceededException);
        if (value.throttlingException !== undefined)
            return visitor.throttlingException(value.throttlingException);
        if (value.accessDeniedException !== undefined)
            return visitor.accessDeniedException(value.accessDeniedException);
        if (value.conflictException !== undefined)
            return visitor.conflictException(value.conflictException);
        if (value.dependencyFailedException !== undefined)
            return visitor.dependencyFailedException(value.dependencyFailedException);
        if (value.badGatewayException !== undefined)
            return visitor.badGatewayException(value.badGatewayException);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(RetrieveAndGenerateStreamResponseOutput || (RetrieveAndGenerateStreamResponseOutput = {}));
export const SessionStatus = {
    ACTIVE: "ACTIVE",
    ENDED: "ENDED",
    EXPIRED: "EXPIRED",
};
export const ImageFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
export var ImageSource;
(function (ImageSource) {
    ImageSource.visit = (value, visitor) => {
        if (value.bytes !== undefined)
            return visitor.bytes(value.bytes);
        if (value.s3Location !== undefined)
            return visitor.s3Location(value.s3Location);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(ImageSource || (ImageSource = {}));
export var BedrockSessionContentBlock;
(function (BedrockSessionContentBlock) {
    BedrockSessionContentBlock.visit = (value, visitor) => {
        if (value.text !== undefined)
            return visitor.text(value.text);
        if (value.image !== undefined)
            return visitor.image(value.image);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(BedrockSessionContentBlock || (BedrockSessionContentBlock = {}));
export var InvocationStepPayload;
(function (InvocationStepPayload) {
    InvocationStepPayload.visit = (value, visitor) => {
        if (value.contentBlocks !== undefined)
            return visitor.contentBlocks(value.contentBlocks);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(InvocationStepPayload || (InvocationStepPayload = {}));
export const ActionGroupInvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.actionGroupName && { actionGroupName: SENSITIVE_STRING }),
    ...(obj.verb && { verb: SENSITIVE_STRING }),
    ...(obj.apiPath && { apiPath: SENSITIVE_STRING }),
    ...(obj.function && { function: SENSITIVE_STRING }),
});
export const ActionGroupInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
});
export const APISchemaFilterSensitiveLog = (obj) => {
    if (obj.s3 !== undefined)
        return { s3: obj.s3 };
    if (obj.payload !== undefined)
        return { payload: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const FunctionDefinitionFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.name && { name: SENSITIVE_STRING }),
});
export const FunctionSchemaFilterSensitiveLog = (obj) => {
    if (obj.functions !== undefined)
        return { functions: obj.functions.map((item) => FunctionDefinitionFilterSensitiveLog(item)) };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const AgentActionGroupFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.actionGroupName && { actionGroupName: SENSITIVE_STRING }),
    ...(obj.description && { description: SENSITIVE_STRING }),
    ...(obj.actionGroupExecutor && { actionGroupExecutor: obj.actionGroupExecutor }),
    ...(obj.apiSchema && { apiSchema: APISchemaFilterSensitiveLog(obj.apiSchema) }),
    ...(obj.functionSchema && { functionSchema: FunctionSchemaFilterSensitiveLog(obj.functionSchema) }),
});
export const ApiResultFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.apiPath && { apiPath: SENSITIVE_STRING }),
    ...(obj.responseBody && {
        responseBody: Object.entries(obj.responseBody).reduce((acc, [key, value]) => ((acc[key] = value), acc), {}),
    }),
});
export const InvocationResultMemberFilterSensitiveLog = (obj) => {
    if (obj.apiResult !== undefined)
        return { apiResult: ApiResultFilterSensitiveLog(obj.apiResult) };
    if (obj.functionResult !== undefined)
        return { functionResult: obj.functionResult };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const ReturnControlResultsFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.returnControlInvocationResults && {
        returnControlInvocationResults: obj.returnControlInvocationResults.map((item) => InvocationResultMemberFilterSensitiveLog(item)),
    }),
});
export const AgentCollaboratorInputPayloadFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
    ...(obj.returnControlResults && {
        returnControlResults: ReturnControlResultsFilterSensitiveLog(obj.returnControlResults),
    }),
});
export const AgentCollaboratorInvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.input && { input: AgentCollaboratorInputPayloadFilterSensitiveLog(obj.input) }),
});
export const ApiInvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.apiPath && { apiPath: SENSITIVE_STRING }),
    ...(obj.collaboratorName && { collaboratorName: SENSITIVE_STRING }),
});
export const FunctionInvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.collaboratorName && { collaboratorName: SENSITIVE_STRING }),
});
export const InvocationInputMemberFilterSensitiveLog = (obj) => {
    if (obj.apiInvocationInput !== undefined)
        return { apiInvocationInput: ApiInvocationInputFilterSensitiveLog(obj.apiInvocationInput) };
    if (obj.functionInvocationInput !== undefined)
        return { functionInvocationInput: FunctionInvocationInputFilterSensitiveLog(obj.functionInvocationInput) };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const ReturnControlPayloadFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.invocationInputs && {
        invocationInputs: obj.invocationInputs.map((item) => InvocationInputMemberFilterSensitiveLog(item)),
    }),
});
export const AgentCollaboratorOutputPayloadFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
    ...(obj.returnControlPayload && { returnControlPayload: SENSITIVE_STRING }),
});
export const AgentCollaboratorInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.output && { output: AgentCollaboratorOutputPayloadFilterSensitiveLog(obj.output) }),
});
export const FlowInputContentFilterSensitiveLog = (obj) => {
    if (obj.document !== undefined)
        return { document: obj.document };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const FlowInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: SENSITIVE_STRING }),
});
export const InvokeFlowRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.inputs && { inputs: obj.inputs.map((item) => FlowInputFilterSensitiveLog(item)) }),
});
export const FlowCompletionEventFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const FlowMultiTurnInputRequestEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: obj.content }),
});
export const FlowOutputEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: obj.content }),
});
export const FlowTraceConditionFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const FlowTraceConditionNodeResultEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.satisfiedConditions && { satisfiedConditions: SENSITIVE_STRING }),
});
export const FlowTraceNodeActionEventFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const FlowTraceNodeInputContentFilterSensitiveLog = (obj) => {
    if (obj.document !== undefined)
        return { document: obj.document };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const FlowTraceNodeInputFieldFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: SENSITIVE_STRING }),
});
export const FlowTraceNodeInputEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.fields && { fields: SENSITIVE_STRING }),
});
export const FlowTraceNodeOutputFieldFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: obj.content }),
});
export const FlowTraceNodeOutputEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.fields && { fields: SENSITIVE_STRING }),
});
export const FlowTraceFilterSensitiveLog = (obj) => {
    if (obj.nodeInputTrace !== undefined)
        return { nodeInputTrace: SENSITIVE_STRING };
    if (obj.nodeOutputTrace !== undefined)
        return { nodeOutputTrace: SENSITIVE_STRING };
    if (obj.conditionNodeResultTrace !== undefined)
        return { conditionNodeResultTrace: SENSITIVE_STRING };
    if (obj.nodeActionTrace !== undefined)
        return { nodeActionTrace: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const FlowTraceEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.trace && { trace: SENSITIVE_STRING }),
});
export const FlowResponseStreamFilterSensitiveLog = (obj) => {
    if (obj.flowOutputEvent !== undefined)
        return { flowOutputEvent: SENSITIVE_STRING };
    if (obj.flowCompletionEvent !== undefined)
        return { flowCompletionEvent: SENSITIVE_STRING };
    if (obj.flowTraceEvent !== undefined)
        return { flowTraceEvent: FlowTraceEventFilterSensitiveLog(obj.flowTraceEvent) };
    if (obj.internalServerException !== undefined)
        return { internalServerException: obj.internalServerException };
    if (obj.validationException !== undefined)
        return { validationException: obj.validationException };
    if (obj.resourceNotFoundException !== undefined)
        return { resourceNotFoundException: obj.resourceNotFoundException };
    if (obj.serviceQuotaExceededException !== undefined)
        return { serviceQuotaExceededException: obj.serviceQuotaExceededException };
    if (obj.throttlingException !== undefined)
        return { throttlingException: obj.throttlingException };
    if (obj.accessDeniedException !== undefined)
        return { accessDeniedException: obj.accessDeniedException };
    if (obj.conflictException !== undefined)
        return { conflictException: obj.conflictException };
    if (obj.dependencyFailedException !== undefined)
        return { dependencyFailedException: obj.dependencyFailedException };
    if (obj.badGatewayException !== undefined)
        return { badGatewayException: obj.badGatewayException };
    if (obj.flowMultiTurnInputRequestEvent !== undefined)
        return { flowMultiTurnInputRequestEvent: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const InvokeFlowResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.responseStream && { responseStream: "STREAMING_CONTENT" }),
});
export const QueryGenerationInputFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GenerateQueryRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.queryGenerationInput && { queryGenerationInput: SENSITIVE_STRING }),
});
export const GeneratedQueryFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GenerateQueryResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.queries && { queries: SENSITIVE_STRING }),
});
export const ContentBlockFilterSensitiveLog = (obj) => {
    if (obj.text !== undefined)
        return { text: obj.text };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const MessageFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: SENSITIVE_STRING }),
});
export const ConversationHistoryFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.messages && { messages: obj.messages.map((item) => MessageFilterSensitiveLog(item)) }),
});
export const ByteContentFileFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.data && { data: SENSITIVE_STRING }),
});
export const FileSourceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.byteContent && { byteContent: ByteContentFileFilterSensitiveLog(obj.byteContent) }),
});
export const InputFileFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.source && { source: FileSourceFilterSensitiveLog(obj.source) }),
});
export const MetadataAttributeSchemaFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const ImplicitFilterConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.metadataAttributes && { metadataAttributes: SENSITIVE_STRING }),
});
export const RerankingMetadataSelectiveModeConfigurationFilterSensitiveLog = (obj) => {
    if (obj.fieldsToInclude !== undefined)
        return { fieldsToInclude: SENSITIVE_STRING };
    if (obj.fieldsToExclude !== undefined)
        return { fieldsToExclude: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const MetadataConfigurationForRerankingFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.selectiveModeConfiguration && {
        selectiveModeConfiguration: RerankingMetadataSelectiveModeConfigurationFilterSensitiveLog(obj.selectiveModeConfiguration),
    }),
});
export const VectorSearchBedrockRerankingConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.metadataConfiguration && {
        metadataConfiguration: MetadataConfigurationForRerankingFilterSensitiveLog(obj.metadataConfiguration),
    }),
});
export const VectorSearchRerankingConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.bedrockRerankingConfiguration && {
        bedrockRerankingConfiguration: VectorSearchBedrockRerankingConfigurationFilterSensitiveLog(obj.bedrockRerankingConfiguration),
    }),
});
export const TextResponsePartFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GeneratedResponsePartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.textResponsePart && { textResponsePart: SENSITIVE_STRING }),
});
export const RetrievalResultContentColumnFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const RetrievalResultContentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.row && { row: SENSITIVE_STRING }),
});
export const RetrievalResultLocationFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const RetrievedReferenceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: SENSITIVE_STRING }),
    ...(obj.location && { location: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
});
export const CitationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.generatedResponsePart && {
        generatedResponsePart: GeneratedResponsePartFilterSensitiveLog(obj.generatedResponsePart),
    }),
    ...(obj.retrievedReferences && {
        retrievedReferences: obj.retrievedReferences.map((item) => RetrievedReferenceFilterSensitiveLog(item)),
    }),
});
export const AttributionFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.citations && { citations: obj.citations.map((item) => CitationFilterSensitiveLog(item)) }),
});
export const PayloadPartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.bytes && { bytes: SENSITIVE_STRING }),
    ...(obj.attribution && { attribution: AttributionFilterSensitiveLog(obj.attribution) }),
});
export const OutputFileFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.bytes && { bytes: SENSITIVE_STRING }),
});
export const FilePartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.files && { files: SENSITIVE_STRING }),
});
export const CustomOrchestrationTraceEventFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const CustomOrchestrationTraceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.event && { event: SENSITIVE_STRING }),
});
export const FailureTraceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.failureReason && { failureReason: SENSITIVE_STRING }),
});
export const GuardrailContentFilterFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailContentPolicyAssessmentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.filters && { filters: SENSITIVE_STRING }),
});
export const GuardrailPiiEntityFilterFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailRegexFilterFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailSensitiveInformationPolicyAssessmentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.piiEntities && { piiEntities: SENSITIVE_STRING }),
    ...(obj.regexes && { regexes: SENSITIVE_STRING }),
});
export const GuardrailTopicFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailTopicPolicyAssessmentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.topics && { topics: SENSITIVE_STRING }),
});
export const GuardrailCustomWordFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailManagedWordFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const GuardrailWordPolicyAssessmentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.customWords && { customWords: SENSITIVE_STRING }),
    ...(obj.managedWordLists && { managedWordLists: SENSITIVE_STRING }),
});
export const GuardrailAssessmentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.topicPolicy && { topicPolicy: SENSITIVE_STRING }),
    ...(obj.contentPolicy && { contentPolicy: SENSITIVE_STRING }),
    ...(obj.wordPolicy && { wordPolicy: SENSITIVE_STRING }),
    ...(obj.sensitiveInformationPolicy && { sensitiveInformationPolicy: SENSITIVE_STRING }),
});
export const GuardrailTraceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.inputAssessments && { inputAssessments: SENSITIVE_STRING }),
    ...(obj.outputAssessments && { outputAssessments: SENSITIVE_STRING }),
});
export const KnowledgeBaseLookupInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
    ...(obj.knowledgeBaseId && { knowledgeBaseId: SENSITIVE_STRING }),
});
export const InvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.actionGroupInvocationInput && {
        actionGroupInvocationInput: ActionGroupInvocationInputFilterSensitiveLog(obj.actionGroupInvocationInput),
    }),
    ...(obj.knowledgeBaseLookupInput && {
        knowledgeBaseLookupInput: KnowledgeBaseLookupInputFilterSensitiveLog(obj.knowledgeBaseLookupInput),
    }),
    ...(obj.agentCollaboratorInvocationInput && {
        agentCollaboratorInvocationInput: AgentCollaboratorInvocationInputFilterSensitiveLog(obj.agentCollaboratorInvocationInput),
    }),
});
export const ModelInvocationInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
});
export const UsageFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const MetadataFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.usage && { usage: SENSITIVE_STRING }),
});
export const RawResponseFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const ReasoningTextBlockFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const ReasoningContentBlockFilterSensitiveLog = (obj) => {
    if (obj.reasoningText !== undefined)
        return { reasoningText: SENSITIVE_STRING };
    if (obj.redactedContent !== undefined)
        return { redactedContent: obj.redactedContent };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const OrchestrationModelInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.rawResponse && { rawResponse: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
    ...(obj.reasoningContent && { reasoningContent: SENSITIVE_STRING }),
});
export const FinalResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
});
export const KnowledgeBaseLookupOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.retrievedReferences && {
        retrievedReferences: obj.retrievedReferences.map((item) => RetrievedReferenceFilterSensitiveLog(item)),
    }),
});
export const RepromptResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.source && { source: SENSITIVE_STRING }),
});
export const ObservationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.actionGroupInvocationOutput && {
        actionGroupInvocationOutput: ActionGroupInvocationOutputFilterSensitiveLog(obj.actionGroupInvocationOutput),
    }),
    ...(obj.agentCollaboratorInvocationOutput && {
        agentCollaboratorInvocationOutput: AgentCollaboratorInvocationOutputFilterSensitiveLog(obj.agentCollaboratorInvocationOutput),
    }),
    ...(obj.knowledgeBaseLookupOutput && {
        knowledgeBaseLookupOutput: KnowledgeBaseLookupOutputFilterSensitiveLog(obj.knowledgeBaseLookupOutput),
    }),
    ...(obj.finalResponse && { finalResponse: FinalResponseFilterSensitiveLog(obj.finalResponse) }),
    ...(obj.repromptResponse && { repromptResponse: SENSITIVE_STRING }),
});
export const RationaleFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
});
export const OrchestrationTraceFilterSensitiveLog = (obj) => {
    if (obj.rationale !== undefined)
        return { rationale: SENSITIVE_STRING };
    if (obj.invocationInput !== undefined)
        return { invocationInput: SENSITIVE_STRING };
    if (obj.observation !== undefined)
        return { observation: SENSITIVE_STRING };
    if (obj.modelInvocationInput !== undefined)
        return { modelInvocationInput: SENSITIVE_STRING };
    if (obj.modelInvocationOutput !== undefined)
        return { modelInvocationOutput: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const PostProcessingParsedResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.text && { text: SENSITIVE_STRING }),
});
export const PostProcessingModelInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.parsedResponse && { parsedResponse: SENSITIVE_STRING }),
    ...(obj.rawResponse && { rawResponse: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
    ...(obj.reasoningContent && { reasoningContent: SENSITIVE_STRING }),
});
export const PostProcessingTraceFilterSensitiveLog = (obj) => {
    if (obj.modelInvocationInput !== undefined)
        return { modelInvocationInput: SENSITIVE_STRING };
    if (obj.modelInvocationOutput !== undefined)
        return { modelInvocationOutput: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const PreProcessingParsedResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.rationale && { rationale: SENSITIVE_STRING }),
});
export const PreProcessingModelInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.parsedResponse && { parsedResponse: SENSITIVE_STRING }),
    ...(obj.rawResponse && { rawResponse: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
    ...(obj.reasoningContent && { reasoningContent: SENSITIVE_STRING }),
});
export const PreProcessingTraceFilterSensitiveLog = (obj) => {
    if (obj.modelInvocationInput !== undefined)
        return { modelInvocationInput: SENSITIVE_STRING };
    if (obj.modelInvocationOutput !== undefined)
        return { modelInvocationOutput: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const RoutingClassifierModelInvocationOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.rawResponse && { rawResponse: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
});
export const RoutingClassifierTraceFilterSensitiveLog = (obj) => {
    if (obj.invocationInput !== undefined)
        return { invocationInput: SENSITIVE_STRING };
    if (obj.observation !== undefined)
        return { observation: SENSITIVE_STRING };
    if (obj.modelInvocationInput !== undefined)
        return { modelInvocationInput: SENSITIVE_STRING };
    if (obj.modelInvocationOutput !== undefined)
        return { modelInvocationOutput: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const TraceFilterSensitiveLog = (obj) => {
    if (obj.guardrailTrace !== undefined)
        return { guardrailTrace: SENSITIVE_STRING };
    if (obj.preProcessingTrace !== undefined)
        return { preProcessingTrace: SENSITIVE_STRING };
    if (obj.orchestrationTrace !== undefined)
        return { orchestrationTrace: SENSITIVE_STRING };
    if (obj.postProcessingTrace !== undefined)
        return { postProcessingTrace: SENSITIVE_STRING };
    if (obj.routingClassifierTrace !== undefined)
        return { routingClassifierTrace: SENSITIVE_STRING };
    if (obj.failureTrace !== undefined)
        return { failureTrace: SENSITIVE_STRING };
    if (obj.customOrchestrationTrace !== undefined)
        return { customOrchestrationTrace: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const TracePartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.trace && { trace: SENSITIVE_STRING }),
    ...(obj.callerChain && { callerChain: obj.callerChain.map((item) => item) }),
    ...(obj.collaboratorName && { collaboratorName: SENSITIVE_STRING }),
});
export const ResponseStreamFilterSensitiveLog = (obj) => {
    if (obj.chunk !== undefined)
        return { chunk: SENSITIVE_STRING };
    if (obj.trace !== undefined)
        return { trace: SENSITIVE_STRING };
    if (obj.returnControl !== undefined)
        return { returnControl: SENSITIVE_STRING };
    if (obj.internalServerException !== undefined)
        return { internalServerException: obj.internalServerException };
    if (obj.validationException !== undefined)
        return { validationException: obj.validationException };
    if (obj.resourceNotFoundException !== undefined)
        return { resourceNotFoundException: obj.resourceNotFoundException };
    if (obj.serviceQuotaExceededException !== undefined)
        return { serviceQuotaExceededException: obj.serviceQuotaExceededException };
    if (obj.throttlingException !== undefined)
        return { throttlingException: obj.throttlingException };
    if (obj.accessDeniedException !== undefined)
        return { accessDeniedException: obj.accessDeniedException };
    if (obj.conflictException !== undefined)
        return { conflictException: obj.conflictException };
    if (obj.dependencyFailedException !== undefined)
        return { dependencyFailedException: obj.dependencyFailedException };
    if (obj.badGatewayException !== undefined)
        return { badGatewayException: obj.badGatewayException };
    if (obj.modelNotReadyException !== undefined)
        return { modelNotReadyException: obj.modelNotReadyException };
    if (obj.files !== undefined)
        return { files: FilePartFilterSensitiveLog(obj.files) };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const InvokeAgentResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.completion && { completion: "STREAMING_CONTENT" }),
});
export const CollaboratorConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.collaboratorName && { collaboratorName: SENSITIVE_STRING }),
    ...(obj.collaboratorInstruction && { collaboratorInstruction: SENSITIVE_STRING }),
});
export const PromptConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.basePromptTemplate && { basePromptTemplate: SENSITIVE_STRING }),
});
export const PromptOverrideConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.promptConfigurations && {
        promptConfigurations: obj.promptConfigurations.map((item) => PromptConfigurationFilterSensitiveLog(item)),
    }),
});
export const InlineSessionStateFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.returnControlInvocationResults && {
        returnControlInvocationResults: obj.returnControlInvocationResults.map((item) => InvocationResultMemberFilterSensitiveLog(item)),
    }),
    ...(obj.files && { files: obj.files.map((item) => InputFileFilterSensitiveLog(item)) }),
    ...(obj.conversationHistory && {
        conversationHistory: ConversationHistoryFilterSensitiveLog(obj.conversationHistory),
    }),
});
export const InlineAgentPayloadPartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.bytes && { bytes: SENSITIVE_STRING }),
    ...(obj.attribution && { attribution: AttributionFilterSensitiveLog(obj.attribution) }),
});
export const InlineAgentFilePartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.files && { files: SENSITIVE_STRING }),
});
export const InlineAgentReturnControlPayloadFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.invocationInputs && {
        invocationInputs: obj.invocationInputs.map((item) => InvocationInputMemberFilterSensitiveLog(item)),
    }),
});
export const InlineAgentTracePartFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.trace && { trace: SENSITIVE_STRING }),
    ...(obj.callerChain && { callerChain: obj.callerChain.map((item) => item) }),
    ...(obj.collaboratorName && { collaboratorName: SENSITIVE_STRING }),
});
export const InlineAgentResponseStreamFilterSensitiveLog = (obj) => {
    if (obj.chunk !== undefined)
        return { chunk: SENSITIVE_STRING };
    if (obj.trace !== undefined)
        return { trace: SENSITIVE_STRING };
    if (obj.returnControl !== undefined)
        return { returnControl: SENSITIVE_STRING };
    if (obj.internalServerException !== undefined)
        return { internalServerException: obj.internalServerException };
    if (obj.validationException !== undefined)
        return { validationException: obj.validationException };
    if (obj.resourceNotFoundException !== undefined)
        return { resourceNotFoundException: obj.resourceNotFoundException };
    if (obj.serviceQuotaExceededException !== undefined)
        return { serviceQuotaExceededException: obj.serviceQuotaExceededException };
    if (obj.throttlingException !== undefined)
        return { throttlingException: obj.throttlingException };
    if (obj.accessDeniedException !== undefined)
        return { accessDeniedException: obj.accessDeniedException };
    if (obj.conflictException !== undefined)
        return { conflictException: obj.conflictException };
    if (obj.dependencyFailedException !== undefined)
        return { dependencyFailedException: obj.dependencyFailedException };
    if (obj.badGatewayException !== undefined)
        return { badGatewayException: obj.badGatewayException };
    if (obj.files !== undefined)
        return { files: InlineAgentFilePartFilterSensitiveLog(obj.files) };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const InvokeInlineAgentResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.completion && { completion: "STREAMING_CONTENT" }),
});
export const TextPromptFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const InputPromptFilterSensitiveLog = (obj) => {
    if (obj.textPrompt !== undefined)
        return { textPrompt: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const OptimizePromptRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.input && { input: InputPromptFilterSensitiveLog(obj.input) }),
});
export const AnalyzePromptEventFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const OptimizedPromptFilterSensitiveLog = (obj) => {
    if (obj.textPrompt !== undefined)
        return { textPrompt: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const OptimizedPromptEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.optimizedPrompt && { optimizedPrompt: OptimizedPromptFilterSensitiveLog(obj.optimizedPrompt) }),
});
export const OptimizedPromptStreamFilterSensitiveLog = (obj) => {
    if (obj.optimizedPromptEvent !== undefined)
        return { optimizedPromptEvent: SENSITIVE_STRING };
    if (obj.analyzePromptEvent !== undefined)
        return { analyzePromptEvent: SENSITIVE_STRING };
    if (obj.internalServerException !== undefined)
        return { internalServerException: obj.internalServerException };
    if (obj.throttlingException !== undefined)
        return { throttlingException: obj.throttlingException };
    if (obj.validationException !== undefined)
        return { validationException: obj.validationException };
    if (obj.dependencyFailedException !== undefined)
        return { dependencyFailedException: obj.dependencyFailedException };
    if (obj.accessDeniedException !== undefined)
        return { accessDeniedException: obj.accessDeniedException };
    if (obj.badGatewayException !== undefined)
        return { badGatewayException: obj.badGatewayException };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const OptimizePromptResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.optimizedPrompt && { optimizedPrompt: "STREAMING_CONTENT" }),
});
export const RerankTextDocumentFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const RerankQueryFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.textQuery && { textQuery: SENSITIVE_STRING }),
});
export const RerankDocumentFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.textDocument && { textDocument: SENSITIVE_STRING }),
});
export const RerankSourceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.inlineDocumentSource && { inlineDocumentSource: SENSITIVE_STRING }),
});
export const RerankRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.queries && { queries: SENSITIVE_STRING }),
    ...(obj.sources && { sources: SENSITIVE_STRING }),
});
export const RerankResultFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.document && { document: SENSITIVE_STRING }),
});
export const RerankResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.results && { results: obj.results.map((item) => RerankResultFilterSensitiveLog(item)) }),
});
export const RetrieveAndGenerateInputFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const PromptTemplateFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.textPromptTemplate && { textPromptTemplate: SENSITIVE_STRING }),
});
export const ExternalSourcesGenerationConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.promptTemplate && { promptTemplate: PromptTemplateFilterSensitiveLog(obj.promptTemplate) }),
});
export const ByteContentDocFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.identifier && { identifier: SENSITIVE_STRING }),
    ...(obj.data && { data: SENSITIVE_STRING }),
});
export const ExternalSourceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.byteContent && { byteContent: ByteContentDocFilterSensitiveLog(obj.byteContent) }),
});
export const ExternalSourcesRetrieveAndGenerateConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.sources && { sources: obj.sources.map((item) => ExternalSourceFilterSensitiveLog(item)) }),
    ...(obj.generationConfiguration && {
        generationConfiguration: ExternalSourcesGenerationConfigurationFilterSensitiveLog(obj.generationConfiguration),
    }),
});
export const GenerationConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.promptTemplate && { promptTemplate: PromptTemplateFilterSensitiveLog(obj.promptTemplate) }),
});
export const OrchestrationConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.promptTemplate && { promptTemplate: PromptTemplateFilterSensitiveLog(obj.promptTemplate) }),
});
export const RetrieveAndGenerateOutputFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const RetrieveAndGenerateResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.output && { output: SENSITIVE_STRING }),
    ...(obj.citations && { citations: obj.citations.map((item) => CitationFilterSensitiveLog(item)) }),
});
export const CitationEventFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.citation && { citation: CitationFilterSensitiveLog(obj.citation) }),
    ...(obj.generatedResponsePart && {
        generatedResponsePart: GeneratedResponsePartFilterSensitiveLog(obj.generatedResponsePart),
    }),
    ...(obj.retrievedReferences && {
        retrievedReferences: obj.retrievedReferences.map((item) => RetrievedReferenceFilterSensitiveLog(item)),
    }),
});
export const RetrieveAndGenerateOutputEventFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const RetrieveAndGenerateStreamResponseOutputFilterSensitiveLog = (obj) => {
    if (obj.output !== undefined)
        return { output: SENSITIVE_STRING };
    if (obj.citation !== undefined)
        return { citation: CitationEventFilterSensitiveLog(obj.citation) };
    if (obj.guardrail !== undefined)
        return { guardrail: obj.guardrail };
    if (obj.internalServerException !== undefined)
        return { internalServerException: obj.internalServerException };
    if (obj.validationException !== undefined)
        return { validationException: obj.validationException };
    if (obj.resourceNotFoundException !== undefined)
        return { resourceNotFoundException: obj.resourceNotFoundException };
    if (obj.serviceQuotaExceededException !== undefined)
        return { serviceQuotaExceededException: obj.serviceQuotaExceededException };
    if (obj.throttlingException !== undefined)
        return { throttlingException: obj.throttlingException };
    if (obj.accessDeniedException !== undefined)
        return { accessDeniedException: obj.accessDeniedException };
    if (obj.conflictException !== undefined)
        return { conflictException: obj.conflictException };
    if (obj.dependencyFailedException !== undefined)
        return { dependencyFailedException: obj.dependencyFailedException };
    if (obj.badGatewayException !== undefined)
        return { badGatewayException: obj.badGatewayException };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const RetrieveAndGenerateStreamResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.stream && { stream: "STREAMING_CONTENT" }),
});
export const KnowledgeBaseQueryFilterSensitiveLog = (obj) => ({
    ...obj,
});
export const KnowledgeBaseRetrievalResultFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.content && { content: SENSITIVE_STRING }),
    ...(obj.location && { location: SENSITIVE_STRING }),
    ...(obj.metadata && { metadata: SENSITIVE_STRING }),
});
export const RetrieveResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.retrievalResults && { retrievalResults: SENSITIVE_STRING }),
});
export const BedrockSessionContentBlockFilterSensitiveLog = (obj) => {
    if (obj.text !== undefined)
        return { text: obj.text };
    if (obj.image !== undefined)
        return { image: obj.image };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const InvocationStepPayloadFilterSensitiveLog = (obj) => {
    if (obj.contentBlocks !== undefined)
        return { contentBlocks: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const InvocationStepFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.payload && { payload: InvocationStepPayloadFilterSensitiveLog(obj.payload) }),
});
export const GetInvocationStepResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.invocationStep && { invocationStep: InvocationStepFilterSensitiveLog(obj.invocationStep) }),
});
export const PutInvocationStepRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.payload && { payload: InvocationStepPayloadFilterSensitiveLog(obj.payload) }),
});
