import {
  AgentActionGroup,
  AgentCollaboration,
  BedrockModelConfigurations,
  CollaboratorConfiguration,
  ConversationHistory,
  CustomOrchestration,
  ExternalSourcesRetrieveAndGenerateConfiguration,
  FilterAttribute,
  GenerationConfiguration,
  GuardrailConfiguration,
  GuardrailConfigurationWithArn,
  ImplicitFilterConfiguration,
  InlineBedrockModelConfigurations,
  InlineSessionState,
  InputFile,
  InvocationResultMember,
  KnowledgeBaseQuery,
  OrchestrationConfiguration,
  OrchestrationType,
  PromptOverrideConfiguration,
  RetrieveAndGenerateInput,
  RetrieveAndGenerateSessionConfiguration,
  RetrieveAndGenerateType,
  SearchType,
  SessionStatus,
  StreamingConfigurations,
  VectorSearchRerankingConfiguration,
} from "./models_0";
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
  const visit: <T>(value: RetrievalFilter, visitor: Visitor<T>) => T;
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
  sourceArn?: string | undefined;
}
export interface InvokeInlineAgentRequest {
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
  sessionId: string | undefined;
  endSession?: boolean | undefined;
  enableTrace?: boolean | undefined;
  inputText?: string | undefined;
  streamingConfigurations?: StreamingConfigurations | undefined;
  inlineSessionState?: InlineSessionState | undefined;
  collaborators?: Collaborator[] | undefined;
  bedrockModelConfigurations?: InlineBedrockModelConfigurations | undefined;
  orchestrationType?: OrchestrationType | undefined;
  customOrchestration?: CustomOrchestration | undefined;
}
export declare const RetrievalFilterFilterSensitiveLog: (
  obj: RetrievalFilter
) => any;
export declare const KnowledgeBaseVectorSearchConfigurationFilterSensitiveLog: (
  obj: KnowledgeBaseVectorSearchConfiguration
) => any;
export declare const KnowledgeBaseRetrievalConfigurationFilterSensitiveLog: (
  obj: KnowledgeBaseRetrievalConfiguration
) => any;
export declare const KnowledgeBaseFilterSensitiveLog: (
  obj: KnowledgeBase
) => any;
export declare const KnowledgeBaseConfigurationFilterSensitiveLog: (
  obj: KnowledgeBaseConfiguration
) => any;
export declare const KnowledgeBaseRetrieveAndGenerateConfigurationFilterSensitiveLog: (
  obj: KnowledgeBaseRetrieveAndGenerateConfiguration
) => any;
export declare const RetrieveRequestFilterSensitiveLog: (
  obj: RetrieveRequest
) => any;
export declare const RetrieveAndGenerateConfigurationFilterSensitiveLog: (
  obj: RetrieveAndGenerateConfiguration
) => any;
export declare const CollaboratorFilterSensitiveLog: (obj: Collaborator) => any;
export declare const RetrieveAndGenerateRequestFilterSensitiveLog: (
  obj: RetrieveAndGenerateRequest
) => any;
export declare const RetrieveAndGenerateStreamRequestFilterSensitiveLog: (
  obj: RetrieveAndGenerateStreamRequest
) => any;
export declare const SessionStateFilterSensitiveLog: (obj: SessionState) => any;
export declare const InvokeAgentRequestFilterSensitiveLog: (
  obj: InvokeAgentRequest
) => any;
export declare const InvokeInlineAgentRequestFilterSensitiveLog: (
  obj: InvokeInlineAgentRequest
) => any;
