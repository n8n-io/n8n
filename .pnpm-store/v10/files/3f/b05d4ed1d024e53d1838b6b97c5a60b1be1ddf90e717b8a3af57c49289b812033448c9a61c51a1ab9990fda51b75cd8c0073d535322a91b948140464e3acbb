import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateModelInput, CreateModelOutput } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateModelCommand}.
 */
export interface CreateModelCommandInput extends CreateModelInput {
}
/**
 * @public
 *
 * The output of {@link CreateModelCommand}.
 */
export interface CreateModelCommandOutput extends CreateModelOutput, __MetadataBearer {
}
declare const CreateModelCommand_base: {
    new (input: CreateModelCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelCommandInput, CreateModelCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateModelCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelCommandInput, CreateModelCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a model in SageMaker. In the request, you name the model and describe a primary container. For the primary container, you specify the Docker image that contains inference code, artifacts (from prior training), and a custom environment map that the inference code uses when you deploy the model for predictions.</p> <p>Use this API to create a model if you want to use SageMaker hosting services or run a batch transform job.</p> <p>To host your model, you create an endpoint configuration with the <code>CreateEndpointConfig</code> API, and then create an endpoint with the <code>CreateEndpoint</code> API. SageMaker then deploys all of the containers that you defined for the model in the hosting environment. </p> <p>To run a batch transform using your model, you start a job with the <code>CreateTransformJob</code> API. SageMaker uses your model and your dataset to get inferences which are then saved to a specified S3 location.</p> <p>In the request, you also provide an IAM role that SageMaker can assume to access model artifacts and docker image for deployment on ML compute hosting instances or for batch transform jobs. In addition, you also use the IAM role to manage permissions the inference code needs. For example, if the inference code access any other Amazon Web Services resources, you grant necessary permissions via this role.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateModelCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateModelCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateModelInput
 *   ModelName: "STRING_VALUE", // required
 *   PrimaryContainer: { // ContainerDefinition
 *     ContainerHostname: "STRING_VALUE",
 *     Image: "STRING_VALUE",
 *     ImageConfig: { // ImageConfig
 *       RepositoryAccessMode: "Platform" || "Vpc", // required
 *       RepositoryAuthConfig: { // RepositoryAuthConfig
 *         RepositoryCredentialsProviderArn: "STRING_VALUE", // required
 *       },
 *     },
 *     Mode: "SingleModel" || "MultiModel",
 *     ModelDataUrl: "STRING_VALUE",
 *     ModelDataSource: { // ModelDataSource
 *       S3DataSource: { // S3ModelDataSource
 *         S3Uri: "STRING_VALUE", // required
 *         S3DataType: "S3Prefix" || "S3Object", // required
 *         CompressionType: "None" || "Gzip", // required
 *         ModelAccessConfig: { // ModelAccessConfig
 *           AcceptEula: true || false, // required
 *         },
 *         HubAccessConfig: { // InferenceHubAccessConfig
 *           HubContentArn: "STRING_VALUE", // required
 *         },
 *         ManifestS3Uri: "STRING_VALUE",
 *         ETag: "STRING_VALUE",
 *         ManifestEtag: "STRING_VALUE",
 *       },
 *     },
 *     AdditionalModelDataSources: [ // AdditionalModelDataSources
 *       { // AdditionalModelDataSource
 *         ChannelName: "STRING_VALUE", // required
 *         S3DataSource: {
 *           S3Uri: "STRING_VALUE", // required
 *           S3DataType: "S3Prefix" || "S3Object", // required
 *           CompressionType: "None" || "Gzip", // required
 *           ModelAccessConfig: {
 *             AcceptEula: true || false, // required
 *           },
 *           HubAccessConfig: {
 *             HubContentArn: "STRING_VALUE", // required
 *           },
 *           ManifestS3Uri: "STRING_VALUE",
 *           ETag: "STRING_VALUE",
 *           ManifestEtag: "STRING_VALUE",
 *         },
 *       },
 *     ],
 *     Environment: { // EnvironmentMap
 *       "<keys>": "STRING_VALUE",
 *     },
 *     ModelPackageName: "STRING_VALUE",
 *     InferenceSpecificationName: "STRING_VALUE",
 *     MultiModelConfig: { // MultiModelConfig
 *       ModelCacheSetting: "Enabled" || "Disabled",
 *     },
 *   },
 *   Containers: [ // ContainerDefinitionList
 *     {
 *       ContainerHostname: "STRING_VALUE",
 *       Image: "STRING_VALUE",
 *       ImageConfig: {
 *         RepositoryAccessMode: "Platform" || "Vpc", // required
 *         RepositoryAuthConfig: {
 *           RepositoryCredentialsProviderArn: "STRING_VALUE", // required
 *         },
 *       },
 *       Mode: "SingleModel" || "MultiModel",
 *       ModelDataUrl: "STRING_VALUE",
 *       ModelDataSource: {
 *         S3DataSource: {
 *           S3Uri: "STRING_VALUE", // required
 *           S3DataType: "S3Prefix" || "S3Object", // required
 *           CompressionType: "None" || "Gzip", // required
 *           ModelAccessConfig: {
 *             AcceptEula: true || false, // required
 *           },
 *           HubAccessConfig: {
 *             HubContentArn: "STRING_VALUE", // required
 *           },
 *           ManifestS3Uri: "STRING_VALUE",
 *           ETag: "STRING_VALUE",
 *           ManifestEtag: "STRING_VALUE",
 *         },
 *       },
 *       AdditionalModelDataSources: [
 *         {
 *           ChannelName: "STRING_VALUE", // required
 *           S3DataSource: "<S3ModelDataSource>", // required
 *         },
 *       ],
 *       Environment: {
 *         "<keys>": "STRING_VALUE",
 *       },
 *       ModelPackageName: "STRING_VALUE",
 *       InferenceSpecificationName: "STRING_VALUE",
 *       MultiModelConfig: {
 *         ModelCacheSetting: "Enabled" || "Disabled",
 *       },
 *     },
 *   ],
 *   InferenceExecutionConfig: { // InferenceExecutionConfig
 *     Mode: "Serial" || "Direct", // required
 *   },
 *   ExecutionRoleArn: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   VpcConfig: { // VpcConfig
 *     SecurityGroupIds: [ // VpcSecurityGroupIds // required
 *       "STRING_VALUE",
 *     ],
 *     Subnets: [ // Subnets // required
 *       "STRING_VALUE",
 *     ],
 *   },
 *   EnableNetworkIsolation: true || false,
 * };
 * const command = new CreateModelCommand(input);
 * const response = await client.send(command);
 * // { // CreateModelOutput
 * //   ModelArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateModelCommandInput - {@link CreateModelCommandInput}
 * @returns {@link CreateModelCommandOutput}
 * @see {@link CreateModelCommandInput} for command's `input` shape.
 * @see {@link CreateModelCommandOutput} for command's `response` shape.
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
export declare class CreateModelCommand extends CreateModelCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateModelInput;
            output: CreateModelOutput;
        };
        sdk: {
            input: CreateModelCommandInput;
            output: CreateModelCommandOutput;
        };
    };
}
