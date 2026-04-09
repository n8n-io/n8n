import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopProcessingJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopProcessingJobCommand}.
 */
export interface StopProcessingJobCommandInput extends StopProcessingJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopProcessingJobCommand}.
 */
export interface StopProcessingJobCommandOutput extends __MetadataBearer {
}
declare const StopProcessingJobCommand_base: {
    new (input: StopProcessingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopProcessingJobCommandInput, StopProcessingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopProcessingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopProcessingJobCommandInput, StopProcessingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a processing job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopProcessingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopProcessingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopProcessingJobRequest
 *   ProcessingJobName: "STRING_VALUE", // required
 * };
 * const command = new StopProcessingJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopProcessingJobCommandInput - {@link StopProcessingJobCommandInput}
 * @returns {@link StopProcessingJobCommandOutput}
 * @see {@link StopProcessingJobCommandInput} for command's `input` shape.
 * @see {@link StopProcessingJobCommandOutput} for command's `response` shape.
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
export declare class StopProcessingJobCommand extends StopProcessingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopProcessingJobRequest;
            output: {};
        };
        sdk: {
            input: StopProcessingJobCommandInput;
            output: StopProcessingJobCommandOutput;
        };
    };
}
