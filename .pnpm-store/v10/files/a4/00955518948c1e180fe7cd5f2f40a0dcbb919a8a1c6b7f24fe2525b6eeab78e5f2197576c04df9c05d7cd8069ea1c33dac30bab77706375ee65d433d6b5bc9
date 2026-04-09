import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeAutoMLJobV2Request, DescribeAutoMLJobV2Response } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeAutoMLJobV2Command}.
 */
export interface DescribeAutoMLJobV2CommandInput extends DescribeAutoMLJobV2Request {
}
/**
 * @public
 *
 * The output of {@link DescribeAutoMLJobV2Command}.
 */
export interface DescribeAutoMLJobV2CommandOutput extends DescribeAutoMLJobV2Response, __MetadataBearer {
}
declare const DescribeAutoMLJobV2Command_base: {
    new (input: DescribeAutoMLJobV2CommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAutoMLJobV2CommandInput, DescribeAutoMLJobV2CommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeAutoMLJobV2CommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAutoMLJobV2CommandInput, DescribeAutoMLJobV2CommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about an AutoML job created by calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJobV2.html">CreateAutoMLJobV2</a> or <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJob.html">CreateAutoMLJob</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeAutoMLJobV2Command } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeAutoMLJobV2Command } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeAutoMLJobV2Request
 *   AutoMLJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeAutoMLJobV2Command(input);
 * const response = await client.send(command);
 * // { // DescribeAutoMLJobV2Response
 * //   AutoMLJobName: "STRING_VALUE", // required
 * //   AutoMLJobArn: "STRING_VALUE", // required
 * //   AutoMLJobInputDataConfig: [ // AutoMLJobInputDataConfig // required
 * //     { // AutoMLJobChannel
 * //       ChannelType: "training" || "validation",
 * //       ContentType: "STRING_VALUE",
 * //       CompressionType: "None" || "Gzip",
 * //       DataSource: { // AutoMLDataSource
 * //         S3DataSource: { // AutoMLS3DataSource
 * //           S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //           S3Uri: "STRING_VALUE", // required
 * //         },
 * //       },
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
 * //   AutoMLProblemTypeConfig: { // AutoMLProblemTypeConfig Union: only one key present
 * //     ImageClassificationJobConfig: { // ImageClassificationJobConfig
 * //       CompletionCriteria: { // AutoMLJobCompletionCriteria
 * //         MaxCandidates: Number("int"),
 * //         MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //         MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //       },
 * //     },
 * //     TextClassificationJobConfig: { // TextClassificationJobConfig
 * //       CompletionCriteria: {
 * //         MaxCandidates: Number("int"),
 * //         MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //         MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //       },
 * //       ContentColumn: "STRING_VALUE", // required
 * //       TargetLabelColumn: "STRING_VALUE", // required
 * //     },
 * //     TimeSeriesForecastingJobConfig: { // TimeSeriesForecastingJobConfig
 * //       FeatureSpecificationS3Uri: "STRING_VALUE",
 * //       CompletionCriteria: {
 * //         MaxCandidates: Number("int"),
 * //         MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //         MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //       },
 * //       ForecastFrequency: "STRING_VALUE", // required
 * //       ForecastHorizon: Number("int"), // required
 * //       ForecastQuantiles: [ // ForecastQuantiles
 * //         "STRING_VALUE",
 * //       ],
 * //       Transformations: { // TimeSeriesTransformations
 * //         Filling: { // FillingTransformations
 * //           "<keys>": { // FillingTransformationMap
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //         },
 * //         Aggregation: { // AggregationTransformations
 * //           "<keys>": "sum" || "avg" || "first" || "min" || "max",
 * //         },
 * //       },
 * //       TimeSeriesConfig: { // TimeSeriesConfig
 * //         TargetAttributeName: "STRING_VALUE", // required
 * //         TimestampAttributeName: "STRING_VALUE", // required
 * //         ItemIdentifierAttributeName: "STRING_VALUE", // required
 * //         GroupingAttributeNames: [ // GroupingAttributeNames
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       HolidayConfig: [ // HolidayConfig
 * //         { // HolidayConfigAttributes
 * //           CountryCode: "STRING_VALUE",
 * //         },
 * //       ],
 * //       CandidateGenerationConfig: { // CandidateGenerationConfig
 * //         AlgorithmsConfig: [ // AutoMLAlgorithmsConfig
 * //           { // AutoMLAlgorithmConfig
 * //             AutoMLAlgorithms: [ // AutoMLAlgorithms // required
 * //               "xgboost" || "linear-learner" || "mlp" || "lightgbm" || "catboost" || "randomforest" || "extra-trees" || "nn-torch" || "fastai" || "cnn-qr" || "deepar" || "prophet" || "npts" || "arima" || "ets",
 * //             ],
 * //           },
 * //         ],
 * //       },
 * //     },
 * //     TabularJobConfig: { // TabularJobConfig
 * //       CandidateGenerationConfig: {
 * //         AlgorithmsConfig: [
 * //           {
 * //             AutoMLAlgorithms: [ // required
 * //               "xgboost" || "linear-learner" || "mlp" || "lightgbm" || "catboost" || "randomforest" || "extra-trees" || "nn-torch" || "fastai" || "cnn-qr" || "deepar" || "prophet" || "npts" || "arima" || "ets",
 * //             ],
 * //           },
 * //         ],
 * //       },
 * //       CompletionCriteria: {
 * //         MaxCandidates: Number("int"),
 * //         MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //         MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //       },
 * //       FeatureSpecificationS3Uri: "STRING_VALUE",
 * //       Mode: "AUTO" || "ENSEMBLING" || "HYPERPARAMETER_TUNING",
 * //       GenerateCandidateDefinitionsOnly: true || false,
 * //       ProblemType: "BinaryClassification" || "MulticlassClassification" || "Regression",
 * //       TargetAttributeName: "STRING_VALUE", // required
 * //       SampleWeightAttributeName: "STRING_VALUE",
 * //     },
 * //     TextGenerationJobConfig: { // TextGenerationJobConfig
 * //       CompletionCriteria: {
 * //         MaxCandidates: Number("int"),
 * //         MaxRuntimePerTrainingJobInSeconds: Number("int"),
 * //         MaxAutoMLJobRuntimeInSeconds: Number("int"),
 * //       },
 * //       BaseModelName: "STRING_VALUE",
 * //       TextGenerationHyperParameters: { // TextGenerationHyperParameters
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //       ModelAccessConfig: { // ModelAccessConfig
 * //         AcceptEula: true || false, // required
 * //       },
 * //     },
 * //   },
 * //   AutoMLProblemTypeConfigName: "ImageClassification" || "TextClassification" || "TimeSeriesForecasting" || "Tabular" || "TextGeneration",
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
 * //   AutoMLJobArtifacts: { // AutoMLJobArtifacts
 * //     CandidateDefinitionNotebookLocation: "STRING_VALUE",
 * //     DataExplorationNotebookLocation: "STRING_VALUE",
 * //   },
 * //   ResolvedAttributes: { // AutoMLResolvedAttributes
 * //     AutoMLJobObjective: {
 * //       MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss", // required
 * //     },
 * //     CompletionCriteria: "<AutoMLJobCompletionCriteria>",
 * //     AutoMLProblemTypeResolvedAttributes: { // AutoMLProblemTypeResolvedAttributes Union: only one key present
 * //       TabularResolvedAttributes: { // TabularResolvedAttributes
 * //         ProblemType: "BinaryClassification" || "MulticlassClassification" || "Regression",
 * //       },
 * //       TextGenerationResolvedAttributes: { // TextGenerationResolvedAttributes
 * //         BaseModelName: "STRING_VALUE",
 * //       },
 * //     },
 * //   },
 * //   ModelDeployConfig: { // ModelDeployConfig
 * //     AutoGenerateEndpointName: true || false,
 * //     EndpointName: "STRING_VALUE",
 * //   },
 * //   ModelDeployResult: { // ModelDeployResult
 * //     EndpointName: "STRING_VALUE",
 * //   },
 * //   DataSplitConfig: { // AutoMLDataSplitConfig
 * //     ValidationFraction: Number("float"),
 * //   },
 * //   SecurityConfig: { // AutoMLSecurityConfig
 * //     VolumeKmsKeyId: "STRING_VALUE",
 * //     EnableInterContainerTrafficEncryption: true || false,
 * //     VpcConfig: { // VpcConfig
 * //       SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //         "STRING_VALUE",
 * //       ],
 * //       Subnets: [ // Subnets // required
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //   },
 * //   AutoMLComputeConfig: { // AutoMLComputeConfig
 * //     EmrServerlessComputeConfig: { // EmrServerlessComputeConfig
 * //       ExecutionRoleARN: "STRING_VALUE", // required
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeAutoMLJobV2CommandInput - {@link DescribeAutoMLJobV2CommandInput}
 * @returns {@link DescribeAutoMLJobV2CommandOutput}
 * @see {@link DescribeAutoMLJobV2CommandInput} for command's `input` shape.
 * @see {@link DescribeAutoMLJobV2CommandOutput} for command's `response` shape.
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
export declare class DescribeAutoMLJobV2Command extends DescribeAutoMLJobV2Command_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeAutoMLJobV2Request;
            output: DescribeAutoMLJobV2Response;
        };
        sdk: {
            input: DescribeAutoMLJobV2CommandInput;
            output: DescribeAutoMLJobV2CommandOutput;
        };
    };
}
