import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateLabelingJobRequest, CreateLabelingJobResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateLabelingJobCommand}.
 */
export interface CreateLabelingJobCommandInput extends CreateLabelingJobRequest {
}
/**
 * @public
 *
 * The output of {@link CreateLabelingJobCommand}.
 */
export interface CreateLabelingJobCommandOutput extends CreateLabelingJobResponse, __MetadataBearer {
}
declare const CreateLabelingJobCommand_base: {
    new (input: CreateLabelingJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateLabelingJobCommandInput, CreateLabelingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateLabelingJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateLabelingJobCommandInput, CreateLabelingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a job that uses workers to label the data objects in your input dataset. You can use the labeled data to train machine learning models. </p> <p>You can select your workforce from one of three providers:</p> <ul> <li> <p>A private workforce that you create. It can include employees, contractors, and outside experts. Use a private workforce when want the data to stay within your organization or when a specific set of skills is required.</p> </li> <li> <p>One or more vendors that you select from the Amazon Web Services Marketplace. Vendors provide expertise in specific areas. </p> </li> <li> <p>The Amazon Mechanical Turk workforce. This is the largest workforce, but it should only be used for public data or data that has been stripped of any personally identifiable information.</p> </li> </ul> <p>You can also use <i>automated data labeling</i> to reduce the number of data objects that need to be labeled by a human. Automated data labeling uses <i>active learning</i> to determine if a data object can be labeled by machine or if it needs to be sent to a human worker. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-automated-labeling.html">Using Automated Data Labeling</a>.</p> <p>The data objects to be labeled are contained in an Amazon S3 bucket. You create a <i>manifest file</i> that describes the location of each object. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-data.html">Using Input and Output Data</a>.</p> <p>The output can be used as the manifest file for another labeling job or as training data for your machine learning models.</p> <p>You can use this operation to create a static labeling job or a streaming labeling job. A static labeling job stops if all data objects in the input manifest file identified in <code>ManifestS3Uri</code> have been labeled. A streaming labeling job runs perpetually until it is manually stopped, or remains idle for 10 days. You can send new data objects to an active (<code>InProgress</code>) streaming labeling job in real time. To learn how to create a static labeling job, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-create-labeling-job-api.html">Create a Labeling Job (API) </a> in the Amazon SageMaker Developer Guide. To learn how to create a streaming labeling job, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-streaming-create-job.html">Create a Streaming Labeling Job</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateLabelingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateLabelingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateLabelingJobRequest
 *   LabelingJobName: "STRING_VALUE", // required
 *   LabelAttributeName: "STRING_VALUE", // required
 *   InputConfig: { // LabelingJobInputConfig
 *     DataSource: { // LabelingJobDataSource
 *       S3DataSource: { // LabelingJobS3DataSource
 *         ManifestS3Uri: "STRING_VALUE", // required
 *       },
 *       SnsDataSource: { // LabelingJobSnsDataSource
 *         SnsTopicArn: "STRING_VALUE", // required
 *       },
 *     },
 *     DataAttributes: { // LabelingJobDataAttributes
 *       ContentClassifiers: [ // ContentClassifiers
 *         "FreeOfPersonallyIdentifiableInformation" || "FreeOfAdultContent",
 *       ],
 *     },
 *   },
 *   OutputConfig: { // LabelingJobOutputConfig
 *     S3OutputPath: "STRING_VALUE", // required
 *     KmsKeyId: "STRING_VALUE",
 *     SnsTopicArn: "STRING_VALUE",
 *   },
 *   RoleArn: "STRING_VALUE", // required
 *   LabelCategoryConfigS3Uri: "STRING_VALUE",
 *   StoppingConditions: { // LabelingJobStoppingConditions
 *     MaxHumanLabeledObjectCount: Number("int"),
 *     MaxPercentageOfInputDatasetLabeled: Number("int"),
 *   },
 *   LabelingJobAlgorithmsConfig: { // LabelingJobAlgorithmsConfig
 *     LabelingJobAlgorithmSpecificationArn: "STRING_VALUE", // required
 *     InitialActiveLearningModelArn: "STRING_VALUE",
 *     LabelingJobResourceConfig: { // LabelingJobResourceConfig
 *       VolumeKmsKeyId: "STRING_VALUE",
 *       VpcConfig: { // VpcConfig
 *         SecurityGroupIds: [ // VpcSecurityGroupIds // required
 *           "STRING_VALUE",
 *         ],
 *         Subnets: [ // Subnets // required
 *           "STRING_VALUE",
 *         ],
 *       },
 *     },
 *   },
 *   HumanTaskConfig: { // HumanTaskConfig
 *     WorkteamArn: "STRING_VALUE", // required
 *     UiConfig: { // UiConfig
 *       UiTemplateS3Uri: "STRING_VALUE",
 *       HumanTaskUiArn: "STRING_VALUE",
 *     },
 *     PreHumanTaskLambdaArn: "STRING_VALUE",
 *     TaskKeywords: [ // TaskKeywords
 *       "STRING_VALUE",
 *     ],
 *     TaskTitle: "STRING_VALUE", // required
 *     TaskDescription: "STRING_VALUE", // required
 *     NumberOfHumanWorkersPerDataObject: Number("int"), // required
 *     TaskTimeLimitInSeconds: Number("int"), // required
 *     TaskAvailabilityLifetimeInSeconds: Number("int"),
 *     MaxConcurrentTaskCount: Number("int"),
 *     AnnotationConsolidationConfig: { // AnnotationConsolidationConfig
 *       AnnotationConsolidationLambdaArn: "STRING_VALUE", // required
 *     },
 *     PublicWorkforceTaskPrice: { // PublicWorkforceTaskPrice
 *       AmountInUsd: { // USD
 *         Dollars: Number("int"),
 *         Cents: Number("int"),
 *         TenthFractionsOfACent: Number("int"),
 *       },
 *     },
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateLabelingJobCommand(input);
 * const response = await client.send(command);
 * // { // CreateLabelingJobResponse
 * //   LabelingJobArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateLabelingJobCommandInput - {@link CreateLabelingJobCommandInput}
 * @returns {@link CreateLabelingJobCommandOutput}
 * @see {@link CreateLabelingJobCommandInput} for command's `input` shape.
 * @see {@link CreateLabelingJobCommandOutput} for command's `response` shape.
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
export declare class CreateLabelingJobCommand extends CreateLabelingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateLabelingJobRequest;
            output: CreateLabelingJobResponse;
        };
        sdk: {
            input: CreateLabelingJobCommandInput;
            output: CreateLabelingJobCommandOutput;
        };
    };
}
