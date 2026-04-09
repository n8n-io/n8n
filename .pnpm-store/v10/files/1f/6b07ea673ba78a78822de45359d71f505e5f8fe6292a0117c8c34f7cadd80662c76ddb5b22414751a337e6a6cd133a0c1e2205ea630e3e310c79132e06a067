import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopEdgePackagingJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopEdgePackagingJobCommand}.
 */
export interface StopEdgePackagingJobCommandInput extends StopEdgePackagingJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopEdgePackagingJobCommand}.
 */
export interface StopEdgePackagingJobCommandOutput extends __MetadataBearer {
}
declare const StopEdgePackagingJobCommand_base: {
    new (input: StopEdgePackagingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopEdgePackagingJobCommandInput, StopEdgePackagingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopEdgePackagingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopEdgePackagingJobCommandInput, StopEdgePackagingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Request to stop an edge packaging job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopEdgePackagingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopEdgePackagingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopEdgePackagingJobRequest
 *   EdgePackagingJobName: "STRING_VALUE", // required
 * };
 * const command = new StopEdgePackagingJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopEdgePackagingJobCommandInput - {@link StopEdgePackagingJobCommandInput}
 * @returns {@link StopEdgePackagingJobCommandOutput}
 * @see {@link StopEdgePackagingJobCommandInput} for command's `input` shape.
 * @see {@link StopEdgePackagingJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StopEdgePackagingJobCommand extends StopEdgePackagingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopEdgePackagingJobRequest;
            output: {};
        };
        sdk: {
            input: StopEdgePackagingJobCommandInput;
            output: StopEdgePackagingJobCommandOutput;
        };
    };
}
