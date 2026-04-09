import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { GenerateQueryRequest, GenerateQueryResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GenerateQueryCommand}.
 */
export interface GenerateQueryCommandInput extends GenerateQueryRequest {
}
/**
 * @public
 *
 * The output of {@link GenerateQueryCommand}.
 */
export interface GenerateQueryCommandOutput extends GenerateQueryResponse, __MetadataBearer {
}
declare const GenerateQueryCommand_base: {
    new (input: GenerateQueryCommandInput): import("@smithy/smithy-client").CommandImpl<GenerateQueryCommandInput, GenerateQueryCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GenerateQueryCommandInput): import("@smithy/smithy-client").CommandImpl<GenerateQueryCommandInput, GenerateQueryCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Generates an SQL query from a natural language query. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-generate-query.html">Generate a query for structured data</a> in the Amazon Bedrock User Guide.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, GenerateQueryCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, GenerateQueryCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // GenerateQueryRequest
 *   queryGenerationInput: { // QueryGenerationInput
 *     type: "TEXT", // required
 *     text: "STRING_VALUE", // required
 *   },
 *   transformationConfiguration: { // TransformationConfiguration
 *     mode: "TEXT_TO_SQL", // required
 *     textToSqlConfiguration: { // TextToSqlConfiguration
 *       type: "KNOWLEDGE_BASE", // required
 *       knowledgeBaseConfiguration: { // TextToSqlKnowledgeBaseConfiguration
 *         knowledgeBaseArn: "STRING_VALUE", // required
 *       },
 *     },
 *   },
 * };
 * const command = new GenerateQueryCommand(input);
 * const response = await client.send(command);
 * // { // GenerateQueryResponse
 * //   queries: [ // GeneratedQueries
 * //     { // GeneratedQuery
 * //       type: "REDSHIFT_SQL",
 * //       sql: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GenerateQueryCommandInput - {@link GenerateQueryCommandInput}
 * @returns {@link GenerateQueryCommandOutput}
 * @see {@link GenerateQueryCommandInput} for command's `input` shape.
 * @see {@link GenerateQueryCommandOutput} for command's `response` shape.
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
export declare class GenerateQueryCommand extends GenerateQueryCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GenerateQueryRequest;
            output: GenerateQueryResponse;
        };
        sdk: {
            input: GenerateQueryCommandInput;
            output: GenerateQueryCommandOutput;
        };
    };
}
