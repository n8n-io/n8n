import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateInferenceComponentInput, UpdateInferenceComponentOutput } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateInferenceComponentCommand}.
 */
export interface UpdateInferenceComponentCommandInput extends UpdateInferenceComponentInput {
}
/**
 * @public
 *
 * The output of {@link UpdateInferenceComponentCommand}.
 */
export interface UpdateInferenceComponentCommandOutput extends UpdateInferenceComponentOutput, __MetadataBearer {
}
declare const UpdateInferenceComponentCommand_base: {
    new (input: UpdateInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateInferenceComponentCommandInput, UpdateInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateInferenceComponentCommandInput, UpdateInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an inference component.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateInferenceComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateInferenceComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateInferenceComponentInput
 *   InferenceComponentName: "STRING_VALUE", // required
 *   Specification: { // InferenceComponentSpecification
 *     ModelName: "STRING_VALUE",
 *     Container: { // InferenceComponentContainerSpecification
 *       Image: "STRING_VALUE",
 *       ArtifactUrl: "STRING_VALUE",
 *       Environment: { // EnvironmentMap
 *         "<keys>": "STRING_VALUE",
 *       },
 *     },
 *     StartupParameters: { // InferenceComponentStartupParameters
 *       ModelDataDownloadTimeoutInSeconds: Number("int"),
 *       ContainerStartupHealthCheckTimeoutInSeconds: Number("int"),
 *     },
 *     ComputeResourceRequirements: { // InferenceComponentComputeResourceRequirements
 *       NumberOfCpuCoresRequired: Number("float"),
 *       NumberOfAcceleratorDevicesRequired: Number("float"),
 *       MinMemoryRequiredInMb: Number("int"), // required
 *       MaxMemoryRequiredInMb: Number("int"),
 *     },
 *     BaseInferenceComponentName: "STRING_VALUE",
 *     DataCacheConfig: { // InferenceComponentDataCacheConfig
 *       EnableCaching: true || false, // required
 *     },
 *   },
 *   RuntimeConfig: { // InferenceComponentRuntimeConfig
 *     CopyCount: Number("int"), // required
 *   },
 *   DeploymentConfig: { // InferenceComponentDeploymentConfig
 *     RollingUpdatePolicy: { // InferenceComponentRollingUpdatePolicy
 *       MaximumBatchSize: { // InferenceComponentCapacitySize
 *         Type: "COPY_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *       WaitIntervalInSeconds: Number("int"), // required
 *       MaximumExecutionTimeoutInSeconds: Number("int"),
 *       RollbackMaximumBatchSize: {
 *         Type: "COPY_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *     },
 *     AutoRollbackConfiguration: { // AutoRollbackConfig
 *       Alarms: [ // AlarmList
 *         { // Alarm
 *           AlarmName: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   },
 * };
 * const command = new UpdateInferenceComponentCommand(input);
 * const response = await client.send(command);
 * // { // UpdateInferenceComponentOutput
 * //   InferenceComponentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateInferenceComponentCommandInput - {@link UpdateInferenceComponentCommandInput}
 * @returns {@link UpdateInferenceComponentCommandOutput}
 * @see {@link UpdateInferenceComponentCommandInput} for command's `input` shape.
 * @see {@link UpdateInferenceComponentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class UpdateInferenceComponentCommand extends UpdateInferenceComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateInferenceComponentInput;
            output: UpdateInferenceComponentOutput;
        };
        sdk: {
            input: UpdateInferenceComponentCommandInput;
            output: UpdateInferenceComponentCommandOutput;
        };
    };
}
