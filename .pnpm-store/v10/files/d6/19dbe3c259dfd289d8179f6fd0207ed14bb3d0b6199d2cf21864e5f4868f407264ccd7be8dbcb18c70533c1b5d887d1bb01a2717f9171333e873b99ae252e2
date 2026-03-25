import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateAutoMLJobRequest, CreateAutoMLJobResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateAutoMLJobCommand}.
 */
export interface CreateAutoMLJobCommandInput extends CreateAutoMLJobRequest {
}
/**
 * @public
 *
 * The output of {@link CreateAutoMLJobCommand}.
 */
export interface CreateAutoMLJobCommandOutput extends CreateAutoMLJobResponse, __MetadataBearer {
}
declare const CreateAutoMLJobCommand_base: {
    new (input: CreateAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAutoMLJobCommandInput, CreateAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateAutoMLJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAutoMLJobCommandInput, CreateAutoMLJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an Autopilot job also referred to as Autopilot experiment or AutoML job.</p> <p>An AutoML job in SageMaker AI is a fully automated process that allows you to build machine learning models with minimal effort and machine learning expertise. When initiating an AutoML job, you provide your data and optionally specify parameters tailored to your use case. SageMaker AI then automates the entire model development lifecycle, including data preprocessing, model training, tuning, and evaluation. AutoML jobs are designed to simplify and accelerate the model building process by automating various tasks and exploring different combinations of machine learning algorithms, data preprocessing techniques, and hyperparameter values. The output of an AutoML job comprises one or more trained models ready for deployment and inference. Additionally, SageMaker AI AutoML jobs generate a candidate model leaderboard, allowing you to select the best-performing model for deployment.</p> <p>For more information about AutoML jobs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development.html">https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development.html</a> in the SageMaker AI developer guide.</p> <note> <p>We recommend using the new versions <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJobV2.html">CreateAutoMLJobV2</a> and <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeAutoMLJobV2.html">DescribeAutoMLJobV2</a>, which offer backward compatibility.</p> <p> <code>CreateAutoMLJobV2</code> can manage tabular problem types identical to those of its previous version <code>CreateAutoMLJob</code>, as well as time-series forecasting, non-tabular problem types such as image or text classification, and text generation (LLMs fine-tuning).</p> <p>Find guidelines about how to migrate a <code>CreateAutoMLJob</code> to <code>CreateAutoMLJobV2</code> in <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development-create-experiment.html#autopilot-create-experiment-api-migrate-v1-v2">Migrate a CreateAutoMLJob to CreateAutoMLJobV2</a>.</p> </note> <p>You can find the best-performing model after you run an AutoML job by calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeAutoMLJobV2.html">DescribeAutoMLJobV2</a> (recommended) or <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeAutoMLJob.html">DescribeAutoMLJob</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateAutoMLJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateAutoMLJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateAutoMLJobRequest
 *   AutoMLJobName: "STRING_VALUE", // required
 *   InputDataConfig: [ // AutoMLInputDataConfig // required
 *     { // AutoMLChannel
 *       DataSource: { // AutoMLDataSource
 *         S3DataSource: { // AutoMLS3DataSource
 *           S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 *           S3Uri: "STRING_VALUE", // required
 *         },
 *       },
 *       CompressionType: "None" || "Gzip",
 *       TargetAttributeName: "STRING_VALUE", // required
 *       ContentType: "STRING_VALUE",
 *       ChannelType: "training" || "validation",
 *       SampleWeightAttributeName: "STRING_VALUE",
 *     },
 *   ],
 *   OutputDataConfig: { // AutoMLOutputDataConfig
 *     KmsKeyId: "STRING_VALUE",
 *     S3OutputPath: "STRING_VALUE", // required
 *   },
 *   ProblemType: "BinaryClassification" || "MulticlassClassification" || "Regression",
 *   AutoMLJobObjective: { // AutoMLJobObjective
 *     MetricName: "Accuracy" || "MSE" || "F1" || "F1macro" || "AUC" || "RMSE" || "BalancedAccuracy" || "R2" || "Recall" || "RecallMacro" || "Precision" || "PrecisionMacro" || "MAE" || "MAPE" || "MASE" || "WAPE" || "AverageWeightedQuantileLoss", // required
 *   },
 *   AutoMLJobConfig: { // AutoMLJobConfig
 *     CompletionCriteria: { // AutoMLJobCompletionCriteria
 *       MaxCandidates: Number("int"),
 *       MaxRuntimePerTrainingJobInSeconds: Number("int"),
 *       MaxAutoMLJobRuntimeInSeconds: Number("int"),
 *     },
 *     SecurityConfig: { // AutoMLSecurityConfig
 *       VolumeKmsKeyId: "STRING_VALUE",
 *       EnableInterContainerTrafficEncryption: true || false,
 *       VpcConfig: { // VpcConfig
 *         SecurityGroupIds: [ // VpcSecurityGroupIds // required
 *           "STRING_VALUE",
 *         ],
 *         Subnets: [ // Subnets // required
 *           "STRING_VALUE",
 *         ],
 *       },
 *     },
 *     CandidateGenerationConfig: { // AutoMLCandidateGenerationConfig
 *       FeatureSpecificationS3Uri: "STRING_VALUE",
 *       AlgorithmsConfig: [ // AutoMLAlgorithmsConfig
 *         { // AutoMLAlgorithmConfig
 *           AutoMLAlgorithms: [ // AutoMLAlgorithms // required
 *             "xgboost" || "linear-learner" || "mlp" || "lightgbm" || "catboost" || "randomforest" || "extra-trees" || "nn-torch" || "fastai" || "cnn-qr" || "deepar" || "prophet" || "npts" || "arima" || "ets",
 *           ],
 *         },
 *       ],
 *     },
 *     DataSplitConfig: { // AutoMLDataSplitConfig
 *       ValidationFraction: Number("float"),
 *     },
 *     Mode: "AUTO" || "ENSEMBLING" || "HYPERPARAMETER_TUNING",
 *   },
 *   RoleArn: "STRING_VALUE", // required
 *   GenerateCandidateDefinitionsOnly: true || false,
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   ModelDeployConfig: { // ModelDeployConfig
 *     AutoGenerateEndpointName: true || false,
 *     EndpointName: "STRING_VALUE",
 *   },
 * };
 * const command = new CreateAutoMLJobCommand(input);
 * const response = await client.send(command);
 * // { // CreateAutoMLJobResponse
 * //   AutoMLJobArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateAutoMLJobCommandInput - {@link CreateAutoMLJobCommandInput}
 * @returns {@link CreateAutoMLJobCommandOutput}
 * @see {@link CreateAutoMLJobCommandInput} for command's `input` shape.
 * @see {@link CreateAutoMLJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateAutoMLJobCommand extends CreateAutoMLJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateAutoMLJobRequest;
            output: CreateAutoMLJobResponse;
        };
        sdk: {
            input: CreateAutoMLJobCommandInput;
            output: CreateAutoMLJobCommandOutput;
        };
    };
}
