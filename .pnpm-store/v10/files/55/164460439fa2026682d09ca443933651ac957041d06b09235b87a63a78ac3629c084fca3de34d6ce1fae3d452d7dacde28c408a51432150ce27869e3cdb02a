import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetScalingConfigurationRecommendationRequest, GetScalingConfigurationRecommendationResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetScalingConfigurationRecommendationCommand}.
 */
export interface GetScalingConfigurationRecommendationCommandInput extends GetScalingConfigurationRecommendationRequest {
}
/**
 * @public
 *
 * The output of {@link GetScalingConfigurationRecommendationCommand}.
 */
export interface GetScalingConfigurationRecommendationCommandOutput extends GetScalingConfigurationRecommendationResponse, __MetadataBearer {
}
declare const GetScalingConfigurationRecommendationCommand_base: {
    new (input: GetScalingConfigurationRecommendationCommandInput): import("@smithy/smithy-client").CommandImpl<GetScalingConfigurationRecommendationCommandInput, GetScalingConfigurationRecommendationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetScalingConfigurationRecommendationCommandInput): import("@smithy/smithy-client").CommandImpl<GetScalingConfigurationRecommendationCommandInput, GetScalingConfigurationRecommendationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts an Amazon SageMaker Inference Recommender autoscaling recommendation job. Returns recommendations for autoscaling policies that you can apply to your SageMaker endpoint.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetScalingConfigurationRecommendationCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetScalingConfigurationRecommendationCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // GetScalingConfigurationRecommendationRequest
 *   InferenceRecommendationsJobName: "STRING_VALUE", // required
 *   RecommendationId: "STRING_VALUE",
 *   EndpointName: "STRING_VALUE",
 *   TargetCpuUtilizationPerCore: Number("int"),
 *   ScalingPolicyObjective: { // ScalingPolicyObjective
 *     MinInvocationsPerMinute: Number("int"),
 *     MaxInvocationsPerMinute: Number("int"),
 *   },
 * };
 * const command = new GetScalingConfigurationRecommendationCommand(input);
 * const response = await client.send(command);
 * // { // GetScalingConfigurationRecommendationResponse
 * //   InferenceRecommendationsJobName: "STRING_VALUE",
 * //   RecommendationId: "STRING_VALUE",
 * //   EndpointName: "STRING_VALUE",
 * //   TargetCpuUtilizationPerCore: Number("int"),
 * //   ScalingPolicyObjective: { // ScalingPolicyObjective
 * //     MinInvocationsPerMinute: Number("int"),
 * //     MaxInvocationsPerMinute: Number("int"),
 * //   },
 * //   Metric: { // ScalingPolicyMetric
 * //     InvocationsPerInstance: Number("int"),
 * //     ModelLatency: Number("int"),
 * //   },
 * //   DynamicScalingConfiguration: { // DynamicScalingConfiguration
 * //     MinCapacity: Number("int"),
 * //     MaxCapacity: Number("int"),
 * //     ScaleInCooldown: Number("int"),
 * //     ScaleOutCooldown: Number("int"),
 * //     ScalingPolicies: [ // ScalingPolicies
 * //       { // ScalingPolicy Union: only one key present
 * //         TargetTracking: { // TargetTrackingScalingPolicyConfiguration
 * //           MetricSpecification: { // MetricSpecification Union: only one key present
 * //             Predefined: { // PredefinedMetricSpecification
 * //               PredefinedMetricType: "STRING_VALUE",
 * //             },
 * //             Customized: { // CustomizedMetricSpecification
 * //               MetricName: "STRING_VALUE",
 * //               Namespace: "STRING_VALUE",
 * //               Statistic: "Average" || "Minimum" || "Maximum" || "SampleCount" || "Sum",
 * //             },
 * //           },
 * //           TargetValue: Number("double"),
 * //         },
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetScalingConfigurationRecommendationCommandInput - {@link GetScalingConfigurationRecommendationCommandInput}
 * @returns {@link GetScalingConfigurationRecommendationCommandOutput}
 * @see {@link GetScalingConfigurationRecommendationCommandInput} for command's `input` shape.
 * @see {@link GetScalingConfigurationRecommendationCommandOutput} for command's `response` shape.
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
export declare class GetScalingConfigurationRecommendationCommand extends GetScalingConfigurationRecommendationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetScalingConfigurationRecommendationRequest;
            output: GetScalingConfigurationRecommendationResponse;
        };
        sdk: {
            input: GetScalingConfigurationRecommendationCommandInput;
            output: GetScalingConfigurationRecommendationCommandOutput;
        };
    };
}
