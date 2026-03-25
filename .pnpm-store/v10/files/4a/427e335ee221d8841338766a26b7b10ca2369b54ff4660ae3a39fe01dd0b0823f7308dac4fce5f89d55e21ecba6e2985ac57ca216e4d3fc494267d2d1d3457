import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { AgentActionGroupFilterSensitiveLog, CollaboratorConfigurationFilterSensitiveLog, ConversationHistoryFilterSensitiveLog, ExternalSourcesRetrieveAndGenerateConfigurationFilterSensitiveLog, GenerationConfigurationFilterSensitiveLog, ImplicitFilterConfigurationFilterSensitiveLog, InlineSessionStateFilterSensitiveLog, InputFileFilterSensitiveLog, InvocationResultMemberFilterSensitiveLog, OrchestrationConfigurationFilterSensitiveLog, VectorSearchRerankingConfigurationFilterSensitiveLog, } from "./models_0";
export var RetrievalFilter;
(function (RetrievalFilter) {
    RetrievalFilter.visit = (value, visitor) => {
        if (value.equals !== undefined)
            return visitor.equals(value.equals);
        if (value.notEquals !== undefined)
            return visitor.notEquals(value.notEquals);
        if (value.greaterThan !== undefined)
            return visitor.greaterThan(value.greaterThan);
        if (value.greaterThanOrEquals !== undefined)
            return visitor.greaterThanOrEquals(value.greaterThanOrEquals);
        if (value.lessThan !== undefined)
            return visitor.lessThan(value.lessThan);
        if (value.lessThanOrEquals !== undefined)
            return visitor.lessThanOrEquals(value.lessThanOrEquals);
        if (value.in !== undefined)
            return visitor.in(value.in);
        if (value.notIn !== undefined)
            return visitor.notIn(value.notIn);
        if (value.startsWith !== undefined)
            return visitor.startsWith(value.startsWith);
        if (value.listContains !== undefined)
            return visitor.listContains(value.listContains);
        if (value.stringContains !== undefined)
            return visitor.stringContains(value.stringContains);
        if (value.andAll !== undefined)
            return visitor.andAll(value.andAll);
        if (value.orAll !== undefined)
            return visitor.orAll(value.orAll);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(RetrievalFilter || (RetrievalFilter = {}));
export const RetrievalFilterFilterSensitiveLog = (obj) => {
    if (obj.equals !== undefined)
        return { equals: obj.equals };
    if (obj.notEquals !== undefined)
        return { notEquals: obj.notEquals };
    if (obj.greaterThan !== undefined)
        return { greaterThan: obj.greaterThan };
    if (obj.greaterThanOrEquals !== undefined)
        return { greaterThanOrEquals: obj.greaterThanOrEquals };
    if (obj.lessThan !== undefined)
        return { lessThan: obj.lessThan };
    if (obj.lessThanOrEquals !== undefined)
        return { lessThanOrEquals: obj.lessThanOrEquals };
    if (obj.in !== undefined)
        return { in: obj.in };
    if (obj.notIn !== undefined)
        return { notIn: obj.notIn };
    if (obj.startsWith !== undefined)
        return { startsWith: obj.startsWith };
    if (obj.listContains !== undefined)
        return { listContains: obj.listContains };
    if (obj.stringContains !== undefined)
        return { stringContains: obj.stringContains };
    if (obj.andAll !== undefined)
        return { andAll: SENSITIVE_STRING };
    if (obj.orAll !== undefined)
        return { orAll: SENSITIVE_STRING };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const KnowledgeBaseVectorSearchConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.filter && { filter: SENSITIVE_STRING }),
    ...(obj.rerankingConfiguration && {
        rerankingConfiguration: VectorSearchRerankingConfigurationFilterSensitiveLog(obj.rerankingConfiguration),
    }),
    ...(obj.implicitFilterConfiguration && {
        implicitFilterConfiguration: ImplicitFilterConfigurationFilterSensitiveLog(obj.implicitFilterConfiguration),
    }),
});
export const KnowledgeBaseRetrievalConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.vectorSearchConfiguration && {
        vectorSearchConfiguration: KnowledgeBaseVectorSearchConfigurationFilterSensitiveLog(obj.vectorSearchConfiguration),
    }),
});
export const KnowledgeBaseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.description && { description: SENSITIVE_STRING }),
    ...(obj.retrievalConfiguration && {
        retrievalConfiguration: KnowledgeBaseRetrievalConfigurationFilterSensitiveLog(obj.retrievalConfiguration),
    }),
});
export const KnowledgeBaseConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.retrievalConfiguration && {
        retrievalConfiguration: KnowledgeBaseRetrievalConfigurationFilterSensitiveLog(obj.retrievalConfiguration),
    }),
});
export const KnowledgeBaseRetrieveAndGenerateConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.retrievalConfiguration && {
        retrievalConfiguration: KnowledgeBaseRetrievalConfigurationFilterSensitiveLog(obj.retrievalConfiguration),
    }),
    ...(obj.generationConfiguration && {
        generationConfiguration: GenerationConfigurationFilterSensitiveLog(obj.generationConfiguration),
    }),
    ...(obj.orchestrationConfiguration && {
        orchestrationConfiguration: OrchestrationConfigurationFilterSensitiveLog(obj.orchestrationConfiguration),
    }),
});
export const RetrieveRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.retrievalQuery && { retrievalQuery: SENSITIVE_STRING }),
    ...(obj.retrievalConfiguration && {
        retrievalConfiguration: KnowledgeBaseRetrievalConfigurationFilterSensitiveLog(obj.retrievalConfiguration),
    }),
});
export const RetrieveAndGenerateConfigurationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.knowledgeBaseConfiguration && {
        knowledgeBaseConfiguration: KnowledgeBaseRetrieveAndGenerateConfigurationFilterSensitiveLog(obj.knowledgeBaseConfiguration),
    }),
    ...(obj.externalSourcesConfiguration && {
        externalSourcesConfiguration: ExternalSourcesRetrieveAndGenerateConfigurationFilterSensitiveLog(obj.externalSourcesConfiguration),
    }),
});
export const CollaboratorFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.instruction && { instruction: SENSITIVE_STRING }),
    ...(obj.actionGroups && { actionGroups: obj.actionGroups.map((item) => AgentActionGroupFilterSensitiveLog(item)) }),
    ...(obj.knowledgeBases && {
        knowledgeBases: obj.knowledgeBases.map((item) => KnowledgeBaseFilterSensitiveLog(item)),
    }),
    ...(obj.promptOverrideConfiguration && { promptOverrideConfiguration: SENSITIVE_STRING }),
    ...(obj.collaboratorConfigurations && {
        collaboratorConfigurations: obj.collaboratorConfigurations.map((item) => CollaboratorConfigurationFilterSensitiveLog(item)),
    }),
    ...(obj.agentName && { agentName: SENSITIVE_STRING }),
});
export const RetrieveAndGenerateRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.input && { input: SENSITIVE_STRING }),
    ...(obj.retrieveAndGenerateConfiguration && {
        retrieveAndGenerateConfiguration: RetrieveAndGenerateConfigurationFilterSensitiveLog(obj.retrieveAndGenerateConfiguration),
    }),
});
export const RetrieveAndGenerateStreamRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.input && { input: SENSITIVE_STRING }),
    ...(obj.retrieveAndGenerateConfiguration && {
        retrieveAndGenerateConfiguration: RetrieveAndGenerateConfigurationFilterSensitiveLog(obj.retrieveAndGenerateConfiguration),
    }),
});
export const SessionStateFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.returnControlInvocationResults && {
        returnControlInvocationResults: obj.returnControlInvocationResults.map((item) => InvocationResultMemberFilterSensitiveLog(item)),
    }),
    ...(obj.files && { files: obj.files.map((item) => InputFileFilterSensitiveLog(item)) }),
    ...(obj.knowledgeBaseConfigurations && {
        knowledgeBaseConfigurations: obj.knowledgeBaseConfigurations.map((item) => KnowledgeBaseConfigurationFilterSensitiveLog(item)),
    }),
    ...(obj.conversationHistory && {
        conversationHistory: ConversationHistoryFilterSensitiveLog(obj.conversationHistory),
    }),
});
export const InvokeAgentRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.sessionState && { sessionState: SessionStateFilterSensitiveLog(obj.sessionState) }),
    ...(obj.inputText && { inputText: SENSITIVE_STRING }),
});
export const InvokeInlineAgentRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.instruction && { instruction: SENSITIVE_STRING }),
    ...(obj.actionGroups && { actionGroups: obj.actionGroups.map((item) => AgentActionGroupFilterSensitiveLog(item)) }),
    ...(obj.knowledgeBases && {
        knowledgeBases: obj.knowledgeBases.map((item) => KnowledgeBaseFilterSensitiveLog(item)),
    }),
    ...(obj.promptOverrideConfiguration && { promptOverrideConfiguration: SENSITIVE_STRING }),
    ...(obj.collaboratorConfigurations && {
        collaboratorConfigurations: obj.collaboratorConfigurations.map((item) => CollaboratorConfigurationFilterSensitiveLog(item)),
    }),
    ...(obj.agentName && { agentName: SENSITIVE_STRING }),
    ...(obj.inputText && { inputText: SENSITIVE_STRING }),
    ...(obj.inlineSessionState && { inlineSessionState: InlineSessionStateFilterSensitiveLog(obj.inlineSessionState) }),
    ...(obj.collaborators && { collaborators: obj.collaborators.map((item) => CollaboratorFilterSensitiveLog(item)) }),
    ...(obj.customOrchestration && { customOrchestration: obj.customOrchestration }),
});
