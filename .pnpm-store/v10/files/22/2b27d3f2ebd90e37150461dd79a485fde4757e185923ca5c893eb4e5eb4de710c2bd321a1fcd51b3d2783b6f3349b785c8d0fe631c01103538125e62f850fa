import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { DeleteAgentMemoryRequest, DeleteAgentMemoryResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAgentMemoryCommand}.
 */
export interface DeleteAgentMemoryCommandInput extends DeleteAgentMemoryRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteAgentMemoryCommand}.
 */
export interface DeleteAgentMemoryCommandOutput extends DeleteAgentMemoryResponse, __MetadataBearer {
}
declare const DeleteAgentMemoryCommand_base: {
    new (input: DeleteAgentMemoryCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAgentMemoryCommandInput, DeleteAgentMemoryCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAgentMemoryCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAgentMemoryCommandInput, DeleteAgentMemoryCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes memory from the specified memory identifier.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, DeleteAgentMemoryCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, DeleteAgentMemoryCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // DeleteAgentMemoryRequest
 *   agentId: "STRING_VALUE", // required
 *   agentAliasId: "STRING_VALUE", // required
 *   memoryId: "STRING_VALUE",
 *   sessionId: "STRING_VALUE",
 * };
 * const command = new DeleteAgentMemoryCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteAgentMemoryCommandInput - {@link DeleteAgentMemoryCommandInput}
 * @returns {@link DeleteAgentMemoryCommandOutput}
 * @see {@link DeleteAgentMemoryCommandInput} for command's `input` shape.
 * @see {@link DeleteAgentMemoryCommandOutput} for command's `response` shape.
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
export declare class DeleteAgentMemoryCommand extends DeleteAgentMemoryCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAgentMemoryRequest;
            output: {};
        };
        sdk: {
            input: DeleteAgentMemoryCommandInput;
            output: DeleteAgentMemoryCommandOutput;
        };
    };
}
