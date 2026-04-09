import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { UpdateSessionRequest, UpdateSessionResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateSessionCommand}.
 */
export interface UpdateSessionCommandInput extends UpdateSessionRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateSessionCommand}.
 */
export interface UpdateSessionCommandOutput extends UpdateSessionResponse, __MetadataBearer {
}
declare const UpdateSessionCommand_base: {
    new (input: UpdateSessionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSessionCommandInput, UpdateSessionCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateSessionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSessionCommandInput, UpdateSessionCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the metadata or encryption settings of a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, UpdateSessionCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, UpdateSessionCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // UpdateSessionRequest
 *   sessionMetadata: { // SessionMetadataMap
 *     "<keys>": "STRING_VALUE",
 *   },
 *   sessionIdentifier: "STRING_VALUE", // required
 * };
 * const command = new UpdateSessionCommand(input);
 * const response = await client.send(command);
 * // { // UpdateSessionResponse
 * //   sessionId: "STRING_VALUE", // required
 * //   sessionArn: "STRING_VALUE", // required
 * //   sessionStatus: "ACTIVE" || "EXPIRED" || "ENDED", // required
 * //   createdAt: new Date("TIMESTAMP"), // required
 * //   lastUpdatedAt: new Date("TIMESTAMP"), // required
 * // };
 *
 * ```
 *
 * @param UpdateSessionCommandInput - {@link UpdateSessionCommandInput}
 * @returns {@link UpdateSessionCommandOutput}
 * @see {@link UpdateSessionCommandInput} for command's `input` shape.
 * @see {@link UpdateSessionCommandOutput} for command's `response` shape.
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
export declare class UpdateSessionCommand extends UpdateSessionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateSessionRequest;
            output: UpdateSessionResponse;
        };
        sdk: {
            input: UpdateSessionCommandInput;
            output: UpdateSessionCommandOutput;
        };
    };
}
