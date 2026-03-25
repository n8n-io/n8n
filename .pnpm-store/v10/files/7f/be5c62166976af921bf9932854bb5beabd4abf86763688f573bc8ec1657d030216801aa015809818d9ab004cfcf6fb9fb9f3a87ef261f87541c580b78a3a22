import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StopTransformJobRequest } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopTransformJobCommand}.
 */
export interface StopTransformJobCommandInput extends StopTransformJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopTransformJobCommand}.
 */
export interface StopTransformJobCommandOutput extends __MetadataBearer {
}
declare const StopTransformJobCommand_base: {
    new (input: StopTransformJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopTransformJobCommandInput, StopTransformJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopTransformJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopTransformJobCommandInput, StopTransformJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a batch transform job.</p> <p>When Amazon SageMaker receives a <code>StopTransformJob</code> request, the status of the job changes to <code>Stopping</code>. After Amazon SageMaker stops the job, the status is set to <code>Stopped</code>. When you stop a batch transform job before it is completed, Amazon SageMaker doesn't store the job's output in Amazon S3.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopTransformJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopTransformJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // StopTransformJobRequest
 *   TransformJobName: "STRING_VALUE", // required
 * };
 * const command = new StopTransformJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopTransformJobCommandInput - {@link StopTransformJobCommandInput}
 * @returns {@link StopTransformJobCommandOutput}
 * @see {@link StopTransformJobCommandInput} for command's `input` shape.
 * @see {@link StopTransformJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StopTransformJobCommand extends StopTransformJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopTransformJobRequest;
            output: {};
        };
        sdk: {
            input: StopTransformJobCommandInput;
            output: StopTransformJobCommandOutput;
        };
    };
}
