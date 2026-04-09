import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { InvokeAgentRequest, InvokeAgentResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link InvokeAgentCommand}.
 */
export interface InvokeAgentCommandInput extends InvokeAgentRequest {
}
/**
 * @public
 *
 * The output of {@link InvokeAgentCommand}.
 */
export interface InvokeAgentCommandOutput extends InvokeAgentResponse, __MetadataBearer {
}
declare const InvokeAgentCommand_base: {
    new (input: InvokeAgentCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeAgentCommandInput, InvokeAgentCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: InvokeAgentCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeAgentCommandInput, InvokeAgentCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note> </note> <p>Sends a prompt for the agent to process and respond to. Note the following fields for the request:</p> <ul> <li> <p>To continue the same conversation with an agent, use the same <code>sessionId</code> value in the request.</p> </li> <li> <p>To activate trace enablement, turn <code>enableTrace</code> to <code>true</code>. Trace enablement helps you follow the agent's reasoning process that led it to the information it processed, the actions it took, and the final result it yielded. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-events">Trace enablement</a>.</p> </li> <li> <p>End a conversation by setting <code>endSession</code> to <code>true</code>.</p> </li> <li> <p>In the <code>sessionState</code> object, you can include attributes for the session or prompt or, if you configured an action group to return control, results from invocation of the action group.</p> </li> </ul> <p>The response contains both <b>chunk</b> and <b>trace</b> attributes.</p> <p>The final response is returned in the <code>bytes</code> field of the <code>chunk</code> object. The <code>InvokeAgent</code> returns one chunk for the entire interaction.</p> <ul> <li> <p>The <code>attribution</code> object contains citations for parts of the response.</p> </li> <li> <p>If you set <code>enableTrace</code> to <code>true</code> in the request, you can trace the agent's steps and reasoning process that led it to the response.</p> </li> <li> <p>If the action predicted was configured to return control, the response returns parameters for the action, elicited from the user, in the <code>returnControl</code> field.</p> </li> <li> <p>Errors are also surfaced in the response.</p> </li> </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // InvokeAgentRequest
 *   sessionState: { // SessionState
 *     sessionAttributes: { // SessionAttributesMap
 *       "<keys>": "STRING_VALUE",
 *     },
 *     promptSessionAttributes: { // PromptSessionAttributesMap
 *       "<keys>": "STRING_VALUE",
 *     },
 *     returnControlInvocationResults: [ // ReturnControlInvocationResults
 *       { // InvocationResultMember Union: only one key present
 *         apiResult: { // ApiResult
 *           actionGroup: "STRING_VALUE", // required
 *           httpMethod: "STRING_VALUE",
 *           apiPath: "STRING_VALUE",
 *           confirmationState: "CONFIRM" || "DENY",
 *           responseState: "FAILURE" || "REPROMPT",
 *           httpStatusCode: Number("int"),
 *           responseBody: { // ResponseBody
 *             "<keys>": { // ContentBody
 *               body: "STRING_VALUE",
 *               images: [ // ImageInputs
 *                 { // ImageInput
 *                   format: "png" || "jpeg" || "gif" || "webp", // required
 *                   source: { // ImageInputSource Union: only one key present
 *                     bytes: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *                   },
 *                 },
 *               ],
 *             },
 *           },
 *           agentId: "STRING_VALUE",
 *         },
 *         functionResult: { // FunctionResult
 *           actionGroup: "STRING_VALUE", // required
 *           confirmationState: "CONFIRM" || "DENY",
 *           function: "STRING_VALUE",
 *           responseBody: {
 *             "<keys>": {
 *               body: "STRING_VALUE",
 *               images: [
 *                 {
 *                   format: "png" || "jpeg" || "gif" || "webp", // required
 *                   source: {//  Union: only one key present
 *                     bytes: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *                   },
 *                 },
 *               ],
 *             },
 *           },
 *           responseState: "FAILURE" || "REPROMPT",
 *           agentId: "STRING_VALUE",
 *         },
 *       },
 *     ],
 *     invocationId: "STRING_VALUE",
 *     files: [ // InputFiles
 *       { // InputFile
 *         name: "STRING_VALUE", // required
 *         source: { // FileSource
 *           sourceType: "S3" || "BYTE_CONTENT", // required
 *           s3Location: { // S3ObjectFile
 *             uri: "STRING_VALUE", // required
 *           },
 *           byteContent: { // ByteContentFile
 *             mediaType: "STRING_VALUE", // required
 *             data: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")             // required
 *           },
 *         },
 *         useCase: "CODE_INTERPRETER" || "CHAT", // required
 *       },
 *     ],
 *     knowledgeBaseConfigurations: [ // KnowledgeBaseConfigurations
 *       { // KnowledgeBaseConfiguration
 *         knowledgeBaseId: "STRING_VALUE", // required
 *         retrievalConfiguration: { // KnowledgeBaseRetrievalConfiguration
 *           vectorSearchConfiguration: { // KnowledgeBaseVectorSearchConfiguration
 *             numberOfResults: Number("int"),
 *             overrideSearchType: "HYBRID" || "SEMANTIC",
 *             filter: { // RetrievalFilter Union: only one key present
 *               equals: { // FilterAttribute
 *                 key: "STRING_VALUE", // required
 *                 value: "DOCUMENT_VALUE", // required
 *               },
 *               notEquals: {
 *                 key: "STRING_VALUE", // required
 *                 value: "DOCUMENT_VALUE", // required
 *               },
 *               greaterThan: {
 *                 key: "STRING_VALUE", // required
 *                 value: "DOCUMENT_VALUE", // required
 *               },
 *               greaterThanOrEquals: {
 *                 key: "STRING_VALUE", // required
 *                 value: "DOCUMENT_VALUE", // required
 *               },
 *               lessThan: {
 *                 key: "STRING_VALUE", // required
 *                 value: "DOCUMENT_VALUE", // required
 *               },
 *               lessThanOrEquals: "<FilterAttribute>",
 *               in: "<FilterAttribute>",
 *               notIn: "<FilterAttribute>",
 *               startsWith: "<FilterAttribute>",
 *               listContains: "<FilterAttribute>",
 *               stringContains: "<FilterAttribute>",
 *               andAll: [ // RetrievalFilterList
 *                 {//  Union: only one key present
 *                   equals: "<FilterAttribute>",
 *                   notEquals: "<FilterAttribute>",
 *                   greaterThan: "<FilterAttribute>",
 *                   greaterThanOrEquals: "<FilterAttribute>",
 *                   lessThan: "<FilterAttribute>",
 *                   lessThanOrEquals: "<FilterAttribute>",
 *                   in: "<FilterAttribute>",
 *                   notIn: "<FilterAttribute>",
 *                   startsWith: "<FilterAttribute>",
 *                   listContains: "<FilterAttribute>",
 *                   stringContains: "<FilterAttribute>",
 *                   andAll: [
 *                     "<RetrievalFilter>",
 *                   ],
 *                   orAll: [
 *                     "<RetrievalFilter>",
 *                   ],
 *                 },
 *               ],
 *               orAll: [
 *                 "<RetrievalFilter>",
 *               ],
 *             },
 *             rerankingConfiguration: { // VectorSearchRerankingConfiguration
 *               type: "BEDROCK_RERANKING_MODEL", // required
 *               bedrockRerankingConfiguration: { // VectorSearchBedrockRerankingConfiguration
 *                 modelConfiguration: { // VectorSearchBedrockRerankingModelConfiguration
 *                   modelArn: "STRING_VALUE", // required
 *                   additionalModelRequestFields: { // AdditionalModelRequestFields
 *                     "<keys>": "DOCUMENT_VALUE",
 *                   },
 *                 },
 *                 numberOfRerankedResults: Number("int"),
 *                 metadataConfiguration: { // MetadataConfigurationForReranking
 *                   selectionMode: "SELECTIVE" || "ALL", // required
 *                   selectiveModeConfiguration: { // RerankingMetadataSelectiveModeConfiguration Union: only one key present
 *                     fieldsToInclude: [ // FieldsForReranking
 *                       { // FieldForReranking
 *                         fieldName: "STRING_VALUE", // required
 *                       },
 *                     ],
 *                     fieldsToExclude: [
 *                       {
 *                         fieldName: "STRING_VALUE", // required
 *                       },
 *                     ],
 *                   },
 *                 },
 *               },
 *             },
 *             implicitFilterConfiguration: { // ImplicitFilterConfiguration
 *               metadataAttributes: [ // MetadataAttributeSchemaList // required
 *                 { // MetadataAttributeSchema
 *                   key: "STRING_VALUE", // required
 *                   type: "STRING" || "NUMBER" || "BOOLEAN" || "STRING_LIST", // required
 *                   description: "STRING_VALUE", // required
 *                 },
 *               ],
 *               modelArn: "STRING_VALUE", // required
 *             },
 *           },
 *         },
 *       },
 *     ],
 *     conversationHistory: { // ConversationHistory
 *       messages: [ // Messages
 *         { // Message
 *           role: "user" || "assistant", // required
 *           content: [ // ContentBlocks // required
 *             { // ContentBlock Union: only one key present
 *               text: "STRING_VALUE",
 *             },
 *           ],
 *         },
 *       ],
 *     },
 *   },
 *   agentId: "STRING_VALUE", // required
 *   agentAliasId: "STRING_VALUE", // required
 *   sessionId: "STRING_VALUE", // required
 *   endSession: true || false,
 *   enableTrace: true || false,
 *   inputText: "STRING_VALUE",
 *   memoryId: "STRING_VALUE",
 *   bedrockModelConfigurations: { // BedrockModelConfigurations
 *     performanceConfig: { // PerformanceConfiguration
 *       latency: "standard" || "optimized",
 *     },
 *   },
 *   streamingConfigurations: { // StreamingConfigurations
 *     streamFinalResponse: true || false,
 *     applyGuardrailInterval: Number("int"),
 *   },
 *   promptCreationConfigurations: { // PromptCreationConfigurations
 *     previousConversationTurnsToInclude: Number("int"),
 *     excludePreviousThinkingSteps: true || false,
 *   },
 *   sourceArn: "STRING_VALUE",
 * };
 * const command = new InvokeAgentCommand(input);
 * const response = await client.send(command);
 * // { // InvokeAgentResponse
 * //   completion: { // ResponseStream Union: only one key present
 * //     chunk: { // PayloadPart
 * //       bytes: new Uint8Array(),
 * //       attribution: { // Attribution
 * //         citations: [ // Citations
 * //           { // Citation
 * //             generatedResponsePart: { // GeneratedResponsePart
 * //               textResponsePart: { // TextResponsePart
 * //                 text: "STRING_VALUE",
 * //                 span: { // Span
 * //                   start: Number("int"),
 * //                   end: Number("int"),
 * //                 },
 * //               },
 * //             },
 * //             retrievedReferences: [ // RetrievedReferences
 * //               { // RetrievedReference
 * //                 content: { // RetrievalResultContent
 * //                   type: "TEXT" || "IMAGE" || "ROW" || "AUDIO" || "VIDEO",
 * //                   text: "STRING_VALUE",
 * //                   byteContent: "STRING_VALUE",
 * //                   video: { // VideoSegment
 * //                     s3Uri: "STRING_VALUE", // required
 * //                     summary: "STRING_VALUE",
 * //                   },
 * //                   audio: { // AudioSegment
 * //                     s3Uri: "STRING_VALUE", // required
 * //                     transcription: "STRING_VALUE",
 * //                   },
 * //                   row: [ // RetrievalResultContentRow
 * //                     { // RetrievalResultContentColumn
 * //                       columnName: "STRING_VALUE",
 * //                       columnValue: "STRING_VALUE",
 * //                       type: "BLOB" || "BOOLEAN" || "DOUBLE" || "NULL" || "LONG" || "STRING",
 * //                     },
 * //                   ],
 * //                 },
 * //                 location: { // RetrievalResultLocation
 * //                   type: "S3" || "WEB" || "CONFLUENCE" || "SALESFORCE" || "SHAREPOINT" || "CUSTOM" || "KENDRA" || "SQL", // required
 * //                   s3Location: { // RetrievalResultS3Location
 * //                     uri: "STRING_VALUE",
 * //                   },
 * //                   webLocation: { // RetrievalResultWebLocation
 * //                     url: "STRING_VALUE",
 * //                   },
 * //                   confluenceLocation: { // RetrievalResultConfluenceLocation
 * //                     url: "STRING_VALUE",
 * //                   },
 * //                   salesforceLocation: { // RetrievalResultSalesforceLocation
 * //                     url: "STRING_VALUE",
 * //                   },
 * //                   sharePointLocation: { // RetrievalResultSharePointLocation
 * //                     url: "STRING_VALUE",
 * //                   },
 * //                   customDocumentLocation: { // RetrievalResultCustomDocumentLocation
 * //                     id: "STRING_VALUE",
 * //                   },
 * //                   kendraDocumentLocation: { // RetrievalResultKendraDocumentLocation
 * //                     uri: "STRING_VALUE",
 * //                   },
 * //                   sqlLocation: { // RetrievalResultSqlLocation
 * //                     query: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 metadata: { // RetrievalResultMetadata
 * //                   "<keys>": "DOCUMENT_VALUE",
 * //                 },
 * //               },
 * //             ],
 * //           },
 * //         ],
 * //       },
 * //     },
 * //     trace: { // TracePart
 * //       sessionId: "STRING_VALUE",
 * //       trace: { // Trace Union: only one key present
 * //         guardrailTrace: { // GuardrailTrace
 * //           action: "INTERVENED" || "NONE",
 * //           traceId: "STRING_VALUE",
 * //           inputAssessments: [ // GuardrailAssessmentList
 * //             { // GuardrailAssessment
 * //               topicPolicy: { // GuardrailTopicPolicyAssessment
 * //                 topics: [ // GuardrailTopicList
 * //                   { // GuardrailTopic
 * //                     name: "STRING_VALUE",
 * //                     type: "DENY",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               contentPolicy: { // GuardrailContentPolicyAssessment
 * //                 filters: [ // GuardrailContentFilterList
 * //                   { // GuardrailContentFilter
 * //                     type: "INSULTS" || "HATE" || "SEXUAL" || "VIOLENCE" || "MISCONDUCT" || "PROMPT_ATTACK",
 * //                     confidence: "NONE" || "LOW" || "MEDIUM" || "HIGH",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               wordPolicy: { // GuardrailWordPolicyAssessment
 * //                 customWords: [ // GuardrailCustomWordList
 * //                   { // GuardrailCustomWord
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //                 managedWordLists: [ // GuardrailManagedWordList
 * //                   { // GuardrailManagedWord
 * //                     match: "STRING_VALUE",
 * //                     type: "PROFANITY",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               sensitiveInformationPolicy: { // GuardrailSensitiveInformationPolicyAssessment
 * //                 piiEntities: [ // GuardrailPiiEntityFilterList
 * //                   { // GuardrailPiiEntityFilter
 * //                     type: "ADDRESS" || "AGE" || "AWS_ACCESS_KEY" || "AWS_SECRET_KEY" || "CA_HEALTH_NUMBER" || "CA_SOCIAL_INSURANCE_NUMBER" || "CREDIT_DEBIT_CARD_CVV" || "CREDIT_DEBIT_CARD_EXPIRY" || "CREDIT_DEBIT_CARD_NUMBER" || "DRIVER_ID" || "EMAIL" || "INTERNATIONAL_BANK_ACCOUNT_NUMBER" || "IP_ADDRESS" || "LICENSE_PLATE" || "MAC_ADDRESS" || "NAME" || "PASSWORD" || "PHONE" || "PIN" || "SWIFT_CODE" || "UK_NATIONAL_HEALTH_SERVICE_NUMBER" || "UK_NATIONAL_INSURANCE_NUMBER" || "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER" || "URL" || "USERNAME" || "US_BANK_ACCOUNT_NUMBER" || "US_BANK_ROUTING_NUMBER" || "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER" || "US_PASSPORT_NUMBER" || "US_SOCIAL_SECURITY_NUMBER" || "VEHICLE_IDENTIFICATION_NUMBER",
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED" || "ANONYMIZED",
 * //                   },
 * //                 ],
 * //                 regexes: [ // GuardrailRegexFilterList
 * //                   { // GuardrailRegexFilter
 * //                     name: "STRING_VALUE",
 * //                     regex: "STRING_VALUE",
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED" || "ANONYMIZED",
 * //                   },
 * //                 ],
 * //               },
 * //             },
 * //           ],
 * //           outputAssessments: [
 * //             {
 * //               topicPolicy: {
 * //                 topics: [
 * //                   {
 * //                     name: "STRING_VALUE",
 * //                     type: "DENY",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               contentPolicy: {
 * //                 filters: [
 * //                   {
 * //                     type: "INSULTS" || "HATE" || "SEXUAL" || "VIOLENCE" || "MISCONDUCT" || "PROMPT_ATTACK",
 * //                     confidence: "NONE" || "LOW" || "MEDIUM" || "HIGH",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               wordPolicy: {
 * //                 customWords: [
 * //                   {
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //                 managedWordLists: [
 * //                   {
 * //                     match: "STRING_VALUE",
 * //                     type: "PROFANITY",
 * //                     action: "BLOCKED",
 * //                   },
 * //                 ],
 * //               },
 * //               sensitiveInformationPolicy: {
 * //                 piiEntities: [
 * //                   {
 * //                     type: "ADDRESS" || "AGE" || "AWS_ACCESS_KEY" || "AWS_SECRET_KEY" || "CA_HEALTH_NUMBER" || "CA_SOCIAL_INSURANCE_NUMBER" || "CREDIT_DEBIT_CARD_CVV" || "CREDIT_DEBIT_CARD_EXPIRY" || "CREDIT_DEBIT_CARD_NUMBER" || "DRIVER_ID" || "EMAIL" || "INTERNATIONAL_BANK_ACCOUNT_NUMBER" || "IP_ADDRESS" || "LICENSE_PLATE" || "MAC_ADDRESS" || "NAME" || "PASSWORD" || "PHONE" || "PIN" || "SWIFT_CODE" || "UK_NATIONAL_HEALTH_SERVICE_NUMBER" || "UK_NATIONAL_INSURANCE_NUMBER" || "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER" || "URL" || "USERNAME" || "US_BANK_ACCOUNT_NUMBER" || "US_BANK_ROUTING_NUMBER" || "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER" || "US_PASSPORT_NUMBER" || "US_SOCIAL_SECURITY_NUMBER" || "VEHICLE_IDENTIFICATION_NUMBER",
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED" || "ANONYMIZED",
 * //                   },
 * //                 ],
 * //                 regexes: [
 * //                   {
 * //                     name: "STRING_VALUE",
 * //                     regex: "STRING_VALUE",
 * //                     match: "STRING_VALUE",
 * //                     action: "BLOCKED" || "ANONYMIZED",
 * //                   },
 * //                 ],
 * //               },
 * //             },
 * //           ],
 * //           metadata: { // Metadata
 * //             startTime: new Date("TIMESTAMP"),
 * //             endTime: new Date("TIMESTAMP"),
 * //             totalTimeMs: Number("long"),
 * //             operationTotalTimeMs: Number("long"),
 * //             clientRequestId: "STRING_VALUE",
 * //             usage: { // Usage
 * //               inputTokens: Number("int"),
 * //               outputTokens: Number("int"),
 * //             },
 * //           },
 * //         },
 * //         preProcessingTrace: { // PreProcessingTrace Union: only one key present
 * //           modelInvocationInput: { // ModelInvocationInput
 * //             traceId: "STRING_VALUE",
 * //             text: "STRING_VALUE",
 * //             type: "PRE_PROCESSING" || "ORCHESTRATION" || "KNOWLEDGE_BASE_RESPONSE_GENERATION" || "POST_PROCESSING" || "ROUTING_CLASSIFIER",
 * //             overrideLambda: "STRING_VALUE",
 * //             promptCreationMode: "DEFAULT" || "OVERRIDDEN",
 * //             inferenceConfiguration: { // InferenceConfiguration
 * //               temperature: Number("float"),
 * //               topP: Number("float"),
 * //               topK: Number("int"),
 * //               maximumLength: Number("int"),
 * //               stopSequences: [ // StopSequences
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             parserMode: "DEFAULT" || "OVERRIDDEN",
 * //             foundationModel: "STRING_VALUE",
 * //           },
 * //           modelInvocationOutput: { // PreProcessingModelInvocationOutput
 * //             traceId: "STRING_VALUE",
 * //             parsedResponse: { // PreProcessingParsedResponse
 * //               rationale: "STRING_VALUE",
 * //               isValid: true || false,
 * //             },
 * //             rawResponse: { // RawResponse
 * //               content: "STRING_VALUE",
 * //             },
 * //             metadata: {
 * //               startTime: new Date("TIMESTAMP"),
 * //               endTime: new Date("TIMESTAMP"),
 * //               totalTimeMs: Number("long"),
 * //               operationTotalTimeMs: Number("long"),
 * //               clientRequestId: "STRING_VALUE",
 * //               usage: {
 * //                 inputTokens: Number("int"),
 * //                 outputTokens: Number("int"),
 * //               },
 * //             },
 * //             reasoningContent: { // ReasoningContentBlock Union: only one key present
 * //               reasoningText: { // ReasoningTextBlock
 * //                 text: "STRING_VALUE", // required
 * //                 signature: "STRING_VALUE",
 * //               },
 * //               redactedContent: new Uint8Array(),
 * //             },
 * //           },
 * //         },
 * //         orchestrationTrace: { // OrchestrationTrace Union: only one key present
 * //           rationale: { // Rationale
 * //             traceId: "STRING_VALUE",
 * //             text: "STRING_VALUE",
 * //           },
 * //           invocationInput: { // InvocationInput
 * //             traceId: "STRING_VALUE",
 * //             invocationType: "ACTION_GROUP" || "KNOWLEDGE_BASE" || "FINISH" || "ACTION_GROUP_CODE_INTERPRETER" || "AGENT_COLLABORATOR",
 * //             actionGroupInvocationInput: { // ActionGroupInvocationInput
 * //               actionGroupName: "STRING_VALUE",
 * //               verb: "STRING_VALUE",
 * //               apiPath: "STRING_VALUE",
 * //               parameters: [ // Parameters
 * //                 { // Parameter
 * //                   name: "STRING_VALUE",
 * //                   type: "STRING_VALUE",
 * //                   value: "STRING_VALUE",
 * //                 },
 * //               ],
 * //               requestBody: { // RequestBody
 * //                 content: { // ContentMap
 * //                   "<keys>": [
 * //                     {
 * //                       name: "STRING_VALUE",
 * //                       type: "STRING_VALUE",
 * //                       value: "STRING_VALUE",
 * //                     },
 * //                   ],
 * //                 },
 * //               },
 * //               function: "STRING_VALUE",
 * //               executionType: "LAMBDA" || "RETURN_CONTROL",
 * //               invocationId: "STRING_VALUE",
 * //             },
 * //             knowledgeBaseLookupInput: { // KnowledgeBaseLookupInput
 * //               text: "STRING_VALUE",
 * //               knowledgeBaseId: "STRING_VALUE",
 * //             },
 * //             codeInterpreterInvocationInput: { // CodeInterpreterInvocationInput
 * //               code: "STRING_VALUE",
 * //               files: [ // Files
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             agentCollaboratorInvocationInput: { // AgentCollaboratorInvocationInput
 * //               agentCollaboratorName: "STRING_VALUE",
 * //               agentCollaboratorAliasArn: "STRING_VALUE",
 * //               input: { // AgentCollaboratorInputPayload
 * //                 type: "TEXT" || "RETURN_CONTROL",
 * //                 text: "STRING_VALUE",
 * //                 returnControlResults: { // ReturnControlResults
 * //                   invocationId: "STRING_VALUE",
 * //                   returnControlInvocationResults: [ // ReturnControlInvocationResults
 * //                     { // InvocationResultMember Union: only one key present
 * //                       apiResult: { // ApiResult
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         httpMethod: "STRING_VALUE",
 * //                         apiPath: "STRING_VALUE",
 * //                         confirmationState: "CONFIRM" || "DENY",
 * //                         responseState: "FAILURE" || "REPROMPT",
 * //                         httpStatusCode: Number("int"),
 * //                         responseBody: { // ResponseBody
 * //                           "<keys>": { // ContentBody
 * //                             body: "STRING_VALUE",
 * //                             images: [ // ImageInputs
 * //                               { // ImageInput
 * //                                 format: "png" || "jpeg" || "gif" || "webp", // required
 * //                                 source: { // ImageInputSource Union: only one key present
 * //                                   bytes: new Uint8Array(),
 * //                                 },
 * //                               },
 * //                             ],
 * //                           },
 * //                         },
 * //                         agentId: "STRING_VALUE",
 * //                       },
 * //                       functionResult: { // FunctionResult
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         confirmationState: "CONFIRM" || "DENY",
 * //                         function: "STRING_VALUE",
 * //                         responseBody: {
 * //                           "<keys>": {
 * //                             body: "STRING_VALUE",
 * //                             images: [
 * //                               {
 * //                                 format: "png" || "jpeg" || "gif" || "webp", // required
 * //                                 source: {//  Union: only one key present
 * //                                   bytes: new Uint8Array(),
 * //                                 },
 * //                               },
 * //                             ],
 * //                           },
 * //                         },
 * //                         responseState: "FAILURE" || "REPROMPT",
 * //                         agentId: "STRING_VALUE",
 * //                       },
 * //                     },
 * //                   ],
 * //                 },
 * //               },
 * //             },
 * //           },
 * //           observation: { // Observation
 * //             traceId: "STRING_VALUE",
 * //             type: "ACTION_GROUP" || "AGENT_COLLABORATOR" || "KNOWLEDGE_BASE" || "FINISH" || "ASK_USER" || "REPROMPT",
 * //             actionGroupInvocationOutput: { // ActionGroupInvocationOutput
 * //               text: "STRING_VALUE",
 * //               metadata: "<Metadata>",
 * //             },
 * //             agentCollaboratorInvocationOutput: { // AgentCollaboratorInvocationOutput
 * //               agentCollaboratorName: "STRING_VALUE",
 * //               agentCollaboratorAliasArn: "STRING_VALUE",
 * //               output: { // AgentCollaboratorOutputPayload
 * //                 type: "TEXT" || "RETURN_CONTROL",
 * //                 text: "STRING_VALUE",
 * //                 returnControlPayload: { // ReturnControlPayload
 * //                   invocationInputs: [ // InvocationInputs
 * //                     { // InvocationInputMember Union: only one key present
 * //                       apiInvocationInput: { // ApiInvocationInput
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         httpMethod: "STRING_VALUE",
 * //                         apiPath: "STRING_VALUE",
 * //                         parameters: [ // ApiParameters
 * //                           { // ApiParameter
 * //                             name: "STRING_VALUE",
 * //                             type: "STRING_VALUE",
 * //                             value: "STRING_VALUE",
 * //                           },
 * //                         ],
 * //                         requestBody: { // ApiRequestBody
 * //                           content: { // ApiContentMap
 * //                             "<keys>": { // PropertyParameters
 * //                               properties: [ // ParameterList
 * //                                 "<Parameter>",
 * //                               ],
 * //                             },
 * //                           },
 * //                         },
 * //                         actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //                         agentId: "STRING_VALUE",
 * //                         collaboratorName: "STRING_VALUE",
 * //                       },
 * //                       functionInvocationInput: { // FunctionInvocationInput
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         parameters: [ // FunctionParameters
 * //                           { // FunctionParameter
 * //                             name: "STRING_VALUE",
 * //                             type: "STRING_VALUE",
 * //                             value: "STRING_VALUE",
 * //                           },
 * //                         ],
 * //                         function: "STRING_VALUE",
 * //                         actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //                         agentId: "STRING_VALUE",
 * //                         collaboratorName: "STRING_VALUE",
 * //                       },
 * //                     },
 * //                   ],
 * //                   invocationId: "STRING_VALUE",
 * //                 },
 * //               },
 * //               metadata: "<Metadata>",
 * //             },
 * //             knowledgeBaseLookupOutput: { // KnowledgeBaseLookupOutput
 * //               retrievedReferences: [
 * //                 {
 * //                   content: {
 * //                     type: "TEXT" || "IMAGE" || "ROW" || "AUDIO" || "VIDEO",
 * //                     text: "STRING_VALUE",
 * //                     byteContent: "STRING_VALUE",
 * //                     video: {
 * //                       s3Uri: "STRING_VALUE", // required
 * //                       summary: "STRING_VALUE",
 * //                     },
 * //                     audio: {
 * //                       s3Uri: "STRING_VALUE", // required
 * //                       transcription: "STRING_VALUE",
 * //                     },
 * //                     row: [
 * //                       {
 * //                         columnName: "STRING_VALUE",
 * //                         columnValue: "STRING_VALUE",
 * //                         type: "BLOB" || "BOOLEAN" || "DOUBLE" || "NULL" || "LONG" || "STRING",
 * //                       },
 * //                     ],
 * //                   },
 * //                   location: {
 * //                     type: "S3" || "WEB" || "CONFLUENCE" || "SALESFORCE" || "SHAREPOINT" || "CUSTOM" || "KENDRA" || "SQL", // required
 * //                     s3Location: {
 * //                       uri: "STRING_VALUE",
 * //                     },
 * //                     webLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     confluenceLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     salesforceLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     sharePointLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     customDocumentLocation: {
 * //                       id: "STRING_VALUE",
 * //                     },
 * //                     kendraDocumentLocation: {
 * //                       uri: "STRING_VALUE",
 * //                     },
 * //                     sqlLocation: {
 * //                       query: "STRING_VALUE",
 * //                     },
 * //                   },
 * //                   metadata: {
 * //                     "<keys>": "DOCUMENT_VALUE",
 * //                   },
 * //                 },
 * //               ],
 * //               metadata: "<Metadata>",
 * //             },
 * //             finalResponse: { // FinalResponse
 * //               text: "STRING_VALUE",
 * //               metadata: "<Metadata>",
 * //             },
 * //             repromptResponse: { // RepromptResponse
 * //               text: "STRING_VALUE",
 * //               source: "ACTION_GROUP" || "KNOWLEDGE_BASE" || "PARSER",
 * //             },
 * //             codeInterpreterInvocationOutput: { // CodeInterpreterInvocationOutput
 * //               executionOutput: "STRING_VALUE",
 * //               executionError: "STRING_VALUE",
 * //               files: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               executionTimeout: true || false,
 * //               metadata: "<Metadata>",
 * //             },
 * //           },
 * //           modelInvocationInput: {
 * //             traceId: "STRING_VALUE",
 * //             text: "STRING_VALUE",
 * //             type: "PRE_PROCESSING" || "ORCHESTRATION" || "KNOWLEDGE_BASE_RESPONSE_GENERATION" || "POST_PROCESSING" || "ROUTING_CLASSIFIER",
 * //             overrideLambda: "STRING_VALUE",
 * //             promptCreationMode: "DEFAULT" || "OVERRIDDEN",
 * //             inferenceConfiguration: {
 * //               temperature: Number("float"),
 * //               topP: Number("float"),
 * //               topK: Number("int"),
 * //               maximumLength: Number("int"),
 * //               stopSequences: [
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             parserMode: "DEFAULT" || "OVERRIDDEN",
 * //             foundationModel: "STRING_VALUE",
 * //           },
 * //           modelInvocationOutput: { // OrchestrationModelInvocationOutput
 * //             traceId: "STRING_VALUE",
 * //             rawResponse: {
 * //               content: "STRING_VALUE",
 * //             },
 * //             metadata: "<Metadata>",
 * //             reasoningContent: {//  Union: only one key present
 * //               reasoningText: {
 * //                 text: "STRING_VALUE", // required
 * //                 signature: "STRING_VALUE",
 * //               },
 * //               redactedContent: new Uint8Array(),
 * //             },
 * //           },
 * //         },
 * //         postProcessingTrace: { // PostProcessingTrace Union: only one key present
 * //           modelInvocationInput: {
 * //             traceId: "STRING_VALUE",
 * //             text: "STRING_VALUE",
 * //             type: "PRE_PROCESSING" || "ORCHESTRATION" || "KNOWLEDGE_BASE_RESPONSE_GENERATION" || "POST_PROCESSING" || "ROUTING_CLASSIFIER",
 * //             overrideLambda: "STRING_VALUE",
 * //             promptCreationMode: "DEFAULT" || "OVERRIDDEN",
 * //             inferenceConfiguration: {
 * //               temperature: Number("float"),
 * //               topP: Number("float"),
 * //               topK: Number("int"),
 * //               maximumLength: Number("int"),
 * //               stopSequences: [
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             parserMode: "DEFAULT" || "OVERRIDDEN",
 * //             foundationModel: "STRING_VALUE",
 * //           },
 * //           modelInvocationOutput: { // PostProcessingModelInvocationOutput
 * //             traceId: "STRING_VALUE",
 * //             parsedResponse: { // PostProcessingParsedResponse
 * //               text: "STRING_VALUE",
 * //             },
 * //             rawResponse: {
 * //               content: "STRING_VALUE",
 * //             },
 * //             metadata: "<Metadata>",
 * //             reasoningContent: {//  Union: only one key present
 * //               reasoningText: {
 * //                 text: "STRING_VALUE", // required
 * //                 signature: "STRING_VALUE",
 * //               },
 * //               redactedContent: new Uint8Array(),
 * //             },
 * //           },
 * //         },
 * //         routingClassifierTrace: { // RoutingClassifierTrace Union: only one key present
 * //           invocationInput: {
 * //             traceId: "STRING_VALUE",
 * //             invocationType: "ACTION_GROUP" || "KNOWLEDGE_BASE" || "FINISH" || "ACTION_GROUP_CODE_INTERPRETER" || "AGENT_COLLABORATOR",
 * //             actionGroupInvocationInput: {
 * //               actionGroupName: "STRING_VALUE",
 * //               verb: "STRING_VALUE",
 * //               apiPath: "STRING_VALUE",
 * //               parameters: [
 * //                 "<Parameter>",
 * //               ],
 * //               requestBody: {
 * //                 content: {
 * //                   "<keys>": [
 * //                     "<Parameter>",
 * //                   ],
 * //                 },
 * //               },
 * //               function: "STRING_VALUE",
 * //               executionType: "LAMBDA" || "RETURN_CONTROL",
 * //               invocationId: "STRING_VALUE",
 * //             },
 * //             knowledgeBaseLookupInput: {
 * //               text: "STRING_VALUE",
 * //               knowledgeBaseId: "STRING_VALUE",
 * //             },
 * //             codeInterpreterInvocationInput: {
 * //               code: "STRING_VALUE",
 * //               files: [
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             agentCollaboratorInvocationInput: {
 * //               agentCollaboratorName: "STRING_VALUE",
 * //               agentCollaboratorAliasArn: "STRING_VALUE",
 * //               input: {
 * //                 type: "TEXT" || "RETURN_CONTROL",
 * //                 text: "STRING_VALUE",
 * //                 returnControlResults: {
 * //                   invocationId: "STRING_VALUE",
 * //                   returnControlInvocationResults: [
 * //                     {//  Union: only one key present
 * //                       apiResult: {
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         httpMethod: "STRING_VALUE",
 * //                         apiPath: "STRING_VALUE",
 * //                         confirmationState: "CONFIRM" || "DENY",
 * //                         responseState: "FAILURE" || "REPROMPT",
 * //                         httpStatusCode: Number("int"),
 * //                         responseBody: {
 * //                           "<keys>": {
 * //                             body: "STRING_VALUE",
 * //                             images: [
 * //                               {
 * //                                 format: "png" || "jpeg" || "gif" || "webp", // required
 * //                                 source: {//  Union: only one key present
 * //                                   bytes: new Uint8Array(),
 * //                                 },
 * //                               },
 * //                             ],
 * //                           },
 * //                         },
 * //                         agentId: "STRING_VALUE",
 * //                       },
 * //                       functionResult: {
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         confirmationState: "CONFIRM" || "DENY",
 * //                         function: "STRING_VALUE",
 * //                         responseBody: {
 * //                           "<keys>": {
 * //                             body: "STRING_VALUE",
 * //                             images: [
 * //                               {
 * //                                 format: "png" || "jpeg" || "gif" || "webp", // required
 * //                                 source: {//  Union: only one key present
 * //                                   bytes: new Uint8Array(),
 * //                                 },
 * //                               },
 * //                             ],
 * //                           },
 * //                         },
 * //                         responseState: "FAILURE" || "REPROMPT",
 * //                         agentId: "STRING_VALUE",
 * //                       },
 * //                     },
 * //                   ],
 * //                 },
 * //               },
 * //             },
 * //           },
 * //           observation: {
 * //             traceId: "STRING_VALUE",
 * //             type: "ACTION_GROUP" || "AGENT_COLLABORATOR" || "KNOWLEDGE_BASE" || "FINISH" || "ASK_USER" || "REPROMPT",
 * //             actionGroupInvocationOutput: {
 * //               text: "STRING_VALUE",
 * //               metadata: "<Metadata>",
 * //             },
 * //             agentCollaboratorInvocationOutput: {
 * //               agentCollaboratorName: "STRING_VALUE",
 * //               agentCollaboratorAliasArn: "STRING_VALUE",
 * //               output: {
 * //                 type: "TEXT" || "RETURN_CONTROL",
 * //                 text: "STRING_VALUE",
 * //                 returnControlPayload: {
 * //                   invocationInputs: [
 * //                     {//  Union: only one key present
 * //                       apiInvocationInput: {
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         httpMethod: "STRING_VALUE",
 * //                         apiPath: "STRING_VALUE",
 * //                         parameters: [
 * //                           {
 * //                             name: "STRING_VALUE",
 * //                             type: "STRING_VALUE",
 * //                             value: "STRING_VALUE",
 * //                           },
 * //                         ],
 * //                         requestBody: {
 * //                           content: {
 * //                             "<keys>": {
 * //                               properties: [
 * //                                 "<Parameter>",
 * //                               ],
 * //                             },
 * //                           },
 * //                         },
 * //                         actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //                         agentId: "STRING_VALUE",
 * //                         collaboratorName: "STRING_VALUE",
 * //                       },
 * //                       functionInvocationInput: {
 * //                         actionGroup: "STRING_VALUE", // required
 * //                         parameters: [
 * //                           {
 * //                             name: "STRING_VALUE",
 * //                             type: "STRING_VALUE",
 * //                             value: "STRING_VALUE",
 * //                           },
 * //                         ],
 * //                         function: "STRING_VALUE",
 * //                         actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //                         agentId: "STRING_VALUE",
 * //                         collaboratorName: "STRING_VALUE",
 * //                       },
 * //                     },
 * //                   ],
 * //                   invocationId: "STRING_VALUE",
 * //                 },
 * //               },
 * //               metadata: "<Metadata>",
 * //             },
 * //             knowledgeBaseLookupOutput: {
 * //               retrievedReferences: [
 * //                 {
 * //                   content: {
 * //                     type: "TEXT" || "IMAGE" || "ROW" || "AUDIO" || "VIDEO",
 * //                     text: "STRING_VALUE",
 * //                     byteContent: "STRING_VALUE",
 * //                     video: {
 * //                       s3Uri: "STRING_VALUE", // required
 * //                       summary: "STRING_VALUE",
 * //                     },
 * //                     audio: {
 * //                       s3Uri: "STRING_VALUE", // required
 * //                       transcription: "STRING_VALUE",
 * //                     },
 * //                     row: [
 * //                       {
 * //                         columnName: "STRING_VALUE",
 * //                         columnValue: "STRING_VALUE",
 * //                         type: "BLOB" || "BOOLEAN" || "DOUBLE" || "NULL" || "LONG" || "STRING",
 * //                       },
 * //                     ],
 * //                   },
 * //                   location: {
 * //                     type: "S3" || "WEB" || "CONFLUENCE" || "SALESFORCE" || "SHAREPOINT" || "CUSTOM" || "KENDRA" || "SQL", // required
 * //                     s3Location: {
 * //                       uri: "STRING_VALUE",
 * //                     },
 * //                     webLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     confluenceLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     salesforceLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     sharePointLocation: {
 * //                       url: "STRING_VALUE",
 * //                     },
 * //                     customDocumentLocation: {
 * //                       id: "STRING_VALUE",
 * //                     },
 * //                     kendraDocumentLocation: {
 * //                       uri: "STRING_VALUE",
 * //                     },
 * //                     sqlLocation: {
 * //                       query: "STRING_VALUE",
 * //                     },
 * //                   },
 * //                   metadata: {
 * //                     "<keys>": "DOCUMENT_VALUE",
 * //                   },
 * //                 },
 * //               ],
 * //               metadata: "<Metadata>",
 * //             },
 * //             finalResponse: {
 * //               text: "STRING_VALUE",
 * //               metadata: "<Metadata>",
 * //             },
 * //             repromptResponse: {
 * //               text: "STRING_VALUE",
 * //               source: "ACTION_GROUP" || "KNOWLEDGE_BASE" || "PARSER",
 * //             },
 * //             codeInterpreterInvocationOutput: {
 * //               executionOutput: "STRING_VALUE",
 * //               executionError: "STRING_VALUE",
 * //               files: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               executionTimeout: true || false,
 * //               metadata: "<Metadata>",
 * //             },
 * //           },
 * //           modelInvocationInput: {
 * //             traceId: "STRING_VALUE",
 * //             text: "STRING_VALUE",
 * //             type: "PRE_PROCESSING" || "ORCHESTRATION" || "KNOWLEDGE_BASE_RESPONSE_GENERATION" || "POST_PROCESSING" || "ROUTING_CLASSIFIER",
 * //             overrideLambda: "STRING_VALUE",
 * //             promptCreationMode: "DEFAULT" || "OVERRIDDEN",
 * //             inferenceConfiguration: {
 * //               temperature: Number("float"),
 * //               topP: Number("float"),
 * //               topK: Number("int"),
 * //               maximumLength: Number("int"),
 * //               stopSequences: [
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             parserMode: "DEFAULT" || "OVERRIDDEN",
 * //             foundationModel: "STRING_VALUE",
 * //           },
 * //           modelInvocationOutput: { // RoutingClassifierModelInvocationOutput
 * //             traceId: "STRING_VALUE",
 * //             rawResponse: {
 * //               content: "STRING_VALUE",
 * //             },
 * //             metadata: "<Metadata>",
 * //           },
 * //         },
 * //         failureTrace: { // FailureTrace
 * //           traceId: "STRING_VALUE",
 * //           failureReason: "STRING_VALUE",
 * //           failureCode: Number("int"),
 * //           metadata: "<Metadata>",
 * //         },
 * //         customOrchestrationTrace: { // CustomOrchestrationTrace
 * //           traceId: "STRING_VALUE",
 * //           event: { // CustomOrchestrationTraceEvent
 * //             text: "STRING_VALUE",
 * //           },
 * //         },
 * //       },
 * //       callerChain: [ // CallerChain
 * //         { // Caller Union: only one key present
 * //           agentAliasArn: "STRING_VALUE",
 * //         },
 * //       ],
 * //       eventTime: new Date("TIMESTAMP"),
 * //       collaboratorName: "STRING_VALUE",
 * //       agentId: "STRING_VALUE",
 * //       agentAliasId: "STRING_VALUE",
 * //       agentVersion: "STRING_VALUE",
 * //     },
 * //     returnControl: {
 * //       invocationInputs: [
 * //         {//  Union: only one key present
 * //           apiInvocationInput: {
 * //             actionGroup: "STRING_VALUE", // required
 * //             httpMethod: "STRING_VALUE",
 * //             apiPath: "STRING_VALUE",
 * //             parameters: [
 * //               {
 * //                 name: "STRING_VALUE",
 * //                 type: "STRING_VALUE",
 * //                 value: "STRING_VALUE",
 * //               },
 * //             ],
 * //             requestBody: {
 * //               content: {
 * //                 "<keys>": {
 * //                   properties: [
 * //                     "<Parameter>",
 * //                   ],
 * //                 },
 * //               },
 * //             },
 * //             actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //             agentId: "STRING_VALUE",
 * //             collaboratorName: "STRING_VALUE",
 * //           },
 * //           functionInvocationInput: {
 * //             actionGroup: "STRING_VALUE", // required
 * //             parameters: [
 * //               {
 * //                 name: "STRING_VALUE",
 * //                 type: "STRING_VALUE",
 * //                 value: "STRING_VALUE",
 * //               },
 * //             ],
 * //             function: "STRING_VALUE",
 * //             actionInvocationType: "RESULT" || "USER_CONFIRMATION" || "USER_CONFIRMATION_AND_RESULT",
 * //             agentId: "STRING_VALUE",
 * //             collaboratorName: "STRING_VALUE",
 * //           },
 * //         },
 * //       ],
 * //       invocationId: "STRING_VALUE",
 * //     },
 * //     internalServerException: { // InternalServerException
 * //       message: "STRING_VALUE",
 * //       reason: "STRING_VALUE",
 * //     },
 * //     validationException: { // ValidationException
 * //       message: "STRING_VALUE",
 * //     },
 * //     resourceNotFoundException: { // ResourceNotFoundException
 * //       message: "STRING_VALUE",
 * //     },
 * //     serviceQuotaExceededException: { // ServiceQuotaExceededException
 * //       message: "STRING_VALUE",
 * //     },
 * //     throttlingException: { // ThrottlingException
 * //       message: "STRING_VALUE",
 * //     },
 * //     accessDeniedException: { // AccessDeniedException
 * //       message: "STRING_VALUE",
 * //     },
 * //     conflictException: { // ConflictException
 * //       message: "STRING_VALUE",
 * //     },
 * //     dependencyFailedException: { // DependencyFailedException
 * //       message: "STRING_VALUE",
 * //       resourceName: "STRING_VALUE",
 * //     },
 * //     badGatewayException: { // BadGatewayException
 * //       message: "STRING_VALUE",
 * //       resourceName: "STRING_VALUE",
 * //     },
 * //     modelNotReadyException: { // ModelNotReadyException
 * //       message: "STRING_VALUE",
 * //     },
 * //     files: { // FilePart
 * //       files: [ // OutputFiles
 * //         { // OutputFile
 * //           name: "STRING_VALUE",
 * //           type: "STRING_VALUE",
 * //           bytes: new Uint8Array(),
 * //         },
 * //       ],
 * //     },
 * //   },
 * //   contentType: "STRING_VALUE", // required
 * //   sessionId: "STRING_VALUE", // required
 * //   memoryId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param InvokeAgentCommandInput - {@link InvokeAgentCommandInput}
 * @returns {@link InvokeAgentCommandOutput}
 * @see {@link InvokeAgentCommandInput} for command's `input` shape.
 * @see {@link InvokeAgentCommandOutput} for command's `response` shape.
 * @see {@link BedrockAgentRuntimeClientResolvedConfig | config} for BedrockAgentRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
 *
 * @throws {@link BadGatewayException} (server fault)
 *  <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
 *
 * @throws {@link DependencyFailedException} (client fault)
 *  <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An internal server error occurred. Retry your request.</p>
 *
 * @throws {@link ModelNotReadyException} (client fault)
 *  <p> The model specified in the request is not ready to serve inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide. </p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
 *
 * @throws {@link ServiceQuotaExceededException} (client fault)
 *  <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The number of requests exceeds the limit. Resubmit your request later.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>Input validation failed. Check your request parameters and retry the request.</p>
 *
 * @throws {@link BedrockAgentRuntimeServiceException}
 * <p>Base exception class for all service exceptions from BedrockAgentRuntime service.</p>
 *
 *
 * @public
 */
export declare class InvokeAgentCommand extends InvokeAgentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: InvokeAgentRequest;
            output: InvokeAgentResponse;
        };
        sdk: {
            input: InvokeAgentCommandInput;
            output: InvokeAgentCommandOutput;
        };
    };
}
