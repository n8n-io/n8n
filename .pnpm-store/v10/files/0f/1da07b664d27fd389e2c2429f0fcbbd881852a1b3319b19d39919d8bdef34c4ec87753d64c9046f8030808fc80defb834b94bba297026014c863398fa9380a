import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import type { GetInvocationStepRequest, GetInvocationStepResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetInvocationStepCommand}.
 */
export interface GetInvocationStepCommandInput extends GetInvocationStepRequest {
}
/**
 * @public
 *
 * The output of {@link GetInvocationStepCommand}.
 */
export interface GetInvocationStepCommandOutput extends GetInvocationStepResponse, __MetadataBearer {
}
declare const GetInvocationStepCommand_base: {
    new (input: GetInvocationStepCommandInput): import("@smithy/smithy-client").CommandImpl<GetInvocationStepCommandInput, GetInvocationStepCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetInvocationStepCommandInput): import("@smithy/smithy-client").CommandImpl<GetInvocationStepCommandInput, GetInvocationStepCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves the details of a specific invocation step within an invocation in a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, GetInvocationStepCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, GetInvocationStepCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * // import type { BedrockAgentRuntimeClientConfig } from "@aws-sdk/client-bedrock-agent-runtime";
 * const config = {}; // type is BedrockAgentRuntimeClientConfig
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // GetInvocationStepRequest
 *   invocationIdentifier: "STRING_VALUE", // required
 *   invocationStepId: "STRING_VALUE", // required
 *   sessionIdentifier: "STRING_VALUE", // required
 * };
 * const command = new GetInvocationStepCommand(input);
 * const response = await client.send(command);
 * // { // GetInvocationStepResponse
 * //   invocationStep: { // InvocationStep
 * //     sessionId: "STRING_VALUE", // required
 * //     invocationId: "STRING_VALUE", // required
 * //     invocationStepId: "STRING_VALUE", // required
 * //     invocationStepTime: new Date("TIMESTAMP"), // required
 * //     payload: { // InvocationStepPayload Union: only one key present
 * //       contentBlocks: [ // BedrockSessionContentBlocks
 * //         { // BedrockSessionContentBlock Union: only one key present
 * //           text: "STRING_VALUE",
 * //           image: { // ImageBlock
 * //             format: "png" || "jpeg" || "gif" || "webp", // required
 * //             source: { // ImageSource Union: only one key present
 * //               bytes: new Uint8Array(),
 * //               s3Location: { // S3Location
 * //                 uri: "STRING_VALUE", // required
 * //               },
 * //             },
 * //           },
 * //         },
 * //       ],
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetInvocationStepCommandInput - {@link GetInvocationStepCommandInput}
 * @returns {@link GetInvocationStepCommandOutput}
 * @see {@link GetInvocationStepCommandInput} for command's `input` shape.
 * @see {@link GetInvocationStepCommandOutput} for command's `response` shape.
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
export declare class GetInvocationStepCommand extends GetInvocationStepCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetInvocationStepRequest;
            output: GetInvocationStepResponse;
        };
        sdk: {
            input: GetInvocationStepCommandInput;
            output: GetInvocationStepCommandOutput;
        };
    };
}
