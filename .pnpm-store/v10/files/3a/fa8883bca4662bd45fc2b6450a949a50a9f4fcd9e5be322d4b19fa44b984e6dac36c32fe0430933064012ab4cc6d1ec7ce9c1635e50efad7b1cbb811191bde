import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { RerankRequest, RerankResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RerankCommand}.
 */
export interface RerankCommandInput extends RerankRequest {
}
/**
 * @public
 *
 * The output of {@link RerankCommand}.
 */
export interface RerankCommandOutput extends RerankResponse, __MetadataBearer {
}
declare const RerankCommand_base: {
    new (input: RerankCommandInput): import("@smithy/smithy-client").CommandImpl<RerankCommandInput, RerankCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RerankCommandInput): import("@smithy/smithy-client").CommandImpl<RerankCommandInput, RerankCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Reranks the relevance of sources based on queries. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html">Improve the relevance of query responses with a reranker model</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, RerankCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, RerankCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // RerankRequest
 *   queries: [ // RerankQueriesList // required
 *     { // RerankQuery
 *       type: "TEXT", // required
 *       textQuery: { // RerankTextDocument
 *         text: "STRING_VALUE",
 *       },
 *     },
 *   ],
 *   sources: [ // RerankSourcesList // required
 *     { // RerankSource
 *       type: "INLINE", // required
 *       inlineDocumentSource: { // RerankDocument
 *         type: "TEXT" || "JSON", // required
 *         textDocument: {
 *           text: "STRING_VALUE",
 *         },
 *         jsonDocument: "DOCUMENT_VALUE",
 *       },
 *     },
 *   ],
 *   rerankingConfiguration: { // RerankingConfiguration
 *     type: "BEDROCK_RERANKING_MODEL", // required
 *     bedrockRerankingConfiguration: { // BedrockRerankingConfiguration
 *       numberOfResults: Number("int"),
 *       modelConfiguration: { // BedrockRerankingModelConfiguration
 *         modelArn: "STRING_VALUE", // required
 *         additionalModelRequestFields: { // AdditionalModelRequestFields
 *           "<keys>": "DOCUMENT_VALUE",
 *         },
 *       },
 *     },
 *   },
 *   nextToken: "STRING_VALUE",
 * };
 * const command = new RerankCommand(input);
 * const response = await client.send(command);
 * // { // RerankResponse
 * //   results: [ // RerankResultsList // required
 * //     { // RerankResult
 * //       index: Number("int"), // required
 * //       relevanceScore: Number("float"), // required
 * //       document: { // RerankDocument
 * //         type: "TEXT" || "JSON", // required
 * //         textDocument: { // RerankTextDocument
 * //           text: "STRING_VALUE",
 * //         },
 * //         jsonDocument: "DOCUMENT_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   nextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param RerankCommandInput - {@link RerankCommandInput}
 * @returns {@link RerankCommandOutput}
 * @see {@link RerankCommandInput} for command's `input` shape.
 * @see {@link RerankCommandOutput} for command's `response` shape.
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
export declare class RerankCommand extends RerankCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RerankRequest;
            output: RerankResponse;
        };
        sdk: {
            input: RerankCommandInput;
            output: RerankCommandOutput;
        };
    };
}
