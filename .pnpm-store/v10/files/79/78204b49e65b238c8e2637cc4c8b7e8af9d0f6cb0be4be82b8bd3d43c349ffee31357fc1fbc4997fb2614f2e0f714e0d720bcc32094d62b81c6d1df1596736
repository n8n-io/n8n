import { AgentActionGroup, AgentCollaboration, BedrockModelConfigurations, CollaboratorConfiguration, ConversationHistory, CustomOrchestration, ExternalSourcesRetrieveAndGenerateConfiguration, FilterAttribute, GenerationConfiguration, GuardrailConfiguration, GuardrailConfigurationWithArn, ImplicitFilterConfiguration, InlineBedrockModelConfigurations, InlineSessionState, InputFile, InvocationResultMember, KnowledgeBaseQuery, OrchestrationConfiguration, OrchestrationType, PromptOverrideConfiguration, RetrieveAndGenerateInput, RetrieveAndGenerateSessionConfiguration, RetrieveAndGenerateType, SearchType, SessionStatus, StreamingConfigurations, VectorSearchRerankingConfiguration } from "./models_0";
/**
 * <p>Contains details about a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @public
 */
export interface SessionSummary {
    /**
     * <p>The unique identifier for the session.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the session.</p>
     * @public
     */
    sessionArn: string | undefined;
    /**
     * <p>The current status of the session.</p>
     * @public
     */
    sessionStatus: SessionStatus | undefined;
    /**
     * <p>The timestamp for when the session was created.</p>
     * @public
     */
    createdAt: Date | undefined;
    /**
     * <p>The timestamp for when the session was last modified.</p>
     * @public
     */
    lastUpdatedAt: Date | undefined;
}
/**
 * @public
 */
