import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeClusterRequest, DescribeClusterResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeClusterCommand}.
 */
export interface DescribeClusterCommandInput extends DescribeClusterRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeClusterCommand}.
 */
export interface DescribeClusterCommandOutput extends DescribeClusterResponse, __MetadataBearer {
}
declare const DescribeClusterCommand_base: {
    new (input: DescribeClusterCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeClusterCommandInput, DescribeClusterCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeClusterCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeClusterCommandInput, DescribeClusterCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves information of a SageMaker HyperPod cluster.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeClusterCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeClusterCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeClusterRequest
 *   ClusterName: "STRING_VALUE", // required
 * };
 * const command = new DescribeClusterCommand(input);
 * const response = await client.send(command);
 * // { // DescribeClusterResponse
 * //   ClusterArn: "STRING_VALUE", // required
 * //   ClusterName: "STRING_VALUE",
 * //   ClusterStatus: "Creating" || "Deleting" || "Failed" || "InService" || "RollingBack" || "SystemUpdating" || "Updating", // required
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   FailureMessage: "STRING_VALUE",
 * //   InstanceGroups: [ // ClusterInstanceGroupDetailsList // required
 * //     { // ClusterInstanceGroupDetails
 * //       CurrentCount: Number("int"),
 * //       TargetCount: Number("int"),
 * //       InstanceGroupName: "STRING_VALUE",
 * //       InstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.c5n.large" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.gr6.4xlarge" || "ml.gr6.8xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.trn2.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.i3en.large" || "ml.i3en.xlarge" || "ml.i3en.2xlarge" || "ml.i3en.3xlarge" || "ml.i3en.6xlarge" || "ml.i3en.12xlarge" || "ml.i3en.24xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //       LifeCycleConfig: { // ClusterLifeCycleConfig
 * //         SourceS3Uri: "STRING_VALUE", // required
 * //         OnCreate: "STRING_VALUE", // required
 * //       },
 * //       ExecutionRole: "STRING_VALUE",
 * //       ThreadsPerCore: Number("int"),
 * //       InstanceStorageConfigs: [ // ClusterInstanceStorageConfigs
 * //         { // ClusterInstanceStorageConfig Union: only one key present
 * //           EbsVolumeConfig: { // ClusterEbsVolumeConfig
 * //             VolumeSizeInGB: Number("int"), // required
 * //           },
 * //         },
 * //       ],
 * //       OnStartDeepHealthChecks: [ // OnStartDeepHealthChecks
 * //         "InstanceStress" || "InstanceConnectivity",
 * //       ],
 * //       Status: "InService" || "Creating" || "Updating" || "Failed" || "Degraded" || "SystemUpdating" || "Deleting",
 * //       TrainingPlanArn: "STRING_VALUE",
 * //       TrainingPlanStatus: "STRING_VALUE",
 * //       OverrideVpcConfig: { // VpcConfig
 * //         SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //           "STRING_VALUE",
 * //         ],
 * //         Subnets: [ // Subnets // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       ScheduledUpdateConfig: { // ScheduledUpdateConfig
 * //         ScheduleExpression: "STRING_VALUE", // required
 * //         DeploymentConfig: { // DeploymentConfiguration
 * //           RollingUpdatePolicy: { // RollingDeploymentPolicy
 * //             MaximumBatchSize: { // CapacitySizeConfig
 * //               Type: "INSTANCE_COUNT" || "CAPACITY_PERCENTAGE", // required
 * //               Value: Number("int"), // required
 * //             },
 * //             RollbackMaximumBatchSize: {
 * //               Type: "INSTANCE_COUNT" || "CAPACITY_PERCENTAGE", // required
 * //               Value: Number("int"), // required
 * //             },
 * //           },
 * //           WaitIntervalInSeconds: Number("int"),
 * //           AutoRollbackConfiguration: [ // AutoRollbackAlarms
 * //             { // AlarmDetails
 * //               AlarmName: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   VpcConfig: {
 * //     SecurityGroupIds: [ // required
 * //       "STRING_VALUE",
 * //     ],
 * //     Subnets: [ // required
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * //   Orchestrator: { // ClusterOrchestrator
 * //     Eks: { // ClusterOrchestratorEksConfig
 * //       ClusterArn: "STRING_VALUE", // required
 * //     },
 * //   },
 * //   NodeRecovery: "Automatic" || "None",
 * // };
 *
 * ```
 *
 * @param DescribeClusterCommandInput - {@link DescribeClusterCommandInput}
 * @returns {@link DescribeClusterCommandOutput}
 * @see {@link DescribeClusterCommandInput} for command's `input` shape.
 * @see {@link DescribeClusterCommandOutput} for command's `response` shape.
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
export declare class DescribeClusterCommand extends DescribeClusterCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeClusterRequest;
            output: DescribeClusterResponse;
        };
        sdk: {
            input: DescribeClusterCommandInput;
            output: DescribeClusterCommandOutput;
        };
    };
}
