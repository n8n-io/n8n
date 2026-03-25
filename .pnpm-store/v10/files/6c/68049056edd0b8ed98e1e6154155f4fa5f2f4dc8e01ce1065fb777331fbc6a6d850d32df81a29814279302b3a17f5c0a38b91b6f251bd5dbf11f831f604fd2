import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEdgeDeploymentPlanRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEdgeDeploymentPlanCommand}.
 */
export interface DeleteEdgeDeploymentPlanCommandInput extends DeleteEdgeDeploymentPlanRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteEdgeDeploymentPlanCommand}.
 */
export interface DeleteEdgeDeploymentPlanCommandOutput extends __MetadataBearer {
}
declare const DeleteEdgeDeploymentPlanCommand_base: {
    new (input: DeleteEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEdgeDeploymentPlanCommandInput, DeleteEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEdgeDeploymentPlanCommandInput, DeleteEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an edge deployment plan if (and only if) all the stages in the plan are inactive or there are no stages in the plan.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteEdgeDeploymentPlanCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteEdgeDeploymentPlanCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteEdgeDeploymentPlanRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 * };
 * const command = new DeleteEdgeDeploymentPlanCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEdgeDeploymentPlanCommandInput - {@link DeleteEdgeDeploymentPlanCommandInput}
 * @returns {@link DeleteEdgeDeploymentPlanCommandOutput}
 * @see {@link DeleteEdgeDeploymentPlanCommandInput} for command's `input` shape.
 * @see {@link DeleteEdgeDeploymentPlanCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteEdgeDeploymentPlanCommand extends DeleteEdgeDeploymentPlanCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEdgeDeploymentPlanRequest;
            output: {};
        };
        sdk: {
            input: DeleteEdgeDeploymentPlanCommandInput;
            output: DeleteEdgeDeploymentPlanCommandOutput;
        };
    };
}
