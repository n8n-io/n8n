import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { EndSessionRequest, EndSessionResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link EndSessionCommand}.
 */
export interface EndSessionCommandInput extends EndSessionRequest {
}
/**
 * @public
 *
 * The output of {@link EndSessionCommand}.
 */
export interface EndSessionCommandOutput extends EndSessionResponse, __MetadataBearer {
}
declare const EndSessionCommand_base: {
    new (input: EndSessionCommandInput): import("@smithy/smithy-client").CommandImpl<EndSessionCommandInput, EndSessionCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: EndSessionCommandInput): import("@smithy/smithy-client").CommandImpl<EndSessionCommandInput, EndSessionCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Ends the session. After you end a session, you can still access its content but you can’t add to it. To delete the session and it's content, you use the DeleteSession API operation. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, EndSessionCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, EndSessionCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // EndSessionRequest
 *   sessionIdentifier: "STRING_VALUE", // required
 * };
 * const command = new EndSessionCommand(input);
 * const response = await client.send(command);
 * // { // EndSessionResponse
 * //   sessionId: "STRING_VALUE", // required
 * //   sessionArn: "STRING_VALUE", // required
 * //   sessionStatus: "ACTIVE" || "EXPIRED" || "ENDED", // required
 * // };
 *
 * ```
 *
 * @param EndSessionCommandInput - {@link EndSessionCommandInput}
 * @returns {@link EndSessionCommandOutput}
 * @see {@link EndSessionCommandInput} for command's `input` shape.
 * @see {@link EndSessionCommandOutput} for command's `response` shape.
 * @see {@link BedrockAgentRuntimeClientResolvedConfig | config} for BedrockAgentRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
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
export declare class EndSessionCommand extends EndSessionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: EndSessionRequest;
            output: EndSessionResponse;
        };
        sdk: {
            input: EndSessionCommandInput;
            output: EndSessionCommandOutput;
        };
    };
}
