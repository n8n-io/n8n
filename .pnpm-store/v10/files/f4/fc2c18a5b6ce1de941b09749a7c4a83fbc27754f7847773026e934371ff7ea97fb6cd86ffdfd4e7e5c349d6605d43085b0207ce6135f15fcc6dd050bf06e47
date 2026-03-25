import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeInferenceComponentInput, DescribeInferenceComponentOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeInferenceComponentCommand}.
 */
export interface DescribeInferenceComponentCommandInput extends DescribeInferenceComponentInput {
}
/**
 * @public
 *
 * The output of {@link DescribeInferenceComponentCommand}.
 */
export interface DescribeInferenceComponentCommandOutput extends DescribeInferenceComponentOutput, __MetadataBearer {
}
declare const DescribeInferenceComponentCommand_base: {
    new (input: DescribeInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeInferenceComponentCommandInput, DescribeInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeInferenceComponentCommandInput, DescribeInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about an inference component.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeInferenceComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeInferenceComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeInferenceComponentInput
 *   InferenceComponentName: "STRING_VALUE", // required
 * };
 * const command = new DescribeInferenceComponentCommand(input);
 * const response = await client.send(command);
 * // { // DescribeInferenceComponentOutput
 * //   InferenceComponentName: "STRING_VALUE", // required
 * //   InferenceComponentArn: "STRING_VALUE", // required
 * //   EndpointName: "STRING_VALUE", // required
 * //   EndpointArn: "STRING_VALUE", // required
 * //   VariantName: "STRING_VALUE",
 * //   FailureReason: "STRING_VALUE",
 * //   Specification: { // InferenceComponentSpecificationSummary
 * //     ModelName: "STRING_VALUE",
 * //     Container: { // InferenceComponentContainerSpecificationSummary
 * //       DeployedImage: { // DeployedImage
 * //         SpecifiedImage: "STRING_VALUE",
 * //         ResolvedImage: "STRING_VALUE",
 * //         ResolutionTime: new Date("TIMESTAMP"),
 * //       },
 * //       ArtifactUrl: "STRING_VALUE",
 * //       Environment: { // EnvironmentMap
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //     StartupParameters: { // InferenceComponentStartupParameters
 * //       ModelDataDownloadTimeoutInSeconds: Number("int"),
 * //       ContainerStartupHealthCheckTimeoutInSeconds: Number("int"),
 * //     },
 * //     ComputeResourceRequirements: { // InferenceComponentComputeResourceRequirements
 * //       NumberOfCpuCoresRequired: Number("float"),
 * //       NumberOfAcceleratorDevicesRequired: Number("float"),
 * //       MinMemoryRequiredInMb: Number("int"), // required
 * //       MaxMemoryRequiredInMb: Number("int"),
 * //     },
 * //     BaseInferenceComponentName: "STRING_VALUE",
 * //   },
 * //   RuntimeConfig: { // InferenceComponentRuntimeConfigSummary
 * //     DesiredCopyCount: Number("int"),
 * //     CurrentCopyCount: Number("int"),
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   LastModifiedTime: new Date("TIMESTAMP"), // required
 * //   InferenceComponentStatus: "InService" || "Creating" || "Updating" || "Failed" || "Deleting",
 * //   LastDeploymentConfig: { // InferenceComponentDeploymentConfig
 * //     RollingUpdatePolicy: { // InferenceComponentRollingUpdatePolicy
 * //       MaximumBatchSize: { // InferenceComponentCapacitySize
 * //         Type: "COPY_COUNT" || "CAPACITY_PERCENT", // required
 * //         Value: Number("int"), // required
 * //       },
 * //       WaitIntervalInSeconds: Number("int"), // required
 * //       MaximumExecutionTimeoutInSeconds: Number("int"),
 * //       RollbackMaximumBatchSize: {
 * //         Type: "COPY_COUNT" || "CAPACITY_PERCENT", // required
 * //         Value: Number("int"), // required
 * //       },
 * //     },
 * //     AutoRollbackConfiguration: { // AutoRollbackConfig
 * //       Alarms: [ // AlarmList
 * //         { // Alarm
 * //           AlarmName: "STRING_VALUE",
 * //         },
 * //       ],
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeInferenceComponentCommandInput - {@link DescribeInferenceComponentCommandInput}
 * @returns {@link DescribeInferenceComponentCommandOutput}
 * @see {@link DescribeInferenceComponentCommandInput} for command's `input` shape.
 * @see {@link DescribeInferenceComponentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeInferenceComponentCommand extends DescribeInferenceComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeInferenceComponentInput;
            output: DescribeInferenceComponentOutput;
        };
        sdk: {
            input: DescribeInferenceComponentCommandInput;
            output: DescribeInferenceComponentCommandOutput;
        };
    };
}
