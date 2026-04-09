import { Command as $Command } from "@smithy/smithy-client";
import type { BlobPayloadInputTypes, MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockRuntimeClient";
import { type InvokeModelWithResponseStreamResponse, InvokeModelWithResponseStreamRequest } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 */
export type InvokeModelWithResponseStreamCommandInputType = Omit<InvokeModelWithResponseStreamRequest, "body"> & {
    body?: BlobPayloadInputTypes;
};
/**
 * @public
 *
 * The input for {@link InvokeModelWithResponseStreamCommand}.
 */
export interface InvokeModelWithResponseStreamCommandInput extends InvokeModelWithResponseStreamCommandInputType {
}
/**
 * @public
 *
 * The output of {@link InvokeModelWithResponseStreamCommand}.
 */
export interface InvokeModelWithResponseStreamCommandOutput extends InvokeModelWithResponseStreamResponse, __MetadataBearer {
}
declare const InvokeModelWithResponseStreamCommand_base: {
    new (input: InvokeModelWithResponseStreamCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeModelWithResponseStreamCommandInput, InvokeModelWithResponseStreamCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: InvokeModelWithResponseStreamCommandInput): import("@smithy/smithy-client").CommandImpl<InvokeModelWithResponseStreamCommandInput, InvokeModelWithResponseStreamCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Invoke the specified Amazon Bedrock model to run inference using the prompt and inference parameters provided in the request body. The response is returned in a stream.</p> <p>To see if a model supports streaming, call <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetFoundationModel.html">GetFoundationModel</a> and check the <code>responseStreamingSupported</code> field in the response.</p> <note> <p>The CLI doesn't support streaming operations in Amazon Bedrock, including <code>InvokeModelWithResponseStream</code>.</p> </note> <p>For example code, see <i>Invoke model with streaming code example</i> in the <i>Amazon Bedrock User Guide</i>. </p> <p>This operation requires permissions to perform the <code>bedrock:InvokeModelWithResponseStream</code> action. </p> <important> <p>To deny all inference access to resources that you specify in the modelId field, you need to deny access to the <code>bedrock:InvokeModel</code> and <code>bedrock:InvokeModelWithResponseStream</code> actions. Doing this also denies access to the resource through the Converse API actions (<a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> and <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a>). For more information see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html#security_iam_id-based-policy-examples-deny-inference">Deny access for inference on specific models</a>. </p> </important> <p>For troubleshooting some of the common errors you might encounter when using the <code>InvokeModelWithResponseStream</code> API, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html">Troubleshooting Amazon Bedrock API Error Codes</a> in the Amazon Bedrock User Guide</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import
 * // const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } = require("@aws-sdk/client-bedrock-runtime"); // CommonJS import
 * // import type { BedrockRuntimeClientConfig } from "@aws-sdk/client-bedrock-runtime";
 * const config = {}; // type is BedrockRuntimeClientConfig
 * const client = new BedrockRuntimeClient(config);
 * const input = { // InvokeModelWithResponseStreamRequest
 *   body: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *   contentType: "STRING_VALUE",
 *   accept: "STRING_VALUE",
 *   modelId: "STRING_VALUE", // required
 *   trace: "ENABLED" || "DISABLED" || "ENABLED_FULL",
 *   guardrailIdentifier: "STRING_VALUE",
 *   guardrailVersion: "STRING_VALUE",
 *   performanceConfigLatency: "standard" || "optimized",
 *   serviceTier: "priority" || "default" || "flex" || "reserved",
 * };
 * const command = new InvokeModelWithResponseStreamCommand(input);
 * const response = await client.send(command);
 * // { // InvokeModelWithResponseStreamResponse
 * //   body: { // ResponseStream Union: only one key present
 * //     chunk: { // PayloadPart
 * //       bytes: new Uint8Array(),
 * //     },
 * //     internalServerException: { // InternalServerException
 * //       message: "STRING_VALUE",
 * //     },
 * //     modelStreamErrorException: { // ModelStreamErrorException
 * //       message: "STRING_VALUE",
 * //       originalStatusCode: Number("int"),
 * //       originalMessage: "STRING_VALUE",
 * //     },
 * //     validationException: { // ValidationException
 * //       message: "STRING_VALUE",
 * //     },
 * //     throttlingException: { // ThrottlingException
 * //       message: "STRING_VALUE",
 * //     },
 * //     modelTimeoutException: { // ModelTimeoutException
 * //       message: "STRING_VALUE",
 * //     },
 * //     serviceUnavailableException: { // ServiceUnavailableException
 * //       message: "STRING_VALUE",
 * //     },
 * //   },
 * //   contentType: "STRING_VALUE", // required
 * //   performanceConfigLatency: "standard" || "optimized",
 * //   serviceTier: "priority" || "default" || "flex" || "reserved",
 * // };
 *
 * ```
 *
 * @param InvokeModelWithResponseStreamCommandInput - {@link InvokeModelWithResponseStreamCommandInput}
 * @returns {@link InvokeModelWithResponseStreamCommandOutput}
 * @see {@link InvokeModelWithResponseStreamCommandInput} for command's `input` shape.
 * @see {@link InvokeModelWithResponseStreamCommandOutput} for command's `response` shape.
 * @see {@link BedrockRuntimeClientResolvedConfig | config} for BedrockRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because you do not have sufficient permissions to perform the requested action. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-access-denied">AccessDeniedException</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An internal server error occurred. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-internal-failure">InternalFailure</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ModelErrorException} (client fault)
 *  <p>The request failed due to an error while processing the model.</p>
 *
 * @throws {@link ModelNotReadyException} (client fault)
 *  <p>The model specified in the request is not ready to serve inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide.</p>
 *
 * @throws {@link ModelStreamErrorException} (client fault)
 *  <p>An error occurred while streaming the response. Retry your request.</p>
 *
 * @throws {@link ModelTimeoutException} (client fault)
 *  <p>The request took too long to process. Processing time exceeded the model timeout length.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The specified resource ARN was not found. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-resource-not-found">ResourceNotFound</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ServiceQuotaExceededException} (client fault)
 *  <p>Your request exceeds the service quota for your account. You can view your quotas at <a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html">Viewing service quotas</a>. You can resubmit your request later.</p>
 *
 * @throws {@link ServiceUnavailableException} (server fault)
 *  <p>The service isn't currently available. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-service-unavailable">ServiceUnavailable</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>Your request was denied due to exceeding the account quotas for <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-throttling-exception">ThrottlingException</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints specified by <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-validation-error">ValidationError</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link BedrockRuntimeServiceException}
 * <p>Base exception class for all service exceptions from BedrockRuntime service.</p>
 *
 *
 * @public
 */
export declare class InvokeModelWithResponseStreamCommand extends InvokeModelWithResponseStreamCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: InvokeModelWithResponseStreamRequest;
            output: InvokeModelWithResponseStreamResponse;
        };
        sdk: {
            input: InvokeModelWithResponseStreamCommandInput;
            output: InvokeModelWithResponseStreamCommandOutput;
        };
    };
}
