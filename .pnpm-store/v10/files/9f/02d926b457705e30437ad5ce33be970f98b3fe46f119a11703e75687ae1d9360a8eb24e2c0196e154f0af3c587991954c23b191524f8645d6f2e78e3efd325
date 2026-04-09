import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BatchAddClusterNodesRequest, BatchAddClusterNodesResponse } from "../models/models_0";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchAddClusterNodesCommand}.
 */
export interface BatchAddClusterNodesCommandInput extends BatchAddClusterNodesRequest {
}
/**
 * @public
 *
 * The output of {@link BatchAddClusterNodesCommand}.
 */
export interface BatchAddClusterNodesCommandOutput extends BatchAddClusterNodesResponse, __MetadataBearer {
}
declare const BatchAddClusterNodesCommand_base: {
    new (input: BatchAddClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchAddClusterNodesCommandInput, BatchAddClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: BatchAddClusterNodesCommandInput): import("@smithy/smithy-client").CommandImpl<BatchAddClusterNodesCommandInput, BatchAddClusterNodesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Adds nodes to a HyperPod cluster by incrementing the target count for one or more instance groups. This operation returns a unique <code>NodeLogicalId</code> for each node being added, which can be used to track the provisioning status of the node. This API provides a safer alternative to <code>UpdateCluster</code> for scaling operations by avoiding unintended configuration changes.</p> <note> <p>This API is only supported for clusters using <code>Continuous</code> as the <code>NodeProvisioningMode</code>.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, BatchAddClusterNodesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, BatchAddClusterNodesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // BatchAddClusterNodesRequest
 *   ClusterName: "STRING_VALUE", // required
 *   ClientToken: "STRING_VALUE",
 *   NodesToAdd: [ // AddClusterNodeSpecificationList // required
 *     { // AddClusterNodeSpecification
 *       InstanceGroupName: "STRING_VALUE", // required
 *       IncrementTargetCountBy: Number("int"), // required
 *     },
 *   ],
 * };
 * const command = new BatchAddClusterNodesCommand(input);
 * const response = await client.send(command);
 * // { // BatchAddClusterNodesResponse
 * //   Successful: [ // NodeAdditionResultList // required
 * //     { // NodeAdditionResult
 * //       NodeLogicalId: "STRING_VALUE", // required
 * //       InstanceGroupName: "STRING_VALUE", // required
 * //       Status: "Running" || "Failure" || "Pending" || "ShuttingDown" || "SystemUpdating" || "DeepHealthCheckInProgress" || "NotFound", // required
 * //     },
 * //   ],
 * //   Failed: [ // BatchAddClusterNodesErrorList // required
 * //     { // BatchAddClusterNodesError
 * //       InstanceGroupName: "STRING_VALUE", // required
 * //       ErrorCode: "InstanceGroupNotFound" || "InvalidInstanceGroupStatus", // required
 * //       FailedCount: Number("int"), // required
 * //       Message: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param BatchAddClusterNodesCommandInput - {@link BatchAddClusterNodesCommandInput}
 * @returns {@link BatchAddClusterNodesCommandOutput}
 * @see {@link BatchAddClusterNodesCommandInput} for command's `input` shape.
 * @see {@link BatchAddClusterNodesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class BatchAddClusterNodesCommand extends BatchAddClusterNodesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchAddClusterNodesRequest;
            output: BatchAddClusterNodesResponse;
        };
        sdk: {
            input: BatchAddClusterNodesCommandInput;
            output: BatchAddClusterNodesCommandOutput;
        };
    };
}
