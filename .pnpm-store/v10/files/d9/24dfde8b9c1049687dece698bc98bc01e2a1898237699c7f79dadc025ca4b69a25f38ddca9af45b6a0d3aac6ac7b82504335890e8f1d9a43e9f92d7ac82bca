import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateAlgorithmInput, CreateAlgorithmOutput } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateAlgorithmCommand}.
 */
export interface CreateAlgorithmCommandInput extends CreateAlgorithmInput {
}
/**
 * @public
 *
 * The output of {@link CreateAlgorithmCommand}.
 */
export interface CreateAlgorithmCommandOutput extends CreateAlgorithmOutput, __MetadataBearer {
}
declare const CreateAlgorithmCommand_base: {
    new (input: CreateAlgorithmCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAlgorithmCommandInput, CreateAlgorithmCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateAlgorithmCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAlgorithmCommandInput, CreateAlgorithmCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create a machine learning algorithm that you can use in SageMaker and list in the Amazon Web Services Marketplace.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateAlgorithmCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateAlgorithmCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateAlgorithmInput
 *   AlgorithmName: "STRING_VALUE", // required
 *   AlgorithmDescription: "STRING_VALUE",
 *   TrainingSpecification: { // TrainingSpecification
 *     TrainingImage: "STRING_VALUE", // required
 *     TrainingImageDigest: "STRING_VALUE",
 *     SupportedHyperParameters: [ // HyperParameterSpecifications
 *       { // HyperParameterSpecification
 *         Name: "STRING_VALUE", // required
 *         Description: "STRING_VALUE",
 *         Type: "Integer" || "Continuous" || "Categorical" || "FreeText", // required
 *         Range: { // ParameterRange
 *           IntegerParameterRangeSpecification: { // IntegerParameterRangeSpecification
 *             MinValue: "STRING_VALUE", // required
 *             MaxValue: "STRING_VALUE", // required
 *           },
 *           ContinuousParameterRangeSpecification: { // ContinuousParameterRangeSpecification
 *             MinValue: "STRING_VALUE", // required
 *             MaxValue: "STRING_VALUE", // required
 *           },
 *           CategoricalParameterRangeSpecification: { // CategoricalParameterRangeSpecification
 *             Values: [ // ParameterValues // required
 *               "STRING_VALUE",
 *             ],
 *           },
 *         },
 *         IsTunable: true || false,
 *         IsRequired: true || false,
 *         DefaultValue: "STRING_VALUE",
 *       },
 *     ],
 *     SupportedTrainingInstanceTypes: [ // TrainingInstanceTypes // required
 *       "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 *     ],
 *     SupportsDistributedTraining: true || false,
 *     MetricDefinitions: [ // MetricDefinitionList
 *       { // MetricDefinition
 *         Name: "STRING_VALUE", // required
 *         Regex: "STRING_VALUE", // required
 *       },
 *     ],
 *     TrainingChannels: [ // ChannelSpecifications // required
 *       { // ChannelSpecification
 *         Name: "STRING_VALUE", // required
 *         Description: "STRING_VALUE",
 *         IsRequired: true || false,
 *         SupportedContentTypes: [ // ContentTypes // required
 *           "STRING_VALUE",
 *         ],
 *         SupportedCompressionTypes: [ // CompressionTypes
 *           "None" || "Gzip",
 *         ],
 *         SupportedInputModes: [ // InputModes // required
 *           "Pipe" || "File" || "FastFile",
 *         ],
 *       },
 *     ],
 *     SupportedTuningJobObjectiveMetrics: [ // HyperParameterTuningJobObjectives
 *       { // HyperParameterTuningJobObjective
 *         Type: "Maximize" || "Minimize", // required
 *         MetricName: "STRING_VALUE", // required
 *       },
 *     ],
 *     AdditionalS3DataSource: { // AdditionalS3DataSource
 *       S3DataType: "S3Object" || "S3Prefix", // required
 *       S3Uri: "STRING_VALUE", // required
 *       CompressionType: "None" || "Gzip",
 *       ETag: "STRING_VALUE",
 *     },
 *   },
 *   InferenceSpecification: { // InferenceSpecification
 *     Containers: [ // ModelPackageContainerDefinitionList // required
 *       { // ModelPackageContainerDefinition
 *         ContainerHostname: "STRING_VALUE",
 *         Image: "STRING_VALUE", // required
 *         ImageDigest: "STRING_VALUE",
 *         ModelDataUrl: "STRING_VALUE",
 *         ModelDataSource: { // ModelDataSource
 *           S3DataSource: { // S3ModelDataSource
 *             S3Uri: "STRING_VALUE", // required
 *             S3DataType: "S3Prefix" || "S3Object", // required
 *             CompressionType: "None" || "Gzip", // required
 *             ModelAccessConfig: { // ModelAccessConfig
 *               AcceptEula: true || false, // required
 *             },
 *             HubAccessConfig: { // InferenceHubAccessConfig
 *               HubContentArn: "STRING_VALUE", // required
 *             },
 *             ManifestS3Uri: "STRING_VALUE",
 *             ETag: "STRING_VALUE",
 *             ManifestEtag: "STRING_VALUE",
 *           },
 *         },
 *         ProductId: "STRING_VALUE",
 *         Environment: { // EnvironmentMap
 *           "<keys>": "STRING_VALUE",
 *         },
 *         ModelInput: { // ModelInput
 *           DataInputConfig: "STRING_VALUE", // required
 *         },
 *         Framework: "STRING_VALUE",
 *         FrameworkVersion: "STRING_VALUE",
 *         NearestModelName: "STRING_VALUE",
 *         AdditionalS3DataSource: {
 *           S3DataType: "S3Object" || "S3Prefix", // required
 *           S3Uri: "STRING_VALUE", // required
 *           CompressionType: "None" || "Gzip",
 *           ETag: "STRING_VALUE",
 *         },
 *         ModelDataETag: "STRING_VALUE",
 *       },
 *     ],
 *     SupportedTransformInstanceTypes: [ // TransformInstanceTypes
 *       "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge",
 *     ],
 *     SupportedRealtimeInferenceInstanceTypes: [ // RealtimeInferenceInstanceTypes
 *       "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 *     ],
 *     SupportedContentTypes: [
 *       "STRING_VALUE",
 *     ],
 *     SupportedResponseMIMETypes: [ // ResponseMIMETypes
 *       "STRING_VALUE",
 *     ],
 *   },
 *   ValidationSpecification: { // AlgorithmValidationSpecification
 *     ValidationRole: "STRING_VALUE", // required
 *     ValidationProfiles: [ // AlgorithmValidationProfiles // required
 *       { // AlgorithmValidationProfile
 *         ProfileName: "STRING_VALUE", // required
 *         TrainingJobDefinition: { // TrainingJobDefinition
 *           TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 *           HyperParameters: { // HyperParameters
 *             "<keys>": "STRING_VALUE",
 *           },
 *           InputDataConfig: [ // InputDataConfig // required
 *             { // Channel
 *               ChannelName: "STRING_VALUE", // required
 *               DataSource: { // DataSource
 *                 S3DataSource: { // S3DataSource
 *                   S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 *                   S3Uri: "STRING_VALUE", // required
 *                   S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 *                   AttributeNames: [ // AttributeNames
 *                     "STRING_VALUE",
 *                   ],
 *                   InstanceGroupNames: [ // InstanceGroupNames
 *                     "STRING_VALUE",
 *                   ],
 *                   ModelAccessConfig: {
 *                     AcceptEula: true || false, // required
 *                   },
 *                   HubAccessConfig: { // HubAccessConfig
 *                     HubContentArn: "STRING_VALUE", // required
 *                   },
 *                 },
 *                 FileSystemDataSource: { // FileSystemDataSource
 *                   FileSystemId: "STRING_VALUE", // required
 *                   FileSystemAccessMode: "rw" || "ro", // required
 *                   FileSystemType: "EFS" || "FSxLustre", // required
 *                   DirectoryPath: "STRING_VALUE", // required
 *                 },
 *               },
 *               ContentType: "STRING_VALUE",
 *               CompressionType: "None" || "Gzip",
 *               RecordWrapperType: "None" || "RecordIO",
 *               InputMode: "Pipe" || "File" || "FastFile",
 *               ShuffleConfig: { // ShuffleConfig
 *                 Seed: Number("long"), // required
 *               },
 *             },
 *           ],
 *           OutputDataConfig: { // OutputDataConfig
 *             KmsKeyId: "STRING_VALUE",
 *             S3OutputPath: "STRING_VALUE", // required
 *             CompressionType: "GZIP" || "NONE",
 *           },
 *           ResourceConfig: { // ResourceConfig
 *             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 *             InstanceCount: Number("int"),
 *             VolumeSizeInGB: Number("int"), // required
 *             VolumeKmsKeyId: "STRING_VALUE",
 *             KeepAlivePeriodInSeconds: Number("int"),
 *             InstanceGroups: [ // InstanceGroups
 *               { // InstanceGroup
 *                 InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 *                 InstanceCount: Number("int"), // required
 *                 InstanceGroupName: "STRING_VALUE", // required
 *               },
 *             ],
 *             TrainingPlanArn: "STRING_VALUE",
 *           },
 *           StoppingCondition: { // StoppingCondition
 *             MaxRuntimeInSeconds: Number("int"),
 *             MaxWaitTimeInSeconds: Number("int"),
 *             MaxPendingTimeInSeconds: Number("int"),
 *           },
 *         },
 *         TransformJobDefinition: { // TransformJobDefinition
 *           MaxConcurrentTransforms: Number("int"),
 *           MaxPayloadInMB: Number("int"),
 *           BatchStrategy: "MultiRecord" || "SingleRecord",
 *           Environment: { // TransformEnvironmentMap
 *             "<keys>": "STRING_VALUE",
 *           },
 *           TransformInput: { // TransformInput
 *             DataSource: { // TransformDataSource
 *               S3DataSource: { // TransformS3DataSource
 *                 S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 *                 S3Uri: "STRING_VALUE", // required
 *               },
 *             },
 *             ContentType: "STRING_VALUE",
 *             CompressionType: "None" || "Gzip",
 *             SplitType: "None" || "Line" || "RecordIO" || "TFRecord",
 *           },
 *           TransformOutput: { // TransformOutput
 *             S3OutputPath: "STRING_VALUE", // required
 *             Accept: "STRING_VALUE",
 *             AssembleWith: "None" || "Line",
 *             KmsKeyId: "STRING_VALUE",
 *           },
 *           TransformResources: { // TransformResources
 *             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge", // required
 *             InstanceCount: Number("int"), // required
 *             VolumeKmsKeyId: "STRING_VALUE",
 *             TransformAmiVersion: "STRING_VALUE",
 *           },
 *         },
 *       },
 *     ],
 *   },
 *   CertifyForMarketplace: true || false,
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateAlgorithmCommand(input);
 * const response = await client.send(command);
 * // { // CreateAlgorithmOutput
 * //   AlgorithmArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateAlgorithmCommandInput - {@link CreateAlgorithmCommandInput}
 * @returns {@link CreateAlgorithmCommandOutput}
 * @see {@link CreateAlgorithmCommandInput} for command's `input` shape.
 * @see {@link CreateAlgorithmCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class CreateAlgorithmCommand extends CreateAlgorithmCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateAlgorithmInput;
            output: CreateAlgorithmOutput;
        };
        sdk: {
            input: CreateAlgorithmCommandInput;
            output: CreateAlgorithmCommandOutput;
        };
    };
}
