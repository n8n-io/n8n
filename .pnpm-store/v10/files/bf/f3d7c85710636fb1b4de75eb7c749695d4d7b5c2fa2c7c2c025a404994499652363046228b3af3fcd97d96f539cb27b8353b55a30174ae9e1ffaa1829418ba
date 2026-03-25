import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListInferenceRecommendationsJobStepsRequest, ListInferenceRecommendationsJobStepsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListInferenceRecommendationsJobStepsCommand}.
 */
export interface ListInferenceRecommendationsJobStepsCommandInput extends ListInferenceRecommendationsJobStepsRequest {
}
/**
 * @public
 *
 * The output of {@link ListInferenceRecommendationsJobStepsCommand}.
 */
export interface ListInferenceRecommendationsJobStepsCommandOutput extends ListInferenceRecommendationsJobStepsResponse, __MetadataBearer {
}
declare const ListInferenceRecommendationsJobStepsCommand_base: {
    new (input: ListInferenceRecommendationsJobStepsCommandInput): import("@smithy/smithy-client").CommandImpl<ListInferenceRecommendationsJobStepsCommandInput, ListInferenceRecommendationsJobStepsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListInferenceRecommendationsJobStepsCommandInput): import("@smithy/smithy-client").CommandImpl<ListInferenceRecommendationsJobStepsCommandInput, ListInferenceRecommendationsJobStepsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a list of the subtasks for an Inference Recommender job.</p> <p>The supported subtasks are benchmarks, which evaluate the performance of your model on different instance types.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListInferenceRecommendationsJobStepsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListInferenceRecommendationsJobStepsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListInferenceRecommendationsJobStepsRequest
 *   JobName: "STRING_VALUE", // required
 *   Status: "PENDING" || "IN_PROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED" || "DELETING" || "DELETED",
 *   StepType: "BENCHMARK",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListInferenceRecommendationsJobStepsCommand(input);
 * const response = await client.send(command);
 * // { // ListInferenceRecommendationsJobStepsResponse
 * //   Steps: [ // InferenceRecommendationsJobSteps
 * //     { // InferenceRecommendationsJobStep
 * //       StepType: "BENCHMARK", // required
 * //       JobName: "STRING_VALUE", // required
 * //       Status: "PENDING" || "IN_PROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED" || "DELETING" || "DELETED", // required
 * //       InferenceBenchmark: { // RecommendationJobInferenceBenchmark
 * //         Metrics: { // RecommendationMetrics
 * //           CostPerHour: Number("float"),
 * //           CostPerInference: Number("float"),
 * //           MaxInvocations: Number("int"),
 * //           ModelLatency: Number("int"),
 * //           CpuUtilization: Number("float"),
 * //           MemoryUtilization: Number("float"),
 * //           ModelSetupTime: Number("int"),
 * //         },
 * //         EndpointMetrics: { // InferenceMetrics
 * //           MaxInvocations: Number("int"), // required
 * //           ModelLatency: Number("int"), // required
 * //         },
 * //         EndpointConfiguration: { // EndpointOutputConfiguration
 * //           EndpointName: "STRING_VALUE", // required
 * //           VariantName: "STRING_VALUE", // required
 * //           InstanceType: "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //           InitialInstanceCount: Number("int"),
 * //           ServerlessConfig: { // ProductionVariantServerlessConfig
 * //             MemorySizeInMB: Number("int"), // required
 * //             MaxConcurrency: Number("int"), // required
 * //             ProvisionedConcurrency: Number("int"),
 * //           },
 * //         },
 * //         ModelConfiguration: { // ModelConfiguration
 * //           InferenceSpecificationName: "STRING_VALUE",
 * //           EnvironmentParameters: [ // EnvironmentParameters
 * //             { // EnvironmentParameter
 * //               Key: "STRING_VALUE", // required
 * //               ValueType: "STRING_VALUE", // required
 * //               Value: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //           CompilationJobName: "STRING_VALUE",
 * //         },
 * //         FailureReason: "STRING_VALUE",
 * //         InvocationEndTime: new Date("TIMESTAMP"),
 * //         InvocationStartTime: new Date("TIMESTAMP"),
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListInferenceRecommendationsJobStepsCommandInput - {@link ListInferenceRecommendationsJobStepsCommandInput}
 * @returns {@link ListInferenceRecommendationsJobStepsCommandOutput}
 * @see {@link ListInferenceRecommendationsJobStepsCommandInput} for command's `input` shape.
 * @see {@link ListInferenceRecommendationsJobStepsCommandOutput} for command's `response` shape.
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
export declare class ListInferenceRecommendationsJobStepsCommand extends ListInferenceRecommendationsJobStepsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListInferenceRecommendationsJobStepsRequest;
            output: ListInferenceRecommendationsJobStepsResponse;
        };
        sdk: {
            input: ListInferenceRecommendationsJobStepsCommandInput;
            output: ListInferenceRecommendationsJobStepsCommandOutput;
        };
    };
}
