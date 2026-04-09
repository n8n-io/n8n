import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { ListFlowExecutionsRequest, ListFlowExecutionsResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListFlowExecutionsCommand}.
 */
export interface ListFlowExecutionsCommandInput extends ListFlowExecutionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListFlowExecutionsCommand}.
 */
export interface ListFlowExecutionsCommandOutput extends ListFlowExecutionsResponse, __MetadataBearer {
}
declare const ListFlowExecutionsCommand_base: {
    new (input: ListFlowExecutionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListFlowExecutionsCommandInput, ListFlowExecutionsCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListFlowExecutionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListFlowExecutionsCommandInput, ListFlowExecutionsCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists all executions of a flow. Results can be paginated and include summary information about each execution, such as status, start and end times, and the execution's Amazon Resource Name (ARN).</p> <note> <p>Flow executions is in preview release for Amazon Bedrock and is subject to change.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, ListFlowExecutionsCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, ListFlowExecutionsCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // ListFlowExecutionsRequest
 *   flowIdentifier: "STRING_VALUE", // required
 *   flowAliasIdentifier: "STRING_VALUE",
 *   maxResults: Number("int"),
 *   nextToken: "STRING_VALUE",
 * };
 * const command = new ListFlowExecutionsCommand(input);
 * const response = await client.send(command);
 * // { // ListFlowExecutionsResponse
 * //   flowExecutionSummaries: [ // FlowExecutionSummaries // required
 * //     { // FlowExecutionSummary
 * //       executionArn: "STRING_VALUE", // required
 * //       flowAliasIdentifier: "STRING_VALUE", // required
 * //       flowIdentifier: "STRING_VALUE", // required
 * //       flowVersion: "STRING_VALUE", // required
 * //       status: "Running" || "Succeeded" || "Failed" || "TimedOut" || "Aborted", // required
 * //       createdAt: new Date("TIMESTAMP"), // required
 * //       endedAt: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   nextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListFlowExecutionsCommandInput - {@link ListFlowExecutionsCommandInput}
 * @returns {@link ListFlowExecutionsCommandOutput}
 * @see {@link ListFlowExecutionsCommandInput} for command's `input` shape.
 * @see {@link ListFlowExecutionsCommandOutput} for command's `response` shape.
 * @see {@link BedrockAgentRuntimeClientResolvedConfig | config} for BedrockAgentRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An internal server error occurred. Retry your request.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
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
export declare class ListFlowExecutionsCommand extends ListFlowExecutionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListFlowExecutionsRequest;
            output: ListFlowExecutionsResponse;
        };
        sdk: {
            input: ListFlowExecutionsCommandInput;
            output: ListFlowExecutionsCommandOutput;
        };
    };
}
