import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BatchReplaceClusterNodesRequest, BatchReplaceClusterNodesResponse } from "../models/models_0";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchReplaceClusterNodesCommand}.
 */
export interface BatchReplaceClusterNodesCommandInput extends BatchReplaceClusterNodesRequest {
}
/**
 * @public
 *
 * The output of {@link BatchReplaceClusterNodesCommand}.
 */
export interface BatchReplaceClusterNodesCommandOutput extends BatchReplaceClusterNodesResponse, __MetadataBearer {
}
declare const BatchReplaceClusterNodesCommand_base: {
    new (input: BatchReplaceClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchReplaceClusterNodesCommandInput, BatchReplaceClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: BatchReplaceClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchReplaceClusterNodesCommandInput, BatchReplaceClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Replaces specific nodes within a SageMaker HyperPod cluster with new hardware. <code>BatchReplaceClusterNodes</code> terminates the specified instances and provisions new replacement instances with the same configuration but fresh hardware. The Amazon Machine Image (AMI) and instance configuration remain the same.</p> <p>This operation is useful for recovering from hardware failures or persistent issues that cannot be resolved through a reboot.</p> <important> <ul> <li> <p> <b>Data Loss Warning:</b> Replacing nodes destroys all instance volumes, including both root and secondary volumes. All data stored on these volumes will be permanently lost and cannot be recovered.</p> </li> <li> <p>To safeguard your work, back up your data to Amazon S3 or an FSx for Lustre file system before invoking the API on a worker node group. This will help prevent any potential data loss from the instance root volume. For more information about backup, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-operate-cli-command.html#sagemaker-hyperpod-operate-cli-command-update-cluster-software-backup">Use the backup script provided by SageMaker HyperPod</a>.</p> </li> <li> <p>If you want to invoke this API on an existing cluster, you'll first need to patch the cluster by running the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateClusterSoftware.html">UpdateClusterSoftware API</a>. For more information about patching a cluster, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-operate-cli-command.html#sagemaker-hyperpod-operate-cli-command-update-cluster-software">Update the SageMaker HyperPod platform software of a cluster</a>.</p> </li> <li> <p>You can replace up to 25 nodes in a single request.</p> </li> </ul> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, BatchReplaceClusterNodesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, BatchReplaceClusterNodesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // BatchReplaceClusterNodesRequest
 *   ClusterName: "STRING_VALUE", // required
 *   NodeIds: [ // ClusterNodeIds
 *     "STRING_VALUE",
 *   ],
 *   NodeLogicalIds: [ // ClusterNodeLogicalIdList
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new BatchReplaceClusterNodesCommand(input);
 * const response = await client.send(command);
 * // { // BatchReplaceClusterNodesResponse
 * //   Successful: [ // ClusterNodeIds
 * //     "STRING_VALUE",
 * //   ],
 * //   Failed: [ // BatchReplaceClusterNodesErrors
 * //     { // BatchReplaceClusterNodesError
 * //       NodeId: "STRING_VALUE", // required
 * //       ErrorCode: "InstanceIdNotFound" || "InvalidInstanceStatus" || "InstanceIdInUse" || "InternalServerError", // required
 * //       Message: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   FailedNodeLogicalIds: [ // BatchReplaceClusterNodeLogicalIdsErrors
 * //     { // BatchReplaceClusterNodeLogicalIdsError
 * //       NodeLogicalId: "STRING_VALUE", // required
 * //       ErrorCode: "InstanceIdNotFound" || "InvalidInstanceStatus" || "InstanceIdInUse" || "InternalServerError", // required
 * //       Message: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   SuccessfulNodeLogicalIds: [ // ClusterNodeLogicalIdList
 * //     "STRING_VALUE",
 * //   ],
 * // };
 *
 * ```
 *
 * @param BatchReplaceClusterNodesCommandInput - {@link BatchReplaceClusterNodesCommandInput}
 * @returns {@link BatchReplaceClusterNodesCommandOutput}
 * @see {@link BatchReplaceClusterNodesCommandInput} for command's `input` shape.
 * @see {@link BatchReplaceClusterNodesCommandOutput} for command's `response` shape.
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
export declare class BatchReplaceClusterNodesCommand extends BatchReplaceClusterNodesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchReplaceClusterNodesRequest;
            output: BatchReplaceClusterNodesResponse;
        };
        sdk: {
            input: BatchReplaceClusterNodesCommandInput;
            output: BatchReplaceClusterNodesCommandOutput;
        };
    };
}
