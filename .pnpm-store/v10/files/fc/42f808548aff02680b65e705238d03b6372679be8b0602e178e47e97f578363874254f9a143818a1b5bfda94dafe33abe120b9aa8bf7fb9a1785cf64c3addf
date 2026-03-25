import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeModelPackageInput, DescribeModelPackageOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeModelPackageCommand}.
 */
export interface DescribeModelPackageCommandInput extends DescribeModelPackageInput {
}
/**
 * @public
 *
 * The output of {@link DescribeModelPackageCommand}.
 */
export interface DescribeModelPackageCommandOutput extends DescribeModelPackageOutput, __MetadataBearer {
}
declare const DescribeModelPackageCommand_base: {
    new (input: DescribeModelPackageCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelPackageCommandInput, DescribeModelPackageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeModelPackageCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelPackageCommandInput, DescribeModelPackageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a description of the specified model package, which is used to create SageMaker models or list them on Amazon Web Services Marketplace.</p> <important> <p>If you provided a KMS Key ID when you created your model package, you will see the <a href="https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html">KMS Decrypt</a> API call in your CloudTrail logs when you use this API.</p> </important> <p>To create models in SageMaker, buyers can subscribe to model packages listed on Amazon Web Services Marketplace.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeModelPackageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeModelPackageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeModelPackageInput
 *   ModelPackageName: "STRING_VALUE", // required
 * };
 * const command = new DescribeModelPackageCommand(input);
 * const response = await client.send(command);
 * // { // DescribeModelPackageOutput
 * //   ModelPackageName: "STRING_VALUE", // required
 * //   ModelPackageGroupName: "STRING_VALUE",
 * //   ModelPackageVersion: Number("int"),
 * //   ModelPackageArn: "STRING_VALUE", // required
 * //   ModelPackageDescription: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   InferenceSpecification: { // InferenceSpecification
 * //     Containers: [ // ModelPackageContainerDefinitionList // required
 * //       { // ModelPackageContainerDefinition
 * //         ContainerHostname: "STRING_VALUE",
 * //         Image: "STRING_VALUE", // required
 * //         ImageDigest: "STRING_VALUE",
 * //         ModelDataUrl: "STRING_VALUE",
 * //         ModelDataSource: { // ModelDataSource
 * //           S3DataSource: { // S3ModelDataSource
 * //             S3Uri: "STRING_VALUE", // required
 * //             S3DataType: "S3Prefix" || "S3Object", // required
 * //             CompressionType: "None" || "Gzip", // required
 * //             ModelAccessConfig: { // ModelAccessConfig
 * //               AcceptEula: true || false, // required
 * //             },
 * //             HubAccessConfig: { // InferenceHubAccessConfig
 * //               HubContentArn: "STRING_VALUE", // required
 * //             },
 * //             ManifestS3Uri: "STRING_VALUE",
 * //             ETag: "STRING_VALUE",
 * //             ManifestEtag: "STRING_VALUE",
 * //           },
 * //         },
 * //         ProductId: "STRING_VALUE",
 * //         Environment: { // EnvironmentMap
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //         ModelInput: { // ModelInput
 * //           DataInputConfig: "STRING_VALUE", // required
 * //         },
 * //         Framework: "STRING_VALUE",
 * //         FrameworkVersion: "STRING_VALUE",
 * //         NearestModelName: "STRING_VALUE",
 * //         AdditionalS3DataSource: { // AdditionalS3DataSource
 * //           S3DataType: "S3Object" || "S3Prefix", // required
 * //           S3Uri: "STRING_VALUE", // required
 * //           CompressionType: "None" || "Gzip",
 * //           ETag: "STRING_VALUE",
 * //         },
 * //         ModelDataETag: "STRING_VALUE",
 * //       },
 * //     ],
 * //     SupportedTransformInstanceTypes: [ // TransformInstanceTypes
 * //       "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge",
 * //     ],
 * //     SupportedRealtimeInferenceInstanceTypes: [ // RealtimeInferenceInstanceTypes
 * //       "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //     ],
 * //     SupportedContentTypes: [ // ContentTypes
 * //       "STRING_VALUE",
 * //     ],
 * //     SupportedResponseMIMETypes: [ // ResponseMIMETypes
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * //   SourceAlgorithmSpecification: { // SourceAlgorithmSpecification
 * //     SourceAlgorithms: [ // SourceAlgorithmList // required
 * //       { // SourceAlgorithm
 * //         ModelDataUrl: "STRING_VALUE",
 * //         ModelDataSource: {
 * //           S3DataSource: {
 * //             S3Uri: "STRING_VALUE", // required
 * //             S3DataType: "S3Prefix" || "S3Object", // required
 * //             CompressionType: "None" || "Gzip", // required
 * //             ModelAccessConfig: {
 * //               AcceptEula: true || false, // required
 * //             },
 * //             HubAccessConfig: {
 * //               HubContentArn: "STRING_VALUE", // required
 * //             },
 * //             ManifestS3Uri: "STRING_VALUE",
 * //             ETag: "STRING_VALUE",
 * //             ManifestEtag: "STRING_VALUE",
 * //           },
 * //         },
 * //         ModelDataETag: "STRING_VALUE",
 * //         AlgorithmName: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //   },
 * //   ValidationSpecification: { // ModelPackageValidationSpecification
 * //     ValidationRole: "STRING_VALUE", // required
 * //     ValidationProfiles: [ // ModelPackageValidationProfiles // required
 * //       { // ModelPackageValidationProfile
 * //         ProfileName: "STRING_VALUE", // required
 * //         TransformJobDefinition: { // TransformJobDefinition
 * //           MaxConcurrentTransforms: Number("int"),
 * //           MaxPayloadInMB: Number("int"),
 * //           BatchStrategy: "MultiRecord" || "SingleRecord",
 * //           Environment: { // TransformEnvironmentMap
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //           TransformInput: { // TransformInput
 * //             DataSource: { // TransformDataSource
 * //               S3DataSource: { // TransformS3DataSource
 * //                 S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //                 S3Uri: "STRING_VALUE", // required
 * //               },
 * //             },
 * //             ContentType: "STRING_VALUE",
 * //             CompressionType: "None" || "Gzip",
 * //             SplitType: "None" || "Line" || "RecordIO" || "TFRecord",
 * //           },
 * //           TransformOutput: { // TransformOutput
 * //             S3OutputPath: "STRING_VALUE", // required
 * //             Accept: "STRING_VALUE",
 * //             AssembleWith: "None" || "Line",
 * //             KmsKeyId: "STRING_VALUE",
 * //           },
 * //           TransformResources: { // TransformResources
 * //             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge", // required
 * //             InstanceCount: Number("int"), // required
 * //             VolumeKmsKeyId: "STRING_VALUE",
 * //             TransformAmiVersion: "STRING_VALUE",
 * //           },
 * //         },
 * //       },
 * //     ],
 * //   },
 * //   ModelPackageStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting", // required
 * //   ModelPackageStatusDetails: { // ModelPackageStatusDetails
 * //     ValidationStatuses: [ // ModelPackageStatusItemList // required
 * //       { // ModelPackageStatusItem
 * //         Name: "STRING_VALUE", // required
 * //         Status: "NotStarted" || "InProgress" || "Completed" || "Failed", // required
 * //         FailureReason: "STRING_VALUE",
 * //       },
 * //     ],
 * //     ImageScanStatuses: [
 * //       {
 * //         Name: "STRING_VALUE", // required
 * //         Status: "NotStarted" || "InProgress" || "Completed" || "Failed", // required
 * //         FailureReason: "STRING_VALUE",
 * //       },
 * //     ],
 * //   },
 * //   CertifyForMarketplace: true || false,
 * //   ModelApprovalStatus: "Approved" || "Rejected" || "PendingManualApproval",
 * //   CreatedBy: { // UserContext
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: { // IamIdentity
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * //   MetadataProperties: { // MetadataProperties
 * //     CommitId: "STRING_VALUE",
 * //     Repository: "STRING_VALUE",
 * //     GeneratedBy: "STRING_VALUE",
 * //     ProjectId: "STRING_VALUE",
 * //   },
 * //   ModelMetrics: { // ModelMetrics
 * //     ModelQuality: { // ModelQuality
 * //       Statistics: { // MetricsSource
 * //         ContentType: "STRING_VALUE", // required
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //       Constraints: {
 * //         ContentType: "STRING_VALUE", // required
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //     },
 * //     ModelDataQuality: { // ModelDataQuality
 * //       Statistics: {
 * //         ContentType: "STRING_VALUE", // required
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //       Constraints: {
 * //         ContentType: "STRING_VALUE", // required
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //     },
 * //     Bias: { // Bias
 * //       Report: {
 * //         ContentType: "STRING_VALUE", // required
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //       PreTrainingReport: "<MetricsSource>",
 * //       PostTrainingReport: "<MetricsSource>",
 * //     },
 * //     Explainability: { // Explainability
 * //       Report: "<MetricsSource>",
 * //     },
 * //   },
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   LastModifiedBy: {
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: {
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * //   ApprovalDescription: "STRING_VALUE",
 * //   Domain: "STRING_VALUE",
 * //   Task: "STRING_VALUE",
 * //   SamplePayloadUrl: "STRING_VALUE",
 * //   CustomerMetadataProperties: { // CustomerMetadataMap
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   DriftCheckBaselines: { // DriftCheckBaselines
 * //     Bias: { // DriftCheckBias
 * //       ConfigFile: { // FileSource
 * //         ContentType: "STRING_VALUE",
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //       PreTrainingConstraints: "<MetricsSource>",
 * //       PostTrainingConstraints: "<MetricsSource>",
 * //     },
 * //     Explainability: { // DriftCheckExplainability
 * //       Constraints: "<MetricsSource>",
 * //       ConfigFile: {
 * //         ContentType: "STRING_VALUE",
 * //         ContentDigest: "STRING_VALUE",
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //     },
 * //     ModelQuality: { // DriftCheckModelQuality
 * //       Statistics: "<MetricsSource>",
 * //       Constraints: "<MetricsSource>",
 * //     },
 * //     ModelDataQuality: { // DriftCheckModelDataQuality
 * //       Statistics: "<MetricsSource>",
 * //       Constraints: "<MetricsSource>",
 * //     },
 * //   },
 * //   AdditionalInferenceSpecifications: [ // AdditionalInferenceSpecifications
 * //     { // AdditionalInferenceSpecificationDefinition
 * //       Name: "STRING_VALUE", // required
 * //       Description: "STRING_VALUE",
 * //       Containers: [ // required
 * //         {
 * //           ContainerHostname: "STRING_VALUE",
 * //           Image: "STRING_VALUE", // required
 * //           ImageDigest: "STRING_VALUE",
 * //           ModelDataUrl: "STRING_VALUE",
 * //           ModelDataSource: {
 * //             S3DataSource: {
 * //               S3Uri: "STRING_VALUE", // required
 * //               S3DataType: "S3Prefix" || "S3Object", // required
 * //               CompressionType: "None" || "Gzip", // required
 * //               ModelAccessConfig: {
 * //                 AcceptEula: true || false, // required
 * //               },
 * //               HubAccessConfig: {
 * //                 HubContentArn: "STRING_VALUE", // required
 * //               },
 * //               ManifestS3Uri: "STRING_VALUE",
 * //               ETag: "STRING_VALUE",
 * //               ManifestEtag: "STRING_VALUE",
 * //             },
 * //           },
 * //           ProductId: "STRING_VALUE",
 * //           Environment: {
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //           ModelInput: {
 * //             DataInputConfig: "STRING_VALUE", // required
 * //           },
 * //           Framework: "STRING_VALUE",
 * //           FrameworkVersion: "STRING_VALUE",
 * //           NearestModelName: "STRING_VALUE",
 * //           AdditionalS3DataSource: {
 * //             S3DataType: "S3Object" || "S3Prefix", // required
 * //             S3Uri: "STRING_VALUE", // required
 * //             CompressionType: "None" || "Gzip",
 * //             ETag: "STRING_VALUE",
 * //           },
 * //           ModelDataETag: "STRING_VALUE",
 * //         },
 * //       ],
 * //       SupportedTransformInstanceTypes: [
 * //         "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge",
 * //       ],
 * //       SupportedRealtimeInferenceInstanceTypes: [
 * //         "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //       ],
 * //       SupportedContentTypes: [
 * //         "STRING_VALUE",
 * //       ],
 * //       SupportedResponseMIMETypes: [
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //   ],
 * //   SkipModelValidation: "All" || "None",
 * //   SourceUri: "STRING_VALUE",
 * //   SecurityConfig: { // ModelPackageSecurityConfig
 * //     KmsKeyId: "STRING_VALUE", // required
 * //   },
 * //   ModelCard: { // ModelPackageModelCard
 * //     ModelCardContent: "STRING_VALUE",
 * //     ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 * //   },
 * //   ModelLifeCycle: { // ModelLifeCycle
 * //     Stage: "STRING_VALUE", // required
 * //     StageStatus: "STRING_VALUE", // required
 * //     StageDescription: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeModelPackageCommandInput - {@link DescribeModelPackageCommandInput}
 * @returns {@link DescribeModelPackageCommandOutput}
 * @see {@link DescribeModelPackageCommandInput} for command's `input` shape.
 * @see {@link DescribeModelPackageCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeModelPackageCommand extends DescribeModelPackageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeModelPackageInput;
            output: DescribeModelPackageOutput;
        };
        sdk: {
            input: DescribeModelPackageCommandInput;
            output: DescribeModelPackageCommandOutput;
        };
    };
}
