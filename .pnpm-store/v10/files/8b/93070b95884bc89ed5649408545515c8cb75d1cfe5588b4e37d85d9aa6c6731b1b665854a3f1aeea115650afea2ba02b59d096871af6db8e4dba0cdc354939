import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockAgentRuntimeClient";
import { InvokeFlowRequest, InvokeFlowResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link InvokeFlowCommand}.
 */
export interface InvokeFlowCommandInput extends InvokeFlowRequest {
}
/**
 * @public
 *
 * The output of {@link InvokeFlowCommand}.
 */
export interface InvokeFlowCommandOutput extends InvokeFlowResponse, __MetadataBearer {
}
declare const InvokeFlowCommand_base: {
    new (input: InvokeFlowCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeFlowCommandInput, InvokeFlowCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: InvokeFlowCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeFlowCommandInput, InvokeFlowCommandOutput, BedrockAgentRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Invokes an alias of a flow to run the inputs that you specify and return the output of each node as a stream. If there's an error, the error is returned. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-test.html">Test a flow in Amazon Bedrock</a> in the <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-service.html">Amazon Bedrock User Guide</a>.</p> <note> <p>The CLI doesn't support streaming operations in Amazon Bedrock, including <code>InvokeFlow</code>.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockAgentRuntimeClient, InvokeFlowCommand } from "@aws-sdk/client-bedrock-agent-runtime"; // ES Modules import
 * // const { BedrockAgentRuntimeClient, InvokeFlowCommand } = require("@aws-sdk/client-bedrock-agent-runtime"); // CommonJS import
 * const client = new BedrockAgentRuntimeClient(config);
 * const input = { // InvokeFlowRequest
 *   flowIdentifier: "STRING_VALUE", // required
 *   flowAliasIdentifier: "STRING_VALUE", // required
 *   inputs: [ // FlowInputs // required
 *     { // FlowInput
 *       nodeName: "STRING_VALUE", // required
 *       nodeOutputName: "STRING_VALUE",
 *       content: { // FlowInputContent Union: only one key present
 *         document: "DOCUMENT_VALUE",
 *       },
 *       nodeInputName: "STRING_VALUE",
 *     },
 *   ],
 *   enableTrace: true || false,
 *   modelPerformanceConfiguration: { // ModelPerformanceConfiguration
 *     performanceConfig: { // PerformanceConfiguration
 *       latency: "standard" || "optimized",
 *     },
 *   },
 *   executionId: "STRING_VALUE",
 * };
 * const command = new InvokeFlowCommand(input);
 * const response = await client.send(command);
 * // { // InvokeFlowResponse
 * //   responseStream: { // FlowResponseStream Union: only one key present
 * //     flowOutputEvent: { // FlowOutputEvent
 * //       nodeName: "STRING_VALUE", // required
 * //       nodeType: "FlowInputNode" || "FlowOutputNode" || "LambdaFunctionNode" || "KnowledgeBaseNode" || "PromptNode" || "ConditionNode" || "LexNode", // required
 * //       content: { // FlowOutputContent Union: only one key present
 * //         document: "DOCUMENT_VALUE",
 * //       },
 * //     },
 * //     flowCompletionEvent: { // FlowCompletionEvent
 * //       completionReason: "SUCCESS" || "INPUT_REQUIRED", // required
 * //     },
 * //     flowTraceEvent: { // FlowTraceEvent
 * //       trace: { // FlowTrace Union: only one key present
 * //         nodeInputTrace: { // FlowTraceNodeInputEvent
 * //           nodeName: "STRING_VALUE", // required
 * //           timestamp: new Date("TIMESTAMP"), // required
 * //           fields: [ // FlowTraceNodeInputFields // required
 * //             { // FlowTraceNodeInputField
 * //               nodeInputName: "STRING_VALUE", // required
 * //               content: { // FlowTraceNodeInputContent Union: only one key present
 * //                 document: "DOCUMENT_VALUE",
 * //               },
 * //             },
 * //           ],
 * //         },
 * //         nodeOutputTrace: { // FlowTraceNodeOutputEvent
 * //           nodeName: "STRING_VALUE", // required
 * //           timestamp: new Date("TIMESTAMP"), // required
 * //           fields: [ // FlowTraceNodeOutputFields // required
 * //             { // FlowTraceNodeOutputField
 * //               nodeOutputName: "STRING_VALUE", // required
 * //               content: { // FlowTraceNodeOutputContent Union: only one key present
 * //                 document: "DOCUMENT_VALUE",
 * //               },
 * //             },
 * //           ],
 * //         },
 * //         conditionNodeResultTrace: { // FlowTraceConditionNodeResultEvent
 * //           nodeName: "STRING_VALUE", // required
 * //           timestamp: new Date("TIMESTAMP"), // required
 * //           satisfiedConditions: [ // FlowTraceConditions // required
 * //             { // FlowTraceCondition
 * //               conditionName: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //         nodeActionTrace: { // FlowTraceNodeActionEvent
 * //           nodeName: "STRING_VALUE", // required
 * //           timestamp: new Date("TIMESTAMP"), // required
 * //           requestId: "STRING_VALUE", // required
 * //           serviceName: "STRING_VALUE", // required
 * //           operationName: "STRING_VALUE", // required
 * //         },
 * //       },
 * //     },
 * //     internalServerException: { // InternalServerException
 * //       message: "STRING_VALUE",
 * //       reason: "STRING_VALUE",
 * //     },
 * //     validationException: { // ValidationException
 * //       message: "STRING_VALUE",
 * //     },
 * //     resourceNotFoundException: { // ResourceNotFoundException
 * //       message: "STRING_VALUE",
 * //     },
 * //     serviceQuotaExceededException: { // ServiceQuotaExceededException
 * //       message: "STRING_VALUE",
 * //     },
 * //     throttlingException: { // ThrottlingException
 * //       message: "STRING_VALUE",
 * //     },
 * //     accessDeniedException: { // AccessDeniedException
 * //       message: "STRING_VALUE",
 * //     },
 * //     conflictException: { // ConflictException
 * //       message: "STRING_VALUE",
 * //     },
 * //     dependencyFailedException: { // DependencyFailedException
 * //       message: "STRING_VALUE",
 * //       resourceName: "STRING_VALUE",
 * //     },
 * //     badGatewayException: { // BadGatewayException
 * //       message: "STRING_VALUE",
 * //       resourceName: "STRING_VALUE",
 * //     },
 * //     flowMultiTurnInputRequestEvent: { // FlowMultiTurnInputRequestEvent
 * //       nodeName: "STRING_VALUE", // required
 * //       nodeType: "FlowInputNode" || "FlowOutputNode" || "LambdaFunctionNode" || "KnowledgeBaseNode" || "PromptNode" || "ConditionNode" || "LexNode", // required
 * //       content: { // FlowMultiTurnInputContent Union: only one key present
 * //         document: "DOCUMENT_VALUE",
 * //       },
 * //     },
 * //   },
 * //   executionId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param InvokeFlowCommandInput - {@link InvokeFlowCommandInput}
 * @returns {@link InvokeFlowCommandOutput}
 * @see {@link InvokeFlowCommandInput} for command's `input` shape.
 * @see {@link InvokeFlowCommandOutput} for command's `response` shape.
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
export declare class InvokeFlowCommand extends InvokeFlowCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: InvokeFlowRequest;
            output: InvokeFlowResponse;
        };
        sdk: {
            input: InvokeFlowCommandInput;
            output: InvokeFlowCommandOutput;
        };
    };
}
