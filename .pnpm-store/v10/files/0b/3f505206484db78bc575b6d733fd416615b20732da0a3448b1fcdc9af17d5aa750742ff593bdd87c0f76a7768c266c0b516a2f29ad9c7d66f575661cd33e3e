import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockRuntimeClient";
import type { GetAsyncInvokeRequest, GetAsyncInvokeResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetAsyncInvokeCommand}.
 */
export interface GetAsyncInvokeCommandInput extends GetAsyncInvokeRequest {
}
/**
 * @public
 *
 * The output of {@link GetAsyncInvokeCommand}.
 */
export interface GetAsyncInvokeCommandOutput extends GetAsyncInvokeResponse, __MetadataBearer {
}
declare const GetAsyncInvokeCommand_base: {
    new (input: GetAsyncInvokeCommandInput): import("@smithy/smithy-client").CommandImpl<GetAsyncInvokeCommandInput, GetAsyncInvokeCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetAsyncInvokeCommandInput): import("@smithy/smithy-client").CommandImpl<GetAsyncInvokeCommandInput, GetAsyncInvokeCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve information about an asynchronous invocation.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockRuntimeClient, GetAsyncInvokeCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import
 * // const { BedrockRuntimeClient, GetAsyncInvokeCommand } = require("@aws-sdk/client-bedrock-runtime"); // CommonJS import
 * // import type { BedrockRuntimeClientConfig } from "@aws-sdk/client-bedrock-runtime";
 * const config = {}; // type is BedrockRuntimeClientConfig
 * const client = new BedrockRuntimeClient(config);
 * const input = { // GetAsyncInvokeRequest
 *   invocationArn: "STRING_VALUE", // required
 * };
 * const command = new GetAsyncInvokeCommand(input);
 * const response = await client.send(command);
 * // { // GetAsyncInvokeResponse
 * //   invocationArn: "STRING_VALUE", // required
 * //   modelArn: "STRING_VALUE", // required
 * //   clientRequestToken: "STRING_VALUE",
 * //   status: "InProgress" || "Completed" || "Failed", // required
 * //   failureMessage: "STRING_VALUE",
 * //   submitTime: new Date("TIMESTAMP"), // required
 * //   lastModifiedTime: new Date("TIMESTAMP"),
 * //   endTime: new Date("TIMESTAMP"),
 * //   outputDataConfig: { // AsyncInvokeOutputDataConfig Union: only one key present
 * //     s3OutputDataConfig: { // AsyncInvokeS3OutputDataConfig
 * //       s3Uri: "STRING_VALUE", // required
 * //       kmsKeyId: "STRING_VALUE",
 * //       bucketOwner: "STRING_VALUE",
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetAsyncInvokeCommandInput - {@link GetAsyncInvokeCommandInput}
 * @returns {@link GetAsyncInvokeCommandOutput}
 * @see {@link GetAsyncInvokeCommandInput} for command's `input` shape.
 * @see {@link GetAsyncInvokeCommandOutput} for command's `response` shape.
 * @see {@link BedrockRuntimeClientResolvedConfig | config} for BedrockRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because you do not have sufficient permissions to perform the requested action. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-access-denied">AccessDeniedException</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An internal server error occurred. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-internal-failure">InternalFailure</a> in the Amazon Bedrock User Guide</p>
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
export declare class GetAsyncInvokeCommand extends GetAsyncInvokeCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetAsyncInvokeRequest;
            output: GetAsyncInvokeResponse;
        };
        sdk: {
            input: GetAsyncInvokeCommandInput;
            output: GetAsyncInvokeCommandOutput;
        };
    };
}
