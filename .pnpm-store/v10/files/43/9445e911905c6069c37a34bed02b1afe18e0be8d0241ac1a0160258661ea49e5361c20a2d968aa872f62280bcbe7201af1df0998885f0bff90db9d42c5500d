import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeAutoMLJobRequest, DescribeAutoMLJobResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeAutoMLJobCommand}.
 */
export interface DescribeAutoMLJobCommandInput extends DescribeAutoMLJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeAutoMLJobCommand}.
 */
export interface DescribeAutoMLJobCommandOutput extends DescribeAutoMLJobResponse, __MetadataBearer {
}
declare const DescribeAutoMLJobCommand_base: {
    new (input: DescribeAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAutoMLJobCommandInput, DescribeAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAutoMLJobCommandInput, DescribeAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about an AutoML job created by calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJob.html">CreateAutoMLJob</a>.</p> <note> <p>AutoML jobs created by calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJobV2.html">CreateAutoMLJobV2</a> cannot be described by <code>DescribeAutoMLJob</code>.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeAutoMLJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeAutoMLJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeAutoMLJobRequest
 *   AutoMLJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeAutoMLJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeAutoMLJobResponse
 * //   AutoMLJobName: "STRING_VALUE", // required
 * //   AutoMLJobArn: "STRING_VALUE", // required
 * //   InputDataConfig: [ // AutoMLInputDataConfig // required
 * //     { // AutoMLChannel
 * //       DataSource: { // AutoMLDataSource
 * //         S3DataSource: { // AutoMLS3DataSource
 * //           S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //           S3Uri: "STRING_VALUE", // required
 * //         },
 * //       },
 * //       CompressionType: "None" || "Gzip",
 * //       TargetAttributeName: "STRING_VALUE", // required
 * //       ContentType: "STRING_VALUE",
 * //       ChannelType: "training" || "validation",
 * //       SampleWeightAttributeName: "STRING_VALUE",
 * //     },
 * //   ],
 * //   OutputDataConfig: { // AutoMLOutputDataConfig
 * //     KmsKeyId: "STRING_VALUE",
 * //     S3OutputPath: "STRING_VALUE", // required
 * //   },
 * //   RoleArn: "STRING_VALUE", // required
 * //   AutoMLJobObjective: { // AutoMLJobObjective
 * //     MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss", // required
 * //   },
 * //   ProblemType: "BinaryClassification" || "MulticlassClassification" || "Regression",
 * //   AutoMLJobConfig: { // AutoMLJobConfig
 * //     CompletionCriteria: { // AutoMLJobCompletionCriteria
 * //       MaxCandidates: Number("int"),
 * //       MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //       MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //     },
 * //     SecurityConfig: { // AutoMLSecurityConfig
 * //       VolumeKmsKeyId: "STRING_VALUE",
 * //       EnableInterContainerTrafficEncryption: true || false,
 * //       VpcConfig: { // VpcConfig
 * //         SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //           "STRING_VALUE",
 * //         ],
 * //         Subnets: [ // Subnets // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //     },
 * //     CandidateGenerationConfig: { // AutoMLCandidateGenerationConfig
 * //       FeatureSpecificationS3Uri: "STRING_VALUE",
 * //       AlgorithmsConfig: [ // AutoMLAlgorithmsConfig
 * //         { // AutoMLAlgorithmConfig
 * //           AutoMLAlgorithms: [ // AutoMLAlgorithms // required
 * //             "xgboost" || "linear-learner" || "mlp" || "lightgbm" || "catboost" || "randomforest" || "extra-trees" || "nn-torch" || "fastai" || "cnn-qr" || "deepar" || "prophet" || "npts" || "arima" || "ets",
 * //           ],
 * //         },
 * //       ],
 * //     },
 * //     DataSplitConfig: { // AutoMLDataSplitConfig
 * //       ValidationFraction: Number("float"),
 * //     },
 * //     Mode: "AUTO" || "ENSEMBLING" || "HYPERPARAMETER_TUNING",
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   EndTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"), // required
 * //   FailureReason: "STRING_VALUE",
 * //   PartialFailureReasons: [ // AutoMLPartialFailureReasons
 * //     { // AutoMLPartialFailureReason
 * //       PartialFailureMessage: "STRING_VALUE",
 * //     },
 * //   ],
 * //   BestCandidate: { // AutoMLCandidate
 * //     CandidateName: "STRING_VALUE", // required
 * //     FinalAutoMLJobObjectiveMetric: { // FinalAutoMLJobObjectiveMetric
 * //       Type: "Maximize" || "Minimize",
 * //       MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss", // required
 * //       Value: Number("float"), // required
 * //       StandardMetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss",
 * //     },
 * //     ObjectiveStatus: "Succeeded" || "Pending" || "Failed", // required
 * //     CandidateSteps: [ // CandidateSteps // required
 * //       { // AutoMLCandidateStep
 * //         CandidateStepType: "AWS::SageMaker::TrainingJob" || "AWS::SageMaker::TransformJob" || "AWS::SageMaker::ProcessingJob", // required
 * //         CandidateStepArn: "STRING_VALUE", // required
 * //         CandidateStepName: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //     CandidateStatus: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping", // required
 * //     InferenceContainers: [ // AutoMLContainerDefinitions
 * //       { // AutoMLContainerDefinition
 * //         Image: "STRING_VALUE", // required
 * //         ModelDataUrl: "STRING_VALUE", // required
 * //         Environment: { // EnvironmentMap
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //     ],
 * //     CreationTime: new Date("TIMESTAMP"), // required
 * //     EndTime: new Date("TIMESTAMP"),
 * //     LastModifiedTime: new Date("TIMESTAMP"), // required
 * //     FailureReason: "STRING_VALUE",
 * //     CandidateProperties: { // CandidateProperties
 * //       CandidateArtifactLocations: { // CandidateArtifactLocations
 * //         Explainability: "STRING_VALUE", // required
 * //         ModelInsights: "STRING_VALUE",
 * //         BacktestResults: "STRING_VALUE",
 * //       },
 * //       CandidateMetrics: [ // MetricDataList
 * //         { // MetricDatum
 * //           MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss",
 * //           StandardMetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "MAE" || "R2" || "BalancedAccuracy" || "Precision" || "PrecisionMacro" || "Recall" || "RecallMacro" || "LogLoss" || "InferenceLatency" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss" || "Rouge1" || "Rouge2" || "RougeL" || "RougeLSum" || "Perplexity" || "ValidationLoss" || "TrainingLoss",
 * //           Value: Number("float"),
 * //           Set: "Train" || "Validation" || "Test",
 * //         },
 * //       ],
 * //     },
 * //     InferenceContainerDefinitions: { // AutoMLInferenceContainerDefinitions
 * //       "<keys>": [
 * //         {
 * //           Image: "STRING_VALUE", // required
 * //           ModelDataUrl: "STRING_VALUE", // required
 * //           Environment: {
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //         },
 * //       ],
 * //     },
 * //   },
 * //   AutoMLJobStatus: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping", // required
 * //   AutoMLJobSecondaryStatus: "Starting" || "MaxCandidatesReached" || "Failed" || "Stopped" || "MaxAutoMLJobRuntimeReached" || "Stopping" || "CandidateDefinitionsGenerated" || "Completed" || "ExplainabilityError" || "DeployingModel" || "ModelDeploymentError" || "GeneratingModelInsightsReport" || "ModelInsightsError" || "AnalyzingData" || "FeatureEngineering" || "ModelTuning" || "GeneratingExplainabilityReport" || "TrainingModels" || "PreTraining", // required
 * //   GenerateCandidateDefinitionsOnly: true || false,
 * //   AutoMLJobArtifacts: { // AutoMLJobArtifacts
 * //     CandidateDefinitionNotebookLocation: "STRING_VALUE",
 * //     DataExplorationNotebookLocation: "STRING_VALUE",
 * //   },
 * //   ResolvedAttributes: { // ResolvedAttributes
 * //     AutoMLJobObjective: {
 * //       MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss", // required
 * //     },
 * //     ProblemType: "BinaryClassification" || "MulticlassClassification" || "Regression",
 * //     CompletionCriteria: {
 * //       MaxCandidates: Number("int"),
 * //       MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //       MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //     },
 * //   },
 * //   ModelDeployConfig: { // ModelDeployConfig
 * //     AutoGenerateEndpointName: true || false,
 * //     EndpointName: "STRING_VALUE",
 * //   },
 * //   ModelDeployResult: { // ModelDeployResult
 * //     EndpointName: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeAutoMLJobCommandInput - {@link DescribeAutoMLJobCommandInput}
 * @returns {@link DescribeAutoMLJobCommandOutput}
 * @see {@link DescribeAutoMLJobCommandInput} for command's `input` shape.
 * @see {@link DescribeAutoMLJobCommandOutput} for command's `response` shape.
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
export declare class DescribeAutoMLJobCommand extends DescribeAutoMLJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeAutoMLJobRequest;
            output: DescribeAutoMLJobResponse;
        };
        sdk: {
            input: DescribeAutoMLJobCommandInput;
            output: DescribeAutoMLJobCommandOutput;
        };
    };
}
