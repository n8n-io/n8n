import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartEdgeDeploymentStageRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartEdgeDeploymentStageCommand}.
 */
export interface StartEdgeDeploymentStageCommandInput extends StartEdgeDeploymentStageRequest {
}
/**
 * @public
 *
 * The output of {@link StartEdgeDeploymentStageCommand}.
 */
export interface StartEdgeDeploymentStageCommandOutput extends __MetadataBearer {
}
declare const StartEdgeDeploymentStageCommand_base: {
    new (input: StartEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<StartEdgeDeploymentStageCommandInput, StartEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<StartEdgeDeploymentStageCommandInput, StartEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts a stage in an edge deployment plan.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartEdgeDeploymentStageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartEdgeDeploymentStageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartEdgeDeploymentStageRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   StageName: "STRING_VALUE", // required
 * };
 * const command = new StartEdgeDeploymentStageCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StartEdgeDeploymentStageCommandInput - {@link StartEdgeDeploymentStageCommandInput}
 * @returns {@link StartEdgeDeploymentStageCommandOutput}
 * @see {@link StartEdgeDeploymentStageCommandInput} for command's `input` shape.
 * @see {@link StartEdgeDeploymentStageCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StartEdgeDeploymentStageCommand extends StartEdgeDeploymentStageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartEdgeDeploymentStageRequest;
            output: {};
        };
        sdk: {
            input: StartEdgeDeploymentStageCommandInput;
            output: StartEdgeDeploymentStageCommandOutput;
        };
    };
}
