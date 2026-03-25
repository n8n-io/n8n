import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEdgeDeploymentStageRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEdgeDeploymentStageCommand}.
 */
export interface DeleteEdgeDeploymentStageCommandInput extends DeleteEdgeDeploymentStageRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteEdgeDeploymentStageCommand}.
 */
export interface DeleteEdgeDeploymentStageCommandOutput extends __MetadataBearer {
}
declare const DeleteEdgeDeploymentStageCommand_base: {
    new (input: DeleteEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEdgeDeploymentStageCommandInput, DeleteEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEdgeDeploymentStageCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEdgeDeploymentStageCommandInput, DeleteEdgeDeploymentStageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete a stage in an edge deployment plan if (and only if) the stage is inactive.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteEdgeDeploymentStageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteEdgeDeploymentStageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteEdgeDeploymentStageRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   StageName: "STRING_VALUE", // required
 * };
 * const command = new DeleteEdgeDeploymentStageCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEdgeDeploymentStageCommandInput - {@link DeleteEdgeDeploymentStageCommandInput}
 * @returns {@link DeleteEdgeDeploymentStageCommandOutput}
 * @see {@link DeleteEdgeDeploymentStageCommandInput} for command's `input` shape.
 * @see {@link DeleteEdgeDeploymentStageCommandOutput} for command's `response` shape.
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
export declare class DeleteEdgeDeploymentStageCommand extends DeleteEdgeDeploymentStageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEdgeDeploymentStageRequest;
            output: {};
        };
        sdk: {
            input: DeleteEdgeDeploymentStageCommandInput;
            output: DeleteEdgeDeploymentStageCommandOutput;
        };
    };
}
