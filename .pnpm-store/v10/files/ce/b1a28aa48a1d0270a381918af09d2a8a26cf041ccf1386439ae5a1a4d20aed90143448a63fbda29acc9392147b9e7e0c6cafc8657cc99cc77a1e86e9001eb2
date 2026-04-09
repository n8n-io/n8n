import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BatchRebootClusterNodesRequest, BatchRebootClusterNodesResponse } from "../models/models_0";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchRebootClusterNodesCommand}.
 */
export interface BatchRebootClusterNodesCommandInput extends BatchRebootClusterNodesRequest {
}
/**
 * @public
 *
 * The output of {@link BatchRebootClusterNodesCommand}.
 */
export interface BatchRebootClusterNodesCommandOutput extends BatchRebootClusterNodesResponse, __MetadataBearer {
}
declare const BatchRebootClusterNodesCommand_base: {
    new (input: BatchRebootClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchRebootClusterNodesCommandInput, BatchRebootClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: BatchRebootClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchRebootClusterNodesCommandInput, BatchRebootClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Reboots specific nodes within a SageMaker HyperPod cluster using a soft recovery mechanism. <code>BatchRebootClusterNodes</code> performs a graceful reboot of the specified nodes by calling the Amazon Elastic Compute Cloud <code>RebootInstances</code> API, which attempts to cleanly shut down the operating system before restarting the instance.</p> <p>This operation is useful for recovering from transient issues or applying certain configuration changes that require a restart.</p> <note> <ul> <li> <p>Rebooting a node may cause temporary service interruption for workloads running on that node. Ensure your workloads can handle node restarts or use appropriate scheduling to minimize impact.</p> </li> <li> <p>You can reboot up to 25 nodes in a single request.</p> </li> <li> <p>For SageMaker HyperPod clusters using the Slurm workload manager, ensure rebooting nodes will not disrupt critical cluster operations.</p> </li> </ul> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, BatchRebootClusterNodesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, BatchRebootClusterNodesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // BatchRebootClusterNodesRequest
 *   ClusterName: "STRING_VALUE", // required
 *   NodeIds: [ // ClusterNodeIds
 *     "STRING_VALUE",
 *   ],
 *   NodeLogicalIds: [ // ClusterNodeLogicalIdList
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new BatchRebootClusterNodesCommand(input);
 * const response = await client.send(command);
 * // { // BatchRebootClusterNodesResponse
 * //   Successful: [ // ClusterNodeIds
 * //     "STRING_VALUE",
 * //   ],
 * //   Failed: [ // BatchRebootClusterNodesErrors
 * //     { // BatchRebootClusterNodesError
 * //       NodeId: "STRING_VALUE", // required
 * //       ErrorCode: "InstanceIdNotFound" || "InvalidInstanceStatus" || "InstanceIdInUse" || "InternalServerError", // required
 * //       Message: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   FailedNodeLogicalIds: [ // BatchRebootClusterNodeLogicalIdsErrors
 * //     { // BatchRebootClusterNodeLogicalIdsError
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
 * @param BatchRebootClusterNodesCommandInput - {@link BatchRebootClusterNodesCommandInput}
 * @returns {@link BatchRebootClusterNodesCommandOutput}
 * @see {@link BatchRebootClusterNodesCommandInput} for command's `input` shape.
 * @see {@link BatchRebootClusterNodesCommandOutput} for command's `response` shape.
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
export declare class BatchRebootClusterNodesCommand extends BatchRebootClusterNodesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchRebootClusterNodesRequest;
            output: BatchRebootClusterNodesResponse;
        };
        sdk: {
            input: BatchRebootClusterNodesCommandInput;
            output: BatchRebootClusterNodesCommandOutput;
        };
    };
}
