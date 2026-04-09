import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeTransformJobRequest, DescribeTransformJobResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeTransformJobCommand}.
 */
export interface DescribeTransformJobCommandInput extends DescribeTransformJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeTransformJobCommand}.
 */
export interface DescribeTransformJobCommandOutput extends DescribeTransformJobResponse, __MetadataBearer {
}
declare const DescribeTransformJobCommand_base: {
    new (input: DescribeTransformJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTransformJobCommandInput, DescribeTransformJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeTransformJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTransformJobCommandInput, DescribeTransformJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about a transform job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeTransformJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeTransformJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeTransformJobRequest
 *   TransformJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeTransformJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeTransformJobResponse
 * //   TransformJobName: "STRING_VALUE", // required
 * //   TransformJobArn: "STRING_VALUE", // required
 * //   TransformJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //   FailureReason: "STRING_VALUE",
 * //   ModelName: "STRING_VALUE", // required
 * //   MaxConcurrentTransforms: Number("int"),
 * //   ModelClientConfig: { // ModelClientConfig
 * //     InvocationsTimeoutInSeconds: Number("int"),
 * //     InvocationsMaxRetries: Number("int"),
 * //   },
 * //   MaxPayloadInMB: Number("int"),
 * //   BatchStrategy: "MultiRecord" || "SingleRecord",
 * //   Environment: { // TransformEnvironmentMap
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   TransformInput: { // TransformInput
 * //     DataSource: { // TransformDataSource
 * //       S3DataSource: { // TransformS3DataSource
 * //         S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile" || "Converse", // required
 * //         S3Uri: "STRING_VALUE", // required
 * //       },
 * //     },
 * //     ContentType: "STRING_VALUE",
 * //     CompressionType: "None" || "Gzip",
 * //     SplitType: "None" || "Line" || "RecordIO" || "TFRecord",
 * //   },
 * //   TransformOutput: { // TransformOutput
 * //     S3OutputPath: "STRING_VALUE", // required
 * //     Accept: "STRING_VALUE",
 * //     AssembleWith: "None" || "Line",
 * //     KmsKeyId: "STRING_VALUE",
 * //   },
 * //   DataCaptureConfig: { // BatchDataCaptureConfig
 * //     DestinationS3Uri: "STRING_VALUE", // required
 * //     KmsKeyId: "STRING_VALUE",
 * //     GenerateInferenceId: true || false,
 * //   },
 * //   TransformResources: { // TransformResources
 * //     InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge", // required
 * //     InstanceCount: Number("int"), // required
 * //     VolumeKmsKeyId: "STRING_VALUE",
 * //     TransformAmiVersion: "STRING_VALUE",
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   TransformStartTime: new Date("TIMESTAMP"),
 * //   TransformEndTime: new Date("TIMESTAMP"),
 * //   LabelingJobArn: "STRING_VALUE",
 * //   AutoMLJobArn: "STRING_VALUE",
 * //   DataProcessing: { // DataProcessing
 * //     InputFilter: "STRING_VALUE",
 * //     OutputFilter: "STRING_VALUE",
 * //     JoinSource: "Input" || "None",
 * //   },
 * //   ExperimentConfig: { // ExperimentConfig
 * //     ExperimentName: "STRING_VALUE",
 * //     TrialName: "STRING_VALUE",
 * //     TrialComponentDisplayName: "STRING_VALUE",
 * //     RunName: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeTransformJobCommandInput - {@link DescribeTransformJobCommandInput}
 * @returns {@link DescribeTransformJobCommandOutput}
 * @see {@link DescribeTransformJobCommandInput} for command's `input` shape.
 * @see {@link DescribeTransformJobCommandOutput} for command's `response` shape.
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
export declare class DescribeTransformJobCommand extends DescribeTransformJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeTransformJobRequest;
            output: DescribeTransformJobResponse;
        };
        sdk: {
            input: DescribeTransformJobCommandInput;
            output: DescribeTransformJobCommandOutput;
        };
    };
}
