import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopEdgeDeploymentStageRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopEdgeDeploymentStageCommand}.
 */
export interface StopEdgeDeploymentStageCommandInput extends StopEdgeDeploymentStageRequest {
}
/**
 * @public
 *
 * The output of {@link StopEdgeDeploymentStageCommand}.
 */
export interface StopEdgeDeploymentStageCommandOutput extends __MetadataBearer {
}
declare const StopEdgeDeploymentStageCommand_base: {
    new (input: StopEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<StopEdgeDeploymentStageCommandInput, StopEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<StopEdgeDeploymentStageCommandInput, StopEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a stage in an edge deployment plan.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopEdgeDeploymentStageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopEdgeDeploymentStageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopEdgeDeploymentStageRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   StageName: "STRING_VALUE", // required
 * };
 * const command = new StopEdgeDeploymentStageCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopEdgeDeploymentStageCommandInput - {@link StopEdgeDeploymentStageCommandInput}
 * @returns {@link StopEdgeDeploymentStageCommandOutput}
 * @see {@link StopEdgeDeploymentStageCommandInput} for command's `input` shape.
 * @see {@link StopEdgeDeploymentStageCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StopEdgeDeploymentStageCommand extends StopEdgeDeploymentStageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopEdgeDeploymentStageRequest;
            output: {};
        };
        sdk: {
            input: StopEdgeDeploymentStageCommandInput;
            output: StopEdgeDeploymentStageCommandOutput;
        };
    };
}
