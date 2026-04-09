import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopLabelingJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopLabelingJobCommand}.
 */
export interface StopLabelingJobCommandInput extends StopLabelingJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopLabelingJobCommand}.
 */
export interface StopLabelingJobCommandOutput extends __MetadataBearer {
}
declare const StopLabelingJobCommand_base: {
    new (input: StopLabelingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopLabelingJobCommandInput, StopLabelingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopLabelingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopLabelingJobCommandInput, StopLabelingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a running labeling job. A job that is stopped cannot be restarted. Any results obtained before the job is stopped are placed in the Amazon S3 output bucket.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopLabelingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopLabelingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopLabelingJobRequest
 *   LabelingJobName: "STRING_VALUE", // required
 * };
 * const command = new StopLabelingJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopLabelingJobCommandInput - {@link StopLabelingJobCommandInput}
 * @returns {@link StopLabelingJobCommandOutput}
 * @see {@link StopLabelingJobCommandInput} for command's `input` shape.
 * @see {@link StopLabelingJobCommandOutput} for command's `response` shape.
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
export declare class StopLabelingJobCommand extends StopLabelingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopLabelingJobRequest;
            output: {};
        };
        sdk: {
            input: StopLabelingJobCommandInput;
            output: StopLabelingJobCommandOutput;
        };
    };
}
