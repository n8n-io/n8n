import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { ListInvocationsRequest, ListInvocationsResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListInvocationsCommand}.
 */
export interface ListInvocationsCommandInput extends ListInvocationsRequest {
}
/**
 * @public
 *
 * The output of {@link ListInvocationsCommand}.
 */
export interface ListInvocationsCommandOutput extends ListInvocationsResponse, __MetadataBearer {
}
declare const ListInvocationsCommand_base: {
    new (input: ListInvocationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListInvocationsCommandInput, ListInvocationsCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListInvocationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListInvocationsCommandInput, ListInvocationsCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists all invocations associated with a specific session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, ListInvocationsCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, ListInvocationsCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // ListInvocationsRequest
 *   nextToken: "STRING_VALUE",
 *   maxResults: Number("int"),
 *   sessionIdentifier: "STRING_VALUE", // required
 * };
 * const command = new ListInvocationsCommand(input);
 * const response = await client.send(command);
 * // { // ListInvocationsResponse
 * //   invocationSummaries: [ // InvocationSummaries // required
 * //     { // InvocationSummary
 * //       sessionId: "STRING_VALUE", // required
 * //       invocationId: "STRING_VALUE", // required
 * //       createdAt: new Date("TIMESTAMP"), // required
 * //     },
 * //   ],
 * //   nextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListInvocationsCommandInput - {@link ListInvocationsCommandInput}
 * @returns {@link ListInvocationsCommandOutput}
 * @see {@link ListInvocationsCommandInput} for command's `input` shape.
 * @see {@link ListInvocationsCommandOutput} for command's `response` shape.
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
export declare class ListInvocationsCommand extends ListInvocationsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListInvocationsRequest;
            output: ListInvocationsResponse;
        };
        sdk: {
            input: ListInvocationsCommandInput;
            output: ListInvocationsCommandOutput;
        };
    };
}
