import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopAutoMLJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopAutoMLJobCommand}.
 */
export interface StopAutoMLJobCommandInput extends StopAutoMLJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopAutoMLJobCommand}.
 */
export interface StopAutoMLJobCommandOutput extends __MetadataBearer {
}
declare const StopAutoMLJobCommand_base: {
    new (input: StopAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopAutoMLJobCommandInput, StopAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopAutoMLJobCommandInput, StopAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>A method for forcing a running job to shut down.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopAutoMLJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopAutoMLJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopAutoMLJobRequest
 *   AutoMLJobName: "STRING_VALUE", // required
 * };
 * const command = new StopAutoMLJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopAutoMLJobCommandInput - {@link StopAutoMLJobCommandInput}
 * @returns {@link StopAutoMLJobCommandOutput}
 * @see {@link StopAutoMLJobCommandInput} for command's `input` shape.
 * @see {@link StopAutoMLJobCommandOutput} for command's `response` shape.
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
export declare class StopAutoMLJobCommand extends StopAutoMLJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopAutoMLJobRequest;
            output: {};
        };
        sdk: {
            input: StopAutoMLJobCommandInput;
            output: StopAutoMLJobCommandOutput;
        };
    };
}