export interface ListSessionsResponse {
    /**
     * <p>A list of summaries for each session in your Amazon Web Services account.</p>
     * @public
     */
    sessionSummaries: SessionSummary[] | undefined;
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, use this token when making another request in the <code>nextToken</code> field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * @public
 */
export interface UpdateSessionRequest {
    /**
     * <p>A map of key-value pairs containing attributes to be persisted across the session. For example the user's ID, their language preference, and the type of device they are using.</p>
     * @public
     */
    sessionMetadata?: Record<string, string> | undefined;
    /**
     * <p>The unique identifier of the session to modify. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 */
export interface UpdateSessionResponse {
    /**
     * <p>The unique identifier of the session you updated.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the session that was updated.</p>
     * @public
     */
    sessionArn: string | undefined;
    /**
     * <p>The status of the session you updated.</p>
     * @public
     */
    sessionStatus: SessionStatus | undefined;
    /**
     * <p>The timestamp for when the session was created.</p>
     * @public
     */
    createdAt: Date | undefined;
    /**
     * <p>The timestamp for when the session was last modified.</p>
     * @public
     */
    lastUpdatedAt: Date | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource for which to list tags.</p>
     * @public
     */
    resourceArn: string | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceResponse {
    /**
     * <p>The key-value pairs for the tags associated with the resource.</p>
     * @public
     */
    tags?: Record<string, string> | undefined;
}
/**
 * @public
 */
export interface TagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource to tag.</p>
     * @public
     */
    resourceArn: string | undefined;
    /**
     * <p>An object containing key-value pairs that define the tags to attach to the resource.</p>
     * @public
     */
    tags: Record<string, string> | undefined;
}
/**
 * @public
 */
export interface TagResourceResponse {
}
/**
 * @public
 */
export interface UntagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource from which to remove tags.</p>
     * @public
     */
    resourceArn: string | undefined;
    /**
     * <p>A list of keys of the tags to remove from the resource.</p>
     * @public
     */
    tagKeys: string[] | undefined;
}
/**
 * @public
 */
export interface UntagResourceResponse {
}
/**
 * <p>Specifies the filters to use on the metadata attributes in the knowledge base data sources before returning results. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>. See the examples below to see how to use these filters.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax">Retrieve request</a> – in the <code>filter</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>filter</code> field</p> </li> </ul>
 * @public
 */
export type RetrievalFilter = RetrievalFilter.AndAllMember | RetrievalFilter.EqualsMember | RetrievalFilter.GreaterThanMember | RetrievalFilter.GreaterThanOrEqualsMember | RetrievalFilter.InMember | RetrievalFilter.LessThanMember | RetrievalFilter.LessThanOrEqualsMember | RetrievalFilter.ListContainsMember | RetrievalFilter.NotEqualsMember | RetrievalFilter.NotInMember | RetrievalFilter.OrAllMember | RetrievalFilter.StartsWithMember | RetrievalFilter.StringContainsMember | RetrievalFilter.$UnknownMember;
/**
 * @public
 */
export declare namespace RetrievalFilter {
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value matches the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>animal</code> attribute whose value is <code>cat</code>:</p> <p> <code>"equals": \{ "key": "animal", "value": "cat" \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned when:</p> <ul> <li> <p>It contains a metadata attribute whose name matches the <code>key</code> and whose value doesn't match the <code>value</code> in this object.</p> </li> <li> <p>The key is not present in the document.</p> </li> </ul> <p>The following example would return data sources that don't contain an <code>animal</code> attribute whose value is <code>cat</code>.</p> <p> <code>"notEquals": \{ "key": "animal", "value": "cat" \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is greater than the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>year</code> attribute whose value is greater than <code>1989</code>:</p> <p> <code>"greaterThan": \{ "key": "year", "value": 1989 \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is greater than or equal to the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>year</code> attribute whose value is greater than or equal to <code>1989</code>:</p> <p> <code>"greaterThanOrEquals": \{ "key": "year", "value": 1989 \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is less than the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>year</code> attribute whose value is less than to <code>1989</code>.</p> <p> <code>"lessThan": \{ "key": "year", "value": 1989 \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is less than or equal to the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>year</code> attribute whose value is less than or equal to <code>1989</code>.</p> <p> <code>"lessThanOrEquals": \{ "key": "year", "value": 1989 \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is in the list specified in the <code>value</code> in this object.</p> <p>The following example would return data sources with an <code>animal</code> attribute that is either <code>cat</code> or <code>dog</code>:</p> <p> <code>"in": \{ "key": "animal", "value": ["cat", "dog"] \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value isn't in the list specified in the <code>value</code> in this object.</p> <p>The following example would return data sources whose <code>animal</code> attribute is neither <code>cat</code> nor <code>dog</code>.</p> <p> <code>"notIn": \{ "key": "animal", "value": ["cat", "dog"] \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value starts with the <code>value</code> in this object. This filter is currently only supported for Amazon OpenSearch Serverless vector stores.</p> <p>The following example would return data sources with an <code>animal</code> attribute starts with <code>ca</code> (for example, <code>cat</code> or <code>camel</code>).</p> <p> <code>"startsWith": \{ "key": "animal", "value": "ca" \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is a list that contains the <code>value</code> as one of its members.</p> <p>The following example would return data sources with an <code>animals</code> attribute that is a list containing a <code>cat</code> member (for example <code>["dog", "cat"]</code>).</p> <p> <code>"listContains": \{ "key": "animals", "value": "cat" \}</code> </p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if they contain a metadata attribute whose name matches the <code>key</code> and whose value is one of the following:</p> <ul> <li> <p>A string that contains the <code>value</code> as a substring. The following example would return data sources with an <code>animal</code> attribute that contains the substring <code>at</code> (for example <code>cat</code>).</p> <p> <code>"stringContains": \{ "key": "animal", "value": "at" \}</code> </p> </li> <li> <p>A list with a member that contains the <code>value</code> as a substring. The following example would return data sources with an <code>animals</code> attribute that is a list containing a member that contains the substring <code>at</code> (for example <code>["dog", "cat"]</code>).</p> <p> <code>"stringContains": \{ "key": "animals", "value": "at" \}</code> </p> </li> </ul>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if their metadata attributes fulfill all the filter conditions inside this list.</p>
     * @public
     */
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
    /**
     * <p>Knowledge base data sources are returned if their metadata attributes fulfill at least one of the filter conditions inside this list.</p>
     * @public
     */
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
    /**
     * @public
     */
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
/**
 * <p>Configurations for how to perform the search query and return results. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax">Retrieve request</a> – in the <code>vectorSearchConfiguration</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>vectorSearchConfiguration</code> field</p> </li> </ul>
 * @public
 */
export interface KnowledgeBaseVectorSearchConfiguration {
    /**
     * <p>The number of source chunks to retrieve.</p>
     * @public
     */
    numberOfResults?: number | undefined;
    /**
     * <p>By default, Amazon Bedrock decides a search strategy for you. If you're using an Amazon OpenSearch Serverless vector store that contains a filterable text field, you can specify whether to query the knowledge base with a <code>HYBRID</code> search using both vector embeddings and raw text, or <code>SEMANTIC</code> search using only vector embeddings. For other vector store configurations, only <code>SEMANTIC</code> search is available. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-test.html">Test a knowledge base</a>.</p>
     * @public
     */
    overrideSearchType?: SearchType | undefined;
    /**
     * <p>Specifies the filters to use on the metadata in the knowledge base data sources before returning results. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    filter?: RetrievalFilter | undefined;
    /**
     * <p>Contains configurations for reranking the retrieved results. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html">Improve the relevance of query responses with a reranker model</a>.</p>
     * @public
     */
    rerankingConfiguration?: VectorSearchRerankingConfiguration | undefined;
    /**
     * <p>Settings for implicit filtering.</p>
     * @public
     */
    implicitFilterConfiguration?: ImplicitFilterConfiguration | undefined;
}
/**
 * <p>Contains configurations for knowledge base query. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax">Retrieve request</a> – in the <code>retrievalConfiguration</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>retrievalConfiguration</code> field</p> </li> </ul>
 * @public
 */
export interface KnowledgeBaseRetrievalConfiguration {
    /**
     * <p>Contains details about how the results from the vector search should be returned. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    vectorSearchConfiguration: KnowledgeBaseVectorSearchConfiguration | undefined;
}
/**
 * <p> Details of the knowledge base associated withe inline agent. </p>
 * @public
 */
export interface KnowledgeBase {
    /**
     * <p> The unique identifier for a knowledge base associated with the inline agent. </p>
     * @public
     */
    knowledgeBaseId: string | undefined;
    /**
     * <p> The description of the knowledge base associated with the inline agent. </p>
     * @public
     */
    description: string | undefined;
    /**
     * <p> The configurations to apply to the knowledge base during query. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>. </p>
     * @public
     */
    retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
}
/**
 * <p>Configurations to apply to a knowledge base attached to the agent during query. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html#session-state-kb">Knowledge base retrieval configurations</a>.</p>
 * @public
 */
export interface KnowledgeBaseConfiguration {
    /**
     * <p>The unique identifier for a knowledge base attached to the agent.</p>
     * @public
     */
    knowledgeBaseId: string | undefined;
    /**
     * <p>The configurations to apply to the knowledge base during query. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    retrievalConfiguration: KnowledgeBaseRetrievalConfiguration | undefined;
}
/**
 * <p>Contains details about the resource being queried.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax">Retrieve request</a> – in the <code>knowledgeBaseConfiguration</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>knowledgeBaseConfiguration</code> field</p> </li> </ul>
 * @public
 */
export interface KnowledgeBaseRetrieveAndGenerateConfiguration {
    /**
     * <p>The unique identifier of the knowledge base that is queried.</p>
     * @public
     */
    knowledgeBaseId: string | undefined;
    /**
     * <p>The ARN of the foundation model or <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html">inference profile</a> used to generate a response.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>Contains configurations for how to retrieve and return the knowledge base query.</p>
     * @public
     */
    retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
    /**
     * <p>Contains configurations for response generation based on the knowledge base query results.</p>
     * @public
     */
    generationConfiguration?: GenerationConfiguration | undefined;
    /**
     * <p>Settings for how the model processes the prompt prior to retrieval and generation.</p>
     * @public
     */
    orchestrationConfiguration?: OrchestrationConfiguration | undefined;
}
/**
 * @public
 */
export interface RetrieveRequest {
    /**
     * <p>The unique identifier of the knowledge base to query.</p>
     * @public
     */
    knowledgeBaseId: string | undefined;
    /**
     * <p>Contains the query to send the knowledge base.</p>
     * @public
     */
    retrievalQuery: KnowledgeBaseQuery | undefined;
    /**
     * <p>Contains configurations for the knowledge base query and retrieval process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    retrievalConfiguration?: KnowledgeBaseRetrievalConfiguration | undefined;
    /**
     * <p>Guardrail settings.</p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfiguration | undefined;
    /**
     * <p>If there are more results than can fit in the response, the response returns a <code>nextToken</code>. Use this token in the <code>nextToken</code> field of another request to retrieve the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * <p>Contains details about the resource being queried.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>retrieveAndGenerateConfiguration</code> field</p> </li> </ul>
 * @public
 */
export interface RetrieveAndGenerateConfiguration {
    /**
     * <p>The type of resource that contains your data for retrieving information and generating responses.</p> <note> <p>If you choose to use <code>EXTERNAL_SOURCES</code>, then currently only Anthropic Claude 3 Sonnet models for knowledge bases are supported.</p> </note>
     * @public
     */
    type: RetrieveAndGenerateType | undefined;
    /**
     * <p>Contains details about the knowledge base for retrieving information and generating responses.</p>
     * @public
     */
    knowledgeBaseConfiguration?: KnowledgeBaseRetrieveAndGenerateConfiguration | undefined;
    /**
     * <p>The configuration for the external source wrapper object in the <code>retrieveAndGenerate</code> function.</p>
     * @public
     */
    externalSourcesConfiguration?: ExternalSourcesRetrieveAndGenerateConfiguration | undefined;
}
/**
 * <p> List of inline collaborators. </p>
 * @public
 */
export interface Collaborator {
    /**
     * <p> The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the inline collaborator. </p>
     * @public
     */
    customerEncryptionKeyArn?: string | undefined;
    /**
     * <p> The foundation model used by the inline collaborator agent. </p>
     * @public
     */
    foundationModel: string | undefined;
    /**
     * <p> Instruction that tell the inline collaborator agent what it should do and how it should interact with users. </p>
     * @public
     */
    instruction: string | undefined;
    /**
     * <p> The number of seconds for which the Amazon Bedrock keeps information about the user's conversation with the inline collaborator agent.</p> <p>A user interaction remains active for the amount of time specified. If no conversation occurs during this time, the session expires and Amazon Bedrock deletes any data provided before the timeout. </p>
     * @public
     */
    idleSessionTTLInSeconds?: number | undefined;
    /**
     * <p> List of action groups with each action group defining tasks the inline collaborator agent needs to carry out. </p>
     * @public
     */
    actionGroups?: AgentActionGroup[] | undefined;
    /**
     * <p> Knowledge base associated with the inline collaborator agent. </p>
     * @public
     */
    knowledgeBases?: KnowledgeBase[] | undefined;
    /**
     * <p> Details of the guardwrail associated with the inline collaborator. </p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfigurationWithArn | undefined;
    /**
     * <p> Contains configurations to override prompt templates in different parts of an inline collaborator sequence. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts.html">Advanced prompts</a>. </p>
     * @public
     */
    promptOverrideConfiguration?: PromptOverrideConfiguration | undefined;
    /**
     * <p> Defines how the inline supervisor agent handles information across multiple collaborator agents to coordinate a final response. </p>
     * @public
     */
    agentCollaboration?: AgentCollaboration | undefined;
    /**
     * <p> Settings of the collaborator agent. </p>
     * @public
     */
    collaboratorConfigurations?: CollaboratorConfiguration[] | undefined;
    /**
     * <p> Name of the inline collaborator agent which must be the same name as specified for <code>collaboratorName</code>. </p>
     * @public
     */
    agentName?: string | undefined;
}
/**
 * @public
 */
export interface RetrieveAndGenerateRequest {
    /**
     * <p>The unique identifier of the session. When you first make a <code>RetrieveAndGenerate</code> request, Amazon Bedrock automatically generates this value. You must reuse this value for all subsequent requests in the same conversational session. This value allows Amazon Bedrock to maintain context and knowledge from previous interactions. You can't explicitly set the <code>sessionId</code> yourself.</p>
     * @public
     */
    sessionId?: string | undefined;
    /**
     * <p>Contains the query to be made to the knowledge base.</p>
     * @public
     */
    input: RetrieveAndGenerateInput | undefined;
    /**
     * <p>Contains configurations for the knowledge base query and retrieval process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    retrieveAndGenerateConfiguration?: RetrieveAndGenerateConfiguration | undefined;
    /**
     * <p>Contains details about the session with the knowledge base.</p>
     * @public
     */
    sessionConfiguration?: RetrieveAndGenerateSessionConfiguration | undefined;
}
/**
 * @public
 */
export interface RetrieveAndGenerateStreamRequest {
    /**
     * <p>The unique identifier of the session. When you first make a <code>RetrieveAndGenerate</code> request, Amazon Bedrock automatically generates this value. You must reuse this value for all subsequent requests in the same conversational session. This value allows Amazon Bedrock to maintain context and knowledge from previous interactions. You can't explicitly set the <code>sessionId</code> yourself.</p>
     * @public
     */
    sessionId?: string | undefined;
    /**
     * <p>Contains the query to be made to the knowledge base.</p>
     * @public
     */
    input: RetrieveAndGenerateInput | undefined;
    /**
     * <p>Contains configurations for the knowledge base query and retrieval process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p>
     * @public
     */
    retrieveAndGenerateConfiguration?: RetrieveAndGenerateConfiguration | undefined;
    /**
     * <p>Contains details about the session with the knowledge base.</p>
     * @public
     */
    sessionConfiguration?: RetrieveAndGenerateSessionConfiguration | undefined;
}
/**
 * <p>Contains parameters that specify various attributes that persist across a session or prompt. You can define session state attributes as key-value pairs when writing a <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html">Lambda function</a> for an action group or pass them when making an <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html">InvokeAgent</a> request. Use session state attributes to control and provide conversational context for your agent and to help customize your agent's behavior. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>.</p>
 * @public
 */
export interface SessionState {
    /**
     * <p>Contains attributes that persist across a session and the values of those attributes. If <code>sessionAttributes</code> are passed to a supervisor agent in <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html">multi-agent collaboration</a>, it will be forwarded to all agent collaborators.</p>
     * @public
     */
    sessionAttributes?: Record<string, string> | undefined;
    /**
     * <p>Contains attributes that persist across a prompt and the values of those attributes. </p> <ul> <li> <p>In orchestration prompt template, these attributes replace the $prompt_session_attributes$ placeholder variable. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-placeholders.html">Prompt template placeholder variables</a>.</p> </li> <li> <p>In <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html">multi-agent collaboration</a>, the <code>promptSessionAttributes</code> will only be used by supervisor agent when $prompt_session_attributes$ is present in prompt template. </p> </li> </ul>
     * @public
     */
    promptSessionAttributes?: Record<string, string> | undefined;
    /**
     * <p>Contains information about the results from the action group invocation. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html">Return control to the agent developer</a> and <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>.</p> <note> <p>If you include this field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    returnControlInvocationResults?: InvocationResultMember[] | undefined;
    /**
     * <p>The identifier of the invocation of an action. This value must match the <code>invocationId</code> returned in the <code>InvokeAgent</code> response for the action whose results are provided in the <code>returnControlInvocationResults</code> field. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html">Return control to the agent developer</a> and <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>.</p>
     * @public
     */
    invocationId?: string | undefined;
    /**
     * <p>Contains information about the files used by code interpreter.</p>
     * @public
     */
    files?: InputFile[] | undefined;
    /**
     * <p>An array of configurations, each of which applies to a knowledge base attached to the agent.</p>
     * @public
     */
    knowledgeBaseConfigurations?: KnowledgeBaseConfiguration[] | undefined;
    /**
     * <p>The state's conversation history.</p>
     * @public
     */
    conversationHistory?: ConversationHistory | undefined;
}
/**
 * @public
 */
export interface InvokeAgentRequest {
    /**
     * <p>Contains parameters that specify various attributes of the session. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>.</p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    sessionState?: SessionState | undefined;
    /**
     * <p>The unique identifier of the agent to use.</p>
     * @public
     */
    agentId: string | undefined;
    /**
     * <p>The alias of the agent to use.</p>
     * @public
     */
    agentAliasId: string | undefined;
    /**
     * <p>The unique identifier of the session. Use the same value across requests to continue the same conversation.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>Specifies whether to end the session with the agent or not.</p>
     * @public
     */
    endSession?: boolean | undefined;
    /**
     * <p>Specifies whether to turn on the trace or not to track the agent's reasoning process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-events">Trace enablement</a>.</p>
     * @public
     */
    enableTrace?: boolean | undefined;
    /**
     * <p>The prompt text to send the agent.</p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    inputText?: string | undefined;
    /**
     * <p>The unique identifier of the agent memory.</p>
     * @public
     */
    memoryId?: string | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    bedrockModelConfigurations?: BedrockModelConfigurations | undefined;
    /**
     * <p> Specifies the configurations for streaming. </p> <note> <p>To use agent streaming, you need permissions to perform the <code>bedrock:InvokeModelWithResponseStream</code> action.</p> </note>
     * @public
     */
    streamingConfigurations?: StreamingConfigurations | undefined;
    /**
     * <p>The ARN of the resource making the request.</p>
     * @public
     */
    sourceArn?: string | undefined;
}
/**
 * @public
 */
export interface InvokeInlineAgentRequest {
    /**
     * <p> The Amazon Resource Name (ARN) of the Amazon Web Services KMS key to use to encrypt your inline agent. </p>
     * @public
     */
    customerEncryptionKeyArn?: string | undefined;
    /**
     * <p> The <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">model identifier (ID)</a> of the model to use for orchestration by the inline agent. For example, <code>meta.llama3-1-70b-instruct-v1:0</code>. </p>
     * @public
     */
    foundationModel: string | undefined;
    /**
     * <p> The instructions that tell the inline agent what it should do and how it should interact with users. </p>
     * @public
     */
    instruction: string | undefined;
    /**
     * <p> The number of seconds for which the inline agent should maintain session information. After this time expires, the subsequent <code>InvokeInlineAgent</code> request begins a new session. </p> <p>A user interaction remains active for the amount of time specified. If no conversation occurs during this time, the session expires and the data provided before the timeout is deleted.</p>
     * @public
     */
    idleSessionTTLInSeconds?: number | undefined;
    /**
     * <p> A list of action groups with each action group defining the action the inline agent needs to carry out. </p>
     * @public
     */
    actionGroups?: AgentActionGroup[] | undefined;
    /**
     * <p> Contains information of the knowledge bases to associate with. </p>
     * @public
     */
    knowledgeBases?: KnowledgeBase[] | undefined;
    /**
     * <p> The <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html">guardrails</a> to assign to the inline agent. </p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfigurationWithArn | undefined;
    /**
     * <p> Configurations for advanced prompts used to override the default prompts to enhance the accuracy of the inline agent. </p>
     * @public
     */
    promptOverrideConfiguration?: PromptOverrideConfiguration | undefined;
    /**
     * <p> Defines how the inline collaborator agent handles information across multiple collaborator agents to coordinate a final response. The inline collaborator agent can also be the supervisor. </p>
     * @public
     */
    agentCollaboration?: AgentCollaboration | undefined;
    /**
     * <p> Settings for an inline agent collaborator called with <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeInlineAgent.html">InvokeInlineAgent</a>. </p>
     * @public
     */
    collaboratorConfigurations?: CollaboratorConfiguration[] | undefined;
    /**
     * <p>The name for the agent.</p>
     * @public
     */
    agentName?: string | undefined;
    /**
     * <p> The unique identifier of the session. Use the same value across requests to continue the same conversation. </p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p> Specifies whether to end the session with the inline agent or not. </p>
     * @public
     */
    endSession?: boolean | undefined;
    /**
     * <p> Specifies whether to turn on the trace or not to track the agent's reasoning process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html">Using trace</a>. </p>
     * @public
     */
    enableTrace?: boolean | undefined;
    /**
     * <p> The prompt text to send to the agent. </p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    inputText?: string | undefined;
    /**
     * <p> Specifies the configurations for streaming. </p> <note> <p>To use agent streaming, you need permissions to perform the <code>bedrock:InvokeModelWithResponseStream</code> action.</p> </note>
     * @public
     */
    streamingConfigurations?: StreamingConfigurations | undefined;
    /**
     * <p> Parameters that specify the various attributes of a sessions. You can include attributes for the session or prompt or, if you configured an action group to return control, results from invocation of the action group. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>. </p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    inlineSessionState?: InlineSessionState | undefined;
    /**
     * <p> List of collaborator inline agents. </p>
     * @public
     */
    collaborators?: Collaborator[] | undefined;
    /**
     * <p>Model settings for the request.</p>
     * @public
     */
    bedrockModelConfigurations?: InlineBedrockModelConfigurations | undefined;
    /**
     * <p>Specifies the type of orchestration strategy for the agent. This is set to DEFAULT orchestration type, by default. </p>
     * @public
     */
    orchestrationType?: OrchestrationType | undefined;
    /**
     * <p>Contains details of the custom orchestration configured for the agent. </p>
     * @public
     */
    customOrchestration?: CustomOrchestration | undefined;
}
/**
 * @internal
 */
export declare const RetrievalFilterFilterSensitiveLog: (obj: RetrievalFilter) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseVectorSearchConfigurationFilterSensitiveLog: (obj: KnowledgeBaseVectorSearchConfiguration) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseRetrievalConfigurationFilterSensitiveLog: (obj: KnowledgeBaseRetrievalConfiguration) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseFilterSensitiveLog: (obj: KnowledgeBase) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseConfigurationFilterSensitiveLog: (obj: KnowledgeBaseConfiguration) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseRetrieveAndGenerateConfigurationFilterSensitiveLog: (obj: KnowledgeBaseRetrieveAndGenerateConfiguration) => any;
/**
 * @internal
 */
export declare const RetrieveRequestFilterSensitiveLog: (obj: RetrieveRequest) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateConfigurationFilterSensitiveLog: (obj: RetrieveAndGenerateConfiguration) => any;
/**
 * @internal
 */
export declare const CollaboratorFilterSensitiveLog: (obj: Collaborator) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateRequestFilterSensitiveLog: (obj: RetrieveAndGenerateRequest) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateStreamRequestFilterSensitiveLog: (obj: RetrieveAndGenerateStreamRequest) => any;
/**
 * @internal
 */
export declare const SessionStateFilterSensitiveLog: (obj: SessionState) => any;
/**
 * @internal
 */
export declare const InvokeAgentRequestFilterSensitiveLog: (obj: InvokeAgentRequest) => any;
/**
 * @internal
 */
export declare const InvokeInlineAgentRequestFilterSensitiveLog: (obj: InvokeInlineAgentRequest) => any;
