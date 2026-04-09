import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateDomainRequest, CreateDomainResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateDomainCommand}.
 */
export interface CreateDomainCommandInput extends CreateDomainRequest {
}
/**
 * @public
 *
 * The output of {@link CreateDomainCommand}.
 */
export interface CreateDomainCommandOutput extends CreateDomainResponse, __MetadataBearer {
}
declare const CreateDomainCommand_base: {
    new (input: CreateDomainCommandInput): import("@smithy/smithy-client").CommandImpl<CreateDomainCommandInput, CreateDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateDomainCommandInput): import("@smithy/smithy-client").CommandImpl<CreateDomainCommandInput, CreateDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a <code>Domain</code>. A domain consists of an associated Amazon Elastic File System volume, a list of authorized users, and a variety of security, application, policy, and Amazon Virtual Private Cloud (VPC) configurations. Users within a domain can share notebook files and other artifacts with each other.</p> <p> <b>EFS storage</b> </p> <p>When a domain is created, an EFS volume is created for use by all of the users within the domain. Each user receives a private home directory within the EFS volume for notebooks, Git repositories, and data files.</p> <p>SageMaker AI uses the Amazon Web Services Key Management Service (Amazon Web Services KMS) to encrypt the EFS volume attached to the domain with an Amazon Web Services managed key by default. For more control, you can specify a customer managed key. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/encryption-at-rest.html">Protect Data at Rest Using Encryption</a>.</p> <p> <b>VPC configuration</b> </p> <p>All traffic between the domain and the Amazon EFS volume is through the specified VPC and subnets. For other traffic, you can specify the <code>AppNetworkAccessType</code> parameter. <code>AppNetworkAccessType</code> corresponds to the network access type that you choose when you onboard to the domain. The following options are available:</p> <ul> <li> <p> <code>PublicInternetOnly</code> - Non-EFS traffic goes through a VPC managed by Amazon SageMaker AI, which allows internet access. This is the default value.</p> </li> <li> <p> <code>VpcOnly</code> - All traffic is through the specified VPC and subnets. Internet access is disabled by default. To allow internet access, you must specify a NAT gateway.</p> <p>When internet access is disabled, you won't be able to run a Amazon SageMaker AI Studio notebook or to train or host models unless your VPC has an interface endpoint to the SageMaker AI API and runtime or a NAT gateway and your security groups allow outbound connections.</p> </li> </ul> <important> <p>NFS traffic over TCP on port 2049 needs to be allowed in both inbound and outbound rules in order to launch a Amazon SageMaker AI Studio app successfully.</p> </important> <p>For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/studio-notebooks-and-internet-access.html">Connect Amazon SageMaker AI Studio Notebooks to Resources in a VPC</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateDomainCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateDomainCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateDomainRequest
 *   DomainName: "STRING_VALUE", // required
 *   AuthMode: "SSO" || "IAM", // required
 *   DefaultUserSettings: { // UserSettings
 *     ExecutionRole: "STRING_VALUE",
 *     SecurityGroups: [ // SecurityGroupIds
 *       "STRING_VALUE",
 *     ],
 *     SharingSettings: { // SharingSettings
 *       NotebookOutputOption: "Allowed" || "Disabled",
 *       S3OutputPath: "STRING_VALUE",
 *       S3KmsKeyId: "STRING_VALUE",
 *     },
 *     JupyterServerAppSettings: { // JupyterServerAppSettings
 *       DefaultResourceSpec: { // ResourceSpec
 *         SageMakerImageArn: "STRING_VALUE",
 *         SageMakerImageVersionArn: "STRING_VALUE",
 *         SageMakerImageVersionAlias: "STRING_VALUE",
 *         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *         LifecycleConfigArn: "STRING_VALUE",
 *       },
 *       LifecycleConfigArns: [ // LifecycleConfigArns
 *         "STRING_VALUE",
 *       ],
 *       CodeRepositories: [ // CodeRepositories
 *         { // CodeRepository
 *           RepositoryUrl: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *     KernelGatewayAppSettings: { // KernelGatewayAppSettings
 *       DefaultResourceSpec: {
 *         SageMakerImageArn: "STRING_VALUE",
 *         SageMakerImageVersionArn: "STRING_VALUE",
 *         SageMakerImageVersionAlias: "STRING_VALUE",
 *         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *         LifecycleConfigArn: "STRING_VALUE",
 *       },
 *       CustomImages: [ // CustomImages
 *         { // CustomImage
 *           ImageName: "STRING_VALUE", // required
 *           ImageVersionNumber: Number("int"),
 *           AppImageConfigName: "STRING_VALUE", // required
 *         },
 *       ],
 *       LifecycleConfigArns: [
 *         "STRING_VALUE",
 *       ],
 *     },
 *     TensorBoardAppSettings: { // TensorBoardAppSettings
 *       DefaultResourceSpec: {
 *         SageMakerImageArn: "STRING_VALUE",
 *         SageMakerImageVersionArn: "STRING_VALUE",
 *         SageMakerImageVersionAlias: "STRING_VALUE",
 *         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *         LifecycleConfigArn: "STRING_VALUE",
 *       },
 *     },
 *     RStudioServerProAppSettings: { // RStudioServerProAppSettings
 *       AccessStatus: "ENABLED" || "DISABLED",
 *       UserGroup: "R_STUDIO_ADMIN" || "R_STUDIO_USER",
 *     },
 *     RSessionAppSettings: { // RSessionAppSettings
 *       DefaultResourceSpec: {
 *         SageMakerImageArn: "STRING_VALUE",
 *         SageMakerImageVersionArn: "STRING_VALUE",
 *         SageMakerImageVersionAlias: "STRING_VALUE",
 *         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *         LifecycleConfigArn: "STRING_VALUE",
 *       },
 *       CustomImages: [
 *         {
 *           ImageName: "STRING_VALUE", // required
 *           ImageVersionNumber: Number("int"),
 *           AppImageConfigName: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *     CanvasAppSettings: { // CanvasAppSettings
 *       TimeSeriesForecastingSettings: { // TimeSeriesForecastingSettings
 *         Status: "ENABLED" || "DISABLED",
 *         AmazonForecastRoleArn: "STRING_VALUE",
 *       },
 *       ModelRegisterSettings: { // ModelRegisterSettings
 *         Status: "ENABLED" || "DISABLED",
 *         CrossAccountModelRegisterRoleArn: "STRING_VALUE",
 *       },
 *       WorkspaceSettings: { // WorkspaceSettings
 *         S3ArtifactPath: "STRING_VALUE",
 *         S3KmsKeyId: "STRING_VALUE",
 *       },
 *       IdentityProviderOAuthSettings: [ // IdentityProviderOAuthSettings
 *         { // IdentityProviderOAuthSetting
 *           DataSourceName: "SalesforceGenie" || "Snowflake",
 *           Status: "ENABLED" || "DISABLED",
 *           SecretArn: "STRING_VALUE",
 *         },
 *       ],
 *       DirectDeploySettings: { // DirectDeploySettings
 *         Status: "ENABLED" || "DISABLED",
 *       },
 *       KendraSettings: { // KendraSettings
 *         Status: "ENABLED" || "DISABLED",
 *       },
 *       GenerativeAiSettings: { // GenerativeAiSettings
 *         AmazonBedrockRoleArn: "STRING_VALUE",
 *       },
 *       EmrServerlessSettings: { // EmrServerlessSettings
 *         ExecutionRoleArn: "STRING_VALUE",
 *         Status: "ENABLED" || "DISABLED",
 *       },
 *     },
 *     CodeEditorAppSettings: { // CodeEditorAppSettings
 *       DefaultResourceSpec: {
 *         SageMakerImageArn: "STRING_VALUE",
 *         SageMakerImageVersionArn: "STRING_VALUE",
 *         SageMakerImageVersionAlias: "STRING_VALUE",
 *         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *         LifecycleConfigArn: "STRING_VALUE",
 *       },
 *       CustomImages: [
 *         {
 *           ImageName: "STRING_VALUE", // required
 *           ImageVersionNumber: Number("int"),
 *           AppImageConfigName: "STRING_VALUE", // required
 *         },
 *       ],
 *       LifecycleConfigArns: [
 *         "STRING_VALUE",
 *       ],
 *       AppLifecycleManagement: { // AppLifecycleManagement
 *         IdleSettings: { // IdleSettings
 *           LifecycleManagement: "ENABLED" || "DISABLED",
 *           IdleTimeoutInMinutes: Number("int"),
 *           MinIdleTimeoutInMinutes: Number("int"),
 *           MaxIdleTimeoutInMinutes: Number("int"),
 *         },
 *       },
 *       BuiltInLifecycleConfigArn: "STRING_VALUE",
 *     },
 *     JupyterLabAppSettings: { // JupyterLabAppSettings
 *       DefaultResourceSpec: "<ResourceSpec>",
 *       CustomImages: [
 *         {
 *           ImageName: "STRING_VALUE", // required
 *           ImageVersionNumber: Number("int"),
 *           AppImageConfigName: "STRING_VALUE", // required
 *         },
 *       ],
 *       LifecycleConfigArns: [
 *         "STRING_VALUE",
 *       ],
 *       CodeRepositories: [
 *         {
 *           RepositoryUrl: "STRING_VALUE", // required
 *         },
 *       ],
 *       AppLifecycleManagement: {
 *         IdleSettings: {
 *           LifecycleManagement: "ENABLED" || "DISABLED",
 *           IdleTimeoutInMinutes: Number("int"),
 *           MinIdleTimeoutInMinutes: Number("int"),
 *           MaxIdleTimeoutInMinutes: Number("int"),
 *         },
 *       },
 *       EmrSettings: { // EmrSettings
 *         AssumableRoleArns: [ // AssumableRoleArns
 *           "STRING_VALUE",
 *         ],
 *         ExecutionRoleArns: [ // ExecutionRoleArns
 *           "STRING_VALUE",
 *         ],
 *       },
 *       BuiltInLifecycleConfigArn: "STRING_VALUE",
 *     },
 *     SpaceStorageSettings: { // DefaultSpaceStorageSettings
 *       DefaultEbsStorageSettings: { // DefaultEbsStorageSettings
 *         DefaultEbsVolumeSizeInGb: Number("int"), // required
 *         MaximumEbsVolumeSizeInGb: Number("int"), // required
 *       },
 *     },
 *     DefaultLandingUri: "STRING_VALUE",
 *     StudioWebPortal: "ENABLED" || "DISABLED",
 *     CustomPosixUserConfig: { // CustomPosixUserConfig
 *       Uid: Number("long"), // required
 *       Gid: Number("long"), // required
 *     },
 *     CustomFileSystemConfigs: [ // CustomFileSystemConfigs
 *       { // CustomFileSystemConfig Union: only one key present
 *         EFSFileSystemConfig: { // EFSFileSystemConfig
 *           FileSystemId: "STRING_VALUE", // required
 *           FileSystemPath: "STRING_VALUE",
 *         },
 *         FSxLustreFileSystemConfig: { // FSxLustreFileSystemConfig
 *           FileSystemId: "STRING_VALUE", // required
 *           FileSystemPath: "STRING_VALUE",
 *         },
 *         S3FileSystemConfig: { // S3FileSystemConfig
 *           MountPath: "STRING_VALUE",
 *           S3Uri: "STRING_VALUE", // required
 *         },
 *       },
 *     ],
 *     StudioWebPortalSettings: { // StudioWebPortalSettings
 *       HiddenMlTools: [ // HiddenMlToolsList
 *         "DataWrangler" || "FeatureStore" || "EmrClusters" || "AutoMl" || "Experiments" || "Training" || "ModelEvaluation" || "Pipelines" || "Models" || "JumpStart" || "InferenceRecommender" || "Endpoints" || "Projects" || "InferenceOptimization" || "PerformanceEvaluation" || "LakeraGuard" || "Comet" || "DeepchecksLLMEvaluation" || "Fiddler" || "HyperPodClusters" || "RunningInstances" || "Datasets" || "Evaluators",
 *       ],
 *       HiddenAppTypes: [ // HiddenAppTypesList
 *         "JupyterServer" || "KernelGateway" || "DetailedProfiler" || "TensorBoard" || "CodeEditor" || "JupyterLab" || "RStudioServerPro" || "RSessionGateway" || "Canvas",
 *       ],
 *       HiddenInstanceTypes: [ // HiddenInstanceTypesList
 *         "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 *       ],
 *       HiddenSageMakerImageVersionAliases: [ // HiddenSageMakerImageVersionAliasesList
 *         { // HiddenSageMakerImage
 *           SageMakerImageName: "sagemaker_distribution",
 *           VersionAliases: [ // VersionAliasesList
 *             "STRING_VALUE",
 *           ],
 *         },
 *       ],
 *     },
 *     AutoMountHomeEFS: "Enabled" || "Disabled" || "DefaultAsDomain",
 *   },
 *   DomainSettings: { // DomainSettings
 *     SecurityGroupIds: [ // DomainSecurityGroupIds
 *       "STRING_VALUE",
 *     ],
 *     RStudioServerProDomainSettings: { // RStudioServerProDomainSettings
 *       DomainExecutionRoleArn: "STRING_VALUE", // required
 *       RStudioConnectUrl: "STRING_VALUE",
 *       RStudioPackageManagerUrl: "STRING_VALUE",
 *       DefaultResourceSpec: "<ResourceSpec>",
 *     },
 *     ExecutionRoleIdentityConfig: "USER_PROFILE_NAME" || "DISABLED",
 *     TrustedIdentityPropagationSettings: { // TrustedIdentityPropagationSettings
 *       Status: "ENABLED" || "DISABLED", // required
 *     },
 *     DockerSettings: { // DockerSettings
 *       EnableDockerAccess: "ENABLED" || "DISABLED",
 *       VpcOnlyTrustedAccounts: [ // VpcOnlyTrustedAccounts
 *         "STRING_VALUE",
 *       ],
 *       RootlessDocker: "ENABLED" || "DISABLED",
 *     },
 *     AmazonQSettings: { // AmazonQSettings
 *       Status: "ENABLED" || "DISABLED",
 *       QProfileArn: "STRING_VALUE",
 *     },
 *     UnifiedStudioSettings: { // UnifiedStudioSettings
 *       StudioWebPortalAccess: "ENABLED" || "DISABLED",
 *       DomainAccountId: "STRING_VALUE",
 *       DomainRegion: "STRING_VALUE",
 *       DomainId: "STRING_VALUE",
 *       ProjectId: "STRING_VALUE",
 *       EnvironmentId: "STRING_VALUE",
 *       ProjectS3Path: "STRING_VALUE",
 *       SingleSignOnApplicationArn: "STRING_VALUE",
 *     },
 *     IpAddressType: "ipv4" || "dualstack",
 *   },
 *   SubnetIds: [ // Subnets
 *     "STRING_VALUE",
 *   ],
 *   VpcId: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   AppNetworkAccessType: "PublicInternetOnly" || "VpcOnly",
 *   HomeEfsFileSystemKmsKeyId: "STRING_VALUE",
 *   KmsKeyId: "STRING_VALUE",
 *   AppSecurityGroupManagement: "Service" || "Customer",
 *   TagPropagation: "ENABLED" || "DISABLED",
 *   DefaultSpaceSettings: { // DefaultSpaceSettings
 *     ExecutionRole: "STRING_VALUE",
 *     SecurityGroups: [
 *       "STRING_VALUE",
 *     ],
 *     JupyterServerAppSettings: {
 *       DefaultResourceSpec: "<ResourceSpec>",
 *       LifecycleConfigArns: [
 *         "STRING_VALUE",
 *       ],
 *       CodeRepositories: [
 *         {
 *           RepositoryUrl: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *     KernelGatewayAppSettings: {
 *       DefaultResourceSpec: "<ResourceSpec>",
 *       CustomImages: [
 *         {
 *           ImageName: "STRING_VALUE", // required
 *           ImageVersionNumber: Number("int"),
 *           AppImageConfigName: "STRING_VALUE", // required
 *         },
 *       ],
 *       LifecycleConfigArns: "<LifecycleConfigArns>",
 *     },
 *     JupyterLabAppSettings: {
 *       DefaultResourceSpec: "<ResourceSpec>",
 *       CustomImages: "<CustomImages>",
 *       LifecycleConfigArns: "<LifecycleConfigArns>",
 *       CodeRepositories: [
 *         {
 *           RepositoryUrl: "STRING_VALUE", // required
 *         },
 *       ],
 *       AppLifecycleManagement: {
 *         IdleSettings: {
 *           LifecycleManagement: "ENABLED" || "DISABLED",
 *           IdleTimeoutInMinutes: Number("int"),
 *           MinIdleTimeoutInMinutes: Number("int"),
 *           MaxIdleTimeoutInMinutes: Number("int"),
 *         },
 *       },
 *       EmrSettings: {
 *         AssumableRoleArns: [
 *           "STRING_VALUE",
 *         ],
 *         ExecutionRoleArns: [
 *           "STRING_VALUE",
 *         ],
 *       },
 *       BuiltInLifecycleConfigArn: "STRING_VALUE",
 *     },
 *     SpaceStorageSettings: {
 *       DefaultEbsStorageSettings: {
 *         DefaultEbsVolumeSizeInGb: Number("int"), // required
 *         MaximumEbsVolumeSizeInGb: Number("int"), // required
 *       },
 *     },
 *     CustomPosixUserConfig: {
 *       Uid: Number("long"), // required
 *       Gid: Number("long"), // required
 *     },
 *     CustomFileSystemConfigs: [
 *       {//  Union: only one key present
 *         EFSFileSystemConfig: {
 *           FileSystemId: "STRING_VALUE", // required
 *           FileSystemPath: "STRING_VALUE",
 *         },
 *         FSxLustreFileSystemConfig: {
 *           FileSystemId: "STRING_VALUE", // required
 *           FileSystemPath: "STRING_VALUE",
 *         },
 *         S3FileSystemConfig: {
 *           MountPath: "STRING_VALUE",
 *           S3Uri: "STRING_VALUE", // required
 *         },
 *       },
 *     ],
 *   },
 * };
 * const command = new CreateDomainCommand(input);
 * const response = await client.send(command);
 * // { // CreateDomainResponse
 * //   DomainArn: "STRING_VALUE",
 * //   DomainId: "STRING_VALUE",
 * //   Url: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateDomainCommandInput - {@link CreateDomainCommandInput}
 * @returns {@link CreateDomainCommandOutput}
 * @see {@link CreateDomainCommandInput} for command's `input` shape.
 * @see {@link CreateDomainCommandOutput} for command's `response` shape.
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
export declare class CreateDomainCommand extends CreateDomainCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateDomainRequest;
            output: CreateDomainResponse;
        };
        sdk: {
            input: CreateDomainCommandInput;
            output: CreateDomainCommandOutput;
        };
    };
}
