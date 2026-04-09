import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeClusterEventRequest, DescribeClusterEventResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeClusterEventCommand}.
 */
export interface DescribeClusterEventCommandInput extends DescribeClusterEventRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeClusterEventCommand}.
 */
export interface DescribeClusterEventCommandOutput extends DescribeClusterEventResponse, __MetadataBearer {
}
declare const DescribeClusterEventCommand_base: {
    new (input: DescribeClusterEventCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeClusterEventCommandInput, DescribeClusterEventCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeClusterEventCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeClusterEventCommandInput, DescribeClusterEventCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves detailed information about a specific event for a given HyperPod cluster. This functionality is only supported when the <code>NodeProvisioningMode</code> is set to <code>Continuous</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeClusterEventCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeClusterEventCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeClusterEventRequest
 *   EventId: "STRING_VALUE", // required
 *   ClusterName: "STRING_VALUE", // required
 * };
 * const command = new DescribeClusterEventCommand(input);
 * const response = await client.send(command);
 * // { // DescribeClusterEventResponse
 * //   EventDetails: { // ClusterEventDetail
 * //     EventId: "STRING_VALUE", // required
 * //     ClusterArn: "STRING_VALUE", // required
 * //     ClusterName: "STRING_VALUE", // required
 * //     InstanceGroupName: "STRING_VALUE",
 * //     InstanceId: "STRING_VALUE",
 * //     ResourceType: "Cluster" || "InstanceGroup" || "Instance", // required
 * //     EventTime: new Date("TIMESTAMP"), // required
 * //     EventDetails: { // EventDetails
 * //       EventMetadata: { // EventMetadata Union: only one key present
 * //         Cluster: { // ClusterMetadata
 * //           FailureMessage: "STRING_VALUE",
 * //           EksRoleAccessEntries: [ // EksRoleAccessEntries
 * //             "STRING_VALUE",
 * //           ],
 * //           SlrAccessEntry: "STRING_VALUE",
 * //         },
 * //         InstanceGroup: { // InstanceGroupMetadata
 * //           FailureMessage: "STRING_VALUE",
 * //           AvailabilityZoneId: "STRING_VALUE",
 * //           CapacityReservation: { // CapacityReservation
 * //             Arn: "STRING_VALUE",
 * //             Type: "ODCR" || "CRG",
 * //           },
 * //           SubnetId: "STRING_VALUE",
 * //           SecurityGroupIds: [ // SecurityGroupIds
 * //             "STRING_VALUE",
 * //           ],
 * //           AmiOverride: "STRING_VALUE",
 * //         },
 * //         InstanceGroupScaling: { // InstanceGroupScalingMetadata
 * //           InstanceCount: Number("int"),
 * //           TargetCount: Number("int"),
 * //           MinCount: Number("int"),
 * //           FailureMessage: "STRING_VALUE",
 * //         },
 * //         Instance: { // InstanceMetadata
 * //           CustomerEni: "STRING_VALUE",
 * //           AdditionalEnis: { // AdditionalEnis
 * //             EfaEnis: [ // EfaEnis
 * //               "STRING_VALUE",
 * //             ],
 * //           },
 * //           CapacityReservation: {
 * //             Arn: "STRING_VALUE",
 * //             Type: "ODCR" || "CRG",
 * //           },
 * //           FailureMessage: "STRING_VALUE",
 * //           LcsExecutionState: "STRING_VALUE",
 * //           NodeLogicalId: "STRING_VALUE",
 * //         },
 * //       },
 * //     },
 * //     Description: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeClusterEventCommandInput - {@link DescribeClusterEventCommandInput}
 * @returns {@link DescribeClusterEventCommandOutput}
 * @see {@link DescribeClusterEventCommandInput} for command's `input` shape.
 * @see {@link DescribeClusterEventCommandOutput} for command's `response` shape.
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
export declare class DescribeClusterEventCommand extends DescribeClusterEventCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeClusterEventRequest;
            output: DescribeClusterEventResponse;
        };
        sdk: {
            input: DescribeClusterEventCommandInput;
            output: DescribeClusterEventCommandOutput;
        };
    };
}
