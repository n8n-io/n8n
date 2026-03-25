import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateClusterSoftwareRequest, UpdateClusterSoftwareResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateClusterSoftwareCommand}.
 */
export interface UpdateClusterSoftwareCommandInput extends UpdateClusterSoftwareRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateClusterSoftwareCommand}.
 */
export interface UpdateClusterSoftwareCommandOutput extends UpdateClusterSoftwareResponse, __MetadataBearer {
}
declare const UpdateClusterSoftwareCommand_base: {
    new (input: UpdateClusterSoftwareCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateClusterSoftwareCommandInput, UpdateClusterSoftwareCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateClusterSoftwareCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateClusterSoftwareCommandInput, UpdateClusterSoftwareCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the platform software of a SageMaker HyperPod cluster for security patching. To learn how to use this API, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-operate.html#sagemaker-hyperpod-operate-cli-command-update-cluster-software">Update the SageMaker HyperPod platform software of a cluster</a>.</p> <important> <p>The <code>UpgradeClusterSoftware</code> API call may impact your SageMaker HyperPod cluster uptime and availability. Plan accordingly to mitigate potential disruptions to your workloads.</p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateClusterSoftwareCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateClusterSoftwareCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateClusterSoftwareRequest
 *   ClusterName: "STRING_VALUE", // required
 *   InstanceGroups: [ // UpdateClusterSoftwareInstanceGroups
 *     { // UpdateClusterSoftwareInstanceGroupSpecification
 *       InstanceGroupName: "STRING_VALUE", // required
 *     },
 *   ],
 *   DeploymentConfig: { // DeploymentConfiguration
 *     RollingUpdatePolicy: { // RollingDeploymentPolicy
 *       MaximumBatchSize: { // CapacitySizeConfig
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENTAGE", // required
 *         Value: Number("int"), // required
 *       },
 *       RollbackMaximumBatchSize: {
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENTAGE", // required
 *         Value: Number("int"), // required
 *       },
 *     },
 *     WaitIntervalInSeconds: Number("int"),
 *     AutoRollbackConfiguration: [ // AutoRollbackAlarms
 *       { // AlarmDetails
 *         AlarmName: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 * };
 * const command = new UpdateClusterSoftwareCommand(input);
 * const response = await client.send(command);
 * // { // UpdateClusterSoftwareResponse
 * //   ClusterArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateClusterSoftwareCommandInput - {@link UpdateClusterSoftwareCommandInput}
 * @returns {@link UpdateClusterSoftwareCommandOutput}
 * @see {@link UpdateClusterSoftwareCommandInput} for command's `input` shape.
 * @see {@link UpdateClusterSoftwareCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class UpdateClusterSoftwareCommand extends UpdateClusterSoftwareCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateClusterSoftwareRequest;
            output: UpdateClusterSoftwareResponse;
        };
        sdk: {
            input: UpdateClusterSoftwareCommandInput;
            output: UpdateClusterSoftwareCommandOutput;
        };
    };
}
