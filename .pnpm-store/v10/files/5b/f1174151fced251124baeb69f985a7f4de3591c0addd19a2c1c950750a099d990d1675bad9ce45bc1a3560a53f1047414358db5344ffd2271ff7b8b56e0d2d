import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { RetrieveRequest, RetrieveResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RetrieveCommand}.
 */
export interface RetrieveCommandInput extends RetrieveRequest {
}
/**
 * @public
 *
 * The output of {@link RetrieveCommand}.
 */
export interface RetrieveCommandOutput extends RetrieveResponse, __MetadataBearer {
}
declare const RetrieveCommand_base: {
    new (input: RetrieveCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveCommandInput, RetrieveCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RetrieveCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveCommandInput, RetrieveCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Queries a knowledge base and retrieves information from it.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, RetrieveCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // RetrieveRequest
 *   knowledgeBaseId: "STRING_VALUE", // required
 *   retrievalQuery: { // KnowledgeBaseQuery
 *     type: "TEXT" || "IMAGE",
 *     text: "STRING_VALUE",
 *     image: { // InputImage
 *       format: "png" || "jpeg" || "gif" || "webp", // required
 *       inlineContent: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")       // required
 *     },
 *   },
 *   retrievalConfiguration: { // KnowledgeBaseRetrievalConfiguration
 *     vectorSearchConfiguration: { // KnowledgeBaseVectorSearchConfiguration
 *       numberOfResults: Number("int"),
 *       overrideSearchType: "HYBRID" || "SEMANTIC",
 *       filter: { // RetrievalFilter Union: only one key present
 *         equals: { // FilterAttribute
 *           key: "STRING_VALUE", // required
 *           value: "DOCUMENT_VALUE", // required
 *         },
 *         notEquals: {
 *           key: "STRING_VALUE", // required
 *           value: "DOCUMENT_VALUE", // required
 *         },
 *         greaterThan: {
 *           key: "STRING_VALUE", // required
 *           value: "DOCUMENT_VALUE", // required
 *         },
 *         greaterThanOrEquals: {
 *           key: "STRING_VALUE", // required
 *           value: "DOCUMENT_VALUE", // required
 *         },
 *         lessThan: {
 *           key: "STRING_VALUE", // required
 *           value: "DOCUMENT_VALUE", // required
 *         },
 *         lessThanOrEquals: "<FilterAttribute>",
 *         in: "<FilterAttribute>",
 *         notIn: "<FilterAttribute>",
 *         startsWith: "<FilterAttribute>",
 *         listContains: "<FilterAttribute>",
 *         stringContains: "<FilterAttribute>",
 *         andAll: [ // RetrievalFilterList
 *           {//  Union: only one key present
 *             equals: "<FilterAttribute>",
 *             notEquals: "<FilterAttribute>",
 *             greaterThan: "<FilterAttribute>",
 *             greaterThanOrEquals: "<FilterAttribute>",
 *             lessThan: "<FilterAttribute>",
 *             lessThanOrEquals: "<FilterAttribute>",
 *             in: "<FilterAttribute>",
 *             notIn: "<FilterAttribute>",
 *             startsWith: "<FilterAttribute>",
 *             listContains: "<FilterAttribute>",
 *             stringContains: "<FilterAttribute>",
 *             andAll: [
 *               "<RetrievalFilter>",
 *             ],
 *             orAll: [
 *               "<RetrievalFilter>",
 *             ],
 *           },
 *         ],
 *         orAll: [
 *           "<RetrievalFilter>",
 *         ],
 *       },
 *       rerankingConfiguration: { // VectorSearchRerankingConfiguration
 *         type: "BEDROCK_RERANKING_MODEL", // required
 *         bedrockRerankingConfiguration: { // VectorSearchBedrockRerankingConfiguration
 *           modelConfiguration: { // VectorSearchBedrockRerankingModelConfiguration
 *             modelArn: "STRING_VALUE", // required
 *             additionalModelRequestFields: { // AdditionalModelRequestFields
 *               "<keys>": "DOCUMENT_VALUE",
 *             },
 *           },
 *           numberOfRerankedResults: Number("int"),
 *           metadataConfiguration: { // MetadataConfigurationForReranking
 *             selectionMode: "SELECTIVE" || "ALL", // required
 *             selectiveModeConfiguration: { // RerankingMetadataSelectiveModeConfiguration Union: only one key present
 *               fieldsToInclude: [ // FieldsForReranking
 *                 { // FieldForReranking
 *                   fieldName: "STRING_VALUE", // required
 *                 },
 *               ],
 *               fieldsToExclude: [
 *                 {
 *                   fieldName: "STRING_VALUE", // required
 *                 },
 *               ],
 *             },
 *           },
 *         },
 *       },
 *       implicitFilterConfiguration: { // ImplicitFilterConfiguration
 *         metadataAttributes: [ // MetadataAttributeSchemaList // required
 *           { // MetadataAttributeSchema
 *             key: "STRING_VALUE", // required
 *             type: "STRING" || "NUMBER" || "BOOLEAN" || "STRING_LIST", // required
 *             description: "STRING_VALUE", // required
 *           },
 *         ],
 *         modelArn: "STRING_VALUE", // required
 *       },
 *     },
 *   },
 *   guardrailConfiguration: { // GuardrailConfiguration
 *     guardrailId: "STRING_VALUE", // required
 *     guardrailVersion: "STRING_VALUE", // required
 *   },
 *   nextToken: "STRING_VALUE",
 * };
 * const command = new RetrieveCommand(input);
 * const response = await client.send(command);
 * // { // RetrieveResponse
 * //   retrievalResults: [ // KnowledgeBaseRetrievalResults // required
 * //     { // KnowledgeBaseRetrievalResult
 * //       content: { // RetrievalResultContent
 * //         type: "TEXT" || "IMAGE" || "ROW" || "AUDIO" || "VIDEO",
 * //         text: "STRING_VALUE",
 * //         byteContent: "STRING_VALUE",
 * //         video: { // VideoSegment
 * //           s3Uri: "STRING_VALUE", // required
 * //           summary: "STRING_VALUE",
 * //         },
 * //         audio: { // AudioSegment
 * //           s3Uri: "STRING_VALUE", // required
 * //           transcription: "STRING_VALUE",
 * //         },
 * //         row: [ // RetrievalResultContentRow
 * //           { // RetrievalResultContentColumn
 * //             columnName: "STRING_VALUE",
 * //             columnValue: "STRING_VALUE",
 * //             type: "BLOB" || "BOOLEAN" || "DOUBLE" || "NULL" || "LONG" || "STRING",
 * //           },
 * //         ],
 * //       },
 * //       location: { // RetrievalResultLocation
 * //         type: "S3" || "WEB" || "CONFLUENCE" || "SALESFORCE" || "SHAREPOINT" || "CUSTOM" || "KENDRA" || "SQL", // required
 * //         s3Location: { // RetrievalResultS3Location
 * //           uri: "STRING_VALUE",
 * //         },
 * //         webLocation: { // RetrievalResultWebLocation
 * //           url: "STRING_VALUE",
 * //         },
 * //         confluenceLocation: { // RetrievalResultConfluenceLocation
 * //           url: "STRING_VALUE",
 * //         },
 * //         salesforceLocation: { // RetrievalResultSalesforceLocation
 * //           url: "STRING_VALUE",
 * //         },
 * //         sharePointLocation: { // RetrievalResultSharePointLocation
 * //           url: "STRING_VALUE",
 * //         },
 * //         customDocumentLocation: { // RetrievalResultCustomDocumentLocation
 * //           id: "STRING_VALUE",
 * //         },
 * //         kendraDocumentLocation: { // RetrievalResultKendraDocumentLocation
 * //           uri: "STRING_VALUE",
 * //         },
 * //         sqlLocation: { // RetrievalResultSqlLocation
 * //           query: "STRING_VALUE",
 * //         },
 * //       },
 * //       score: Number("double"),
 * //       metadata: { // RetrievalResultMetadata
 * //         "<keys>": "DOCUMENT_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   guardrailAction: "INTERVENED" || "NONE",
 * //   nextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param RetrieveCommandInput - {@link RetrieveCommandInput}
 * @returns {@link RetrieveCommandOutput}
 * @see {@link RetrieveCommandInput} for command's `input` shape.
 * @see {@link RetrieveCommandOutput} for command's `response` shape.
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
export declare class RetrieveCommand extends RetrieveCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RetrieveRequest;
            output: RetrieveResponse;
        };
        sdk: {
            input: RetrieveCommandInput;
            output: RetrieveCommandOutput;
        };
    };
}
