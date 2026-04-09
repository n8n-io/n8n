import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { RetrieveAndGenerateRequest, RetrieveAndGenerateResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RetrieveAndGenerateCommand}.
 */
export interface RetrieveAndGenerateCommandInput extends RetrieveAndGenerateRequest {
}
/**
 * @public
 *
 * The output of {@link RetrieveAndGenerateCommand}.
 */
export interface RetrieveAndGenerateCommandOutput extends RetrieveAndGenerateResponse, __MetadataBearer {
}
declare const RetrieveAndGenerateCommand_base: {
    new (input: RetrieveAndGenerateCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveAndGenerateCommandInput, RetrieveAndGenerateCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RetrieveAndGenerateCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveAndGenerateCommandInput, RetrieveAndGenerateCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Queries a knowledge base and generates responses based on the retrieved results and using the specified foundation model or <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html">inference profile</a>. The response only cites sources that are relevant to the query.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // RetrieveAndGenerateRequest
 *   sessionId: "STRING_VALUE",
 *   input: { // RetrieveAndGenerateInput
 *     text: "STRING_VALUE", // required
 *   },
 *   retrieveAndGenerateConfiguration: { // RetrieveAndGenerateConfiguration
 *     type: "KNOWLEDGE_BASE" || "EXTERNAL_SOURCES", // required
 *     knowledgeBaseConfiguration: { // KnowledgeBaseRetrieveAndGenerateConfiguration
 *       knowledgeBaseId: "STRING_VALUE", // required
 *       modelArn: "STRING_VALUE", // required
 *       retrievalConfiguration: { // KnowledgeBaseRetrievalConfiguration
 *         vectorSearchConfiguration: { // KnowledgeBaseVectorSearchConfiguration
 *           numberOfResults: Number("int"),
 *           overrideSearchType: "HYBRID" || "SEMANTIC",
 *           filter: { // RetrievalFilter Union: only one key present
 *             equals: { // FilterAttribute
 *               key: "STRING_VALUE", // required
 *               value: "DOCUMENT_VALUE", // required
 *             },
 *             notEquals: {
 *               key: "STRING_VALUE", // required
 *               value: "DOCUMENT_VALUE", // required
 *             },
 *             greaterThan: {
 *               key: "STRING_VALUE", // required
 *               value: "DOCUMENT_VALUE", // required
 *             },
 *             greaterThanOrEquals: {
 *               key: "STRING_VALUE", // required
 *               value: "DOCUMENT_VALUE", // required
 *             },
 *             lessThan: {
 *               key: "STRING_VALUE", // required
 *               value: "DOCUMENT_VALUE", // required
 *             },
 *             lessThanOrEquals: "<FilterAttribute>",
 *             in: "<FilterAttribute>",
 *             notIn: "<FilterAttribute>",
 *             startsWith: "<FilterAttribute>",
 *             listContains: "<FilterAttribute>",
 *             stringContains: "<FilterAttribute>",
 *             andAll: [ // RetrievalFilterList
 *               {//  Union: only one key present
 *                 equals: "<FilterAttribute>",
 *                 notEquals: "<FilterAttribute>",
 *                 greaterThan: "<FilterAttribute>",
 *                 greaterThanOrEquals: "<FilterAttribute>",
 *                 lessThan: "<FilterAttribute>",
 *                 lessThanOrEquals: "<FilterAttribute>",
 *                 in: "<FilterAttribute>",
 *                 notIn: "<FilterAttribute>",
 *                 startsWith: "<FilterAttribute>",
 *                 listContains: "<FilterAttribute>",
 *                 stringContains: "<FilterAttribute>",
 *                 andAll: [
 *                   "<RetrievalFilter>",
 *                 ],
 *                 orAll: [
 *                   "<RetrievalFilter>",
 *                 ],
 *               },
 *             ],
 *             orAll: [
 *               "<RetrievalFilter>",
 *             ],
 *           },
 *           rerankingConfiguration: { // VectorSearchRerankingConfiguration
 *             type: "BEDROCK_RERANKING_MODEL", // required
 *             bedrockRerankingConfiguration: { // VectorSearchBedrockRerankingConfiguration
 *               modelConfiguration: { // VectorSearchBedrockRerankingModelConfiguration
 *                 modelArn: "STRING_VALUE", // required
 *                 additionalModelRequestFields: { // AdditionalModelRequestFields
 *                   "<keys>": "DOCUMENT_VALUE",
 *                 },
 *               },
 *               numberOfRerankedResults: Number("int"),
 *               metadataConfiguration: { // MetadataConfigurationForReranking
 *                 selectionMode: "SELECTIVE" || "ALL", // required
 *                 selectiveModeConfiguration: { // RerankingMetadataSelectiveModeConfiguration Union: only one key present
 *                   fieldsToInclude: [ // FieldsForReranking
 *                     { // FieldForReranking
 *                       fieldName: "STRING_VALUE", // required
 *                     },
 *                   ],
 *                   fieldsToExclude: [
 *                     {
 *                       fieldName: "STRING_VALUE", // required
 *                     },
 *                   ],
 *                 },
 *               },
 *             },
 *           },
 *           implicitFilterConfiguration: { // ImplicitFilterConfiguration
 *             metadataAttributes: [ // MetadataAttributeSchemaList // required
 *               { // MetadataAttributeSchema
 *                 key: "STRING_VALUE", // required
 *                 type: "STRING" || "NUMBER" || "BOOLEAN" || "STRING_LIST", // required
 *                 description: "STRING_VALUE", // required
 *               },
 *             ],
 *             modelArn: "STRING_VALUE", // required
 *           },
 *         },
 *       },
 *       generationConfiguration: { // GenerationConfiguration
 *         promptTemplate: { // PromptTemplate
 *           textPromptTemplate: "STRING_VALUE",
 *         },
 *         guardrailConfiguration: { // GuardrailConfiguration
 *           guardrailId: "STRING_VALUE", // required
 *           guardrailVersion: "STRING_VALUE", // required
 *         },
 *         inferenceConfig: { // InferenceConfig
 *           textInferenceConfig: { // TextInferenceConfig
 *             temperature: Number("float"),
 *             topP: Number("float"),
 *             maxTokens: Number("int"),
 *             stopSequences: [ // RAGStopSequences
 *               "STRING_VALUE",
 *             ],
 *           },
 *         },
 *         additionalModelRequestFields: {
 *           "<keys>": "DOCUMENT_VALUE",
 *         },
 *         performanceConfig: { // PerformanceConfiguration
 *           latency: "standard" || "optimized",
 *         },
 *       },
 *       orchestrationConfiguration: { // OrchestrationConfiguration
 *         promptTemplate: {
 *           textPromptTemplate: "STRING_VALUE",
 *         },
 *         inferenceConfig: {
 *           textInferenceConfig: {
 *             temperature: Number("float"),
 *             topP: Number("float"),
 *             maxTokens: Number("int"),
 *             stopSequences: [
 *               "STRING_VALUE",
 *             ],
 *           },
 *         },
 *         additionalModelRequestFields: {
 *           "<keys>": "DOCUMENT_VALUE",
 *         },
 *         queryTransformationConfiguration: { // QueryTransformationConfiguration
 *           type: "QUERY_DECOMPOSITION", // required
 *         },
 *         performanceConfig: {
 *           latency: "standard" || "optimized",
 *         },
 *       },
 *     },
 *     externalSourcesConfiguration: { // ExternalSourcesRetrieveAndGenerateConfiguration
 *       modelArn: "STRING_VALUE", // required
 *       sources: [ // ExternalSources // required
 *         { // ExternalSource
 *           sourceType: "S3" || "BYTE_CONTENT", // required
 *           s3Location: { // S3ObjectDoc
 *             uri: "STRING_VALUE", // required
 *           },
 *           byteContent: { // ByteContentDoc
 *             identifier: "STRING_VALUE", // required
 *             contentType: "STRING_VALUE", // required
 *             data: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")             // required
 *           },
 *         },
 *       ],
 *       generationConfiguration: { // ExternalSourcesGenerationConfiguration
 *         promptTemplate: {
 *           textPromptTemplate: "STRING_VALUE",
 *         },
 *         guardrailConfiguration: {
 *           guardrailId: "STRING_VALUE", // required
 *           guardrailVersion: "STRING_VALUE", // required
 *         },
 *         inferenceConfig: {
 *           textInferenceConfig: {
 *             temperature: Number("float"),
 *             topP: Number("float"),
 *             maxTokens: Number("int"),
 *             stopSequences: [
 *               "STRING_VALUE",
 *             ],
 *           },
 *         },
 *         additionalModelRequestFields: {
 *           "<keys>": "DOCUMENT_VALUE",
 *         },
 *         performanceConfig: {
 *           latency: "standard" || "optimized",
 *         },
 *       },
 *     },
 *   },
 *   sessionConfiguration: { // RetrieveAndGenerateSessionConfiguration
 *     kmsKeyArn: "STRING_VALUE", // required
 *   },
 * };
 * const command = new RetrieveAndGenerateCommand(input);
 * const response = await client.send(command);
 * // { // RetrieveAndGenerateResponse
 * //   sessionId: "STRING_VALUE", // required
 * //   output: { // RetrieveAndGenerateOutput
 * //     text: "STRING_VALUE", // required
 * //   },
 * //   citations: [ // Citations
 * //     { // Citation
 * //       generatedResponsePart: { // GeneratedResponsePart
 * //         textResponsePart: { // TextResponsePart
 * //           text: "STRING_VALUE",
 * //           span: { // Span
 * //             start: Number("int"),
 * //             end: Number("int"),
 * //           },
 * //         },
 * //       },
 * //       retrievedReferences: [ // RetrievedReferences
 * //         { // RetrievedReference
 * //           content: { // RetrievalResultContent
 * //             type: "TEXT" || "IMAGE" || "ROW" || "AUDIO" || "VIDEO",
 * //             text: "STRING_VALUE",
 * //             byteContent: "STRING_VALUE",
 * //             video: { // VideoSegment
 * //               s3Uri: "STRING_VALUE", // required
 * //               summary: "STRING_VALUE",
 * //             },
 * //             audio: { // AudioSegment
 * //               s3Uri: "STRING_VALUE", // required
 * //               transcription: "STRING_VALUE",
 * //             },
 * //             row: [ // RetrievalResultContentRow
 * //               { // RetrievalResultContentColumn
 * //                 columnName: "STRING_VALUE",
 * //                 columnValue: "STRING_VALUE",
 * //                 type: "BLOB" || "BOOLEAN" || "DOUBLE" || "NULL" || "LONG" || "STRING",
 * //               },
 * //             ],
 * //           },
 * //           location: { // RetrievalResultLocation
 * //             type: "S3" || "WEB" || "CONFLUENCE" || "SALESFORCE" || "SHAREPOINT" || "CUSTOM" || "KENDRA" || "SQL", // required
 * //             s3Location: { // RetrievalResultS3Location
 * //               uri: "STRING_VALUE",
 * //             },
 * //             webLocation: { // RetrievalResultWebLocation
 * //               url: "STRING_VALUE",
 * //             },
 * //             confluenceLocation: { // RetrievalResultConfluenceLocation
 * //               url: "STRING_VALUE",
 * //             },
 * //             salesforceLocation: { // RetrievalResultSalesforceLocation
 * //               url: "STRING_VALUE",
 * //             },
 * //             sharePointLocation: { // RetrievalResultSharePointLocation
 * //               url: "STRING_VALUE",
 * //             },
 * //             customDocumentLocation: { // RetrievalResultCustomDocumentLocation
 * //               id: "STRING_VALUE",
 * //             },
 * //             kendraDocumentLocation: { // RetrievalResultKendraDocumentLocation
 * //               uri: "STRING_VALUE",
 * //             },
 * //             sqlLocation: { // RetrievalResultSqlLocation
 * //               query: "STRING_VALUE",
 * //             },
 * //           },
 * //           metadata: { // RetrievalResultMetadata
 * //             "<keys>": "DOCUMENT_VALUE",
 * //           },
 * //         },
 * //       ],
 * //     },
 * //   ],
 * //   guardrailAction: "INTERVENED" || "NONE",
 * // };
 *
 * ```
 *
 * @param RetrieveAndGenerateCommandInput - {@link RetrieveAndGenerateCommandInput}
 * @returns {@link RetrieveAndGenerateCommandOutput}
 * @see {@link RetrieveAndGenerateCommandInput} for command's `input` shape.
 * @see {@link RetrieveAndGenerateCommandOutput} for command's `response` shape.
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
export declare class RetrieveAndGenerateCommand extends RetrieveAndGenerateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RetrieveAndGenerateRequest;
            output: RetrieveAndGenerateResponse;
        };
        sdk: {
            input: RetrieveAndGenerateCommandInput;
            output: RetrieveAndGenerateCommandOutput;
        };
    };
}
