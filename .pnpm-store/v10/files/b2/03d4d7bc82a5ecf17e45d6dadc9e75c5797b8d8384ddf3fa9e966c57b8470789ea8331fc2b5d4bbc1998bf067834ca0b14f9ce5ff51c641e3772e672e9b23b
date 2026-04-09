import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeDomainRequest, DescribeDomainResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeDomainCommand}.
 */
export interface DescribeDomainCommandInput extends DescribeDomainRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeDomainCommand}.
 */
export interface DescribeDomainCommandOutput extends DescribeDomainResponse, __MetadataBearer {
}
declare const DescribeDomainCommand_base: {
    new (input: DescribeDomainCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDomainCommandInput, DescribeDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeDomainCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDomainCommandInput, DescribeDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>The description of the domain.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeDomainCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeDomainCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeDomainRequest
 *   DomainId: "STRING_VALUE", // required
 * };
 * const command = new DescribeDomainCommand(input);
 * const response = await client.send(command);
 * // { // DescribeDomainResponse
 * //   DomainArn: "STRING_VALUE",
 * //   DomainId: "STRING_VALUE",
 * //   DomainName: "STRING_VALUE",
 * //   HomeEfsFileSystemId: "STRING_VALUE",
 * //   SingleSignOnManagedApplicationInstanceId: "STRING_VALUE",
 * //   SingleSignOnApplicationArn: "STRING_VALUE",
 * //   Status: "Deleting" || "Failed" || "InService" || "Pending" || "Updating" || "Update_Failed" || "Delete_Failed",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   FailureReason: "STRING_VALUE",
 * //   SecurityGroupIdForDomainBoundary: "STRING_VALUE",
 * //   AuthMode: "SSO" || "IAM",
 * //   DefaultUserSettings: { // UserSettings
 * //     ExecutionRole: "STRING_VALUE",
 * //     SecurityGroups: [ // SecurityGroupIds
 * //       "STRING_VALUE",
 * //     ],
 * //     SharingSettings: { // SharingSettings
 * //       NotebookOutputOption: "Allowed" || "Disabled",
 * //       S3OutputPath: "STRING_VALUE",
 * //       S3KmsKeyId: "STRING_VALUE",
 * //     },
 * //     JupyterServerAppSettings: { // JupyterServerAppSettings
 * //       DefaultResourceSpec: { // ResourceSpec
 * //         SageMakerImageArn: "STRING_VALUE",
 * //         SageMakerImageVersionArn: "STRING_VALUE",
 * //         SageMakerImageVersionAlias: "STRING_VALUE",
 * //         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //         LifecycleConfigArn: "STRING_VALUE",
 * //       },
 * //       LifecycleConfigArns: [ // LifecycleConfigArns
 * //         "STRING_VALUE",
 * //       ],
 * //       CodeRepositories: [ // CodeRepositories
 * //         { // CodeRepository
 * //           RepositoryUrl: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     KernelGatewayAppSettings: { // KernelGatewayAppSettings
 * //       DefaultResourceSpec: {
 * //         SageMakerImageArn: "STRING_VALUE",
 * //         SageMakerImageVersionArn: "STRING_VALUE",
 * //         SageMakerImageVersionAlias: "STRING_VALUE",
 * //         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //         LifecycleConfigArn: "STRING_VALUE",
 * //       },
 * //       CustomImages: [ // CustomImages
 * //         { // CustomImage
 * //           ImageName: "STRING_VALUE", // required
 * //           ImageVersionNumber: Number("int"),
 * //           AppImageConfigName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       LifecycleConfigArns: [
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //     TensorBoardAppSettings: { // TensorBoardAppSettings
 * //       DefaultResourceSpec: {
 * //         SageMakerImageArn: "STRING_VALUE",
 * //         SageMakerImageVersionArn: "STRING_VALUE",
 * //         SageMakerImageVersionAlias: "STRING_VALUE",
 * //         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //         LifecycleConfigArn: "STRING_VALUE",
 * //       },
 * //     },
 * //     RStudioServerProAppSettings: { // RStudioServerProAppSettings
 * //       AccessStatus: "ENABLED" || "DISABLED",
 * //       UserGroup: "R_STUDIO_ADMIN" || "R_STUDIO_USER",
 * //     },
 * //     RSessionAppSettings: { // RSessionAppSettings
 * //       DefaultResourceSpec: {
 * //         SageMakerImageArn: "STRING_VALUE",
 * //         SageMakerImageVersionArn: "STRING_VALUE",
 * //         SageMakerImageVersionAlias: "STRING_VALUE",
 * //         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //         LifecycleConfigArn: "STRING_VALUE",
 * //       },
 * //       CustomImages: [
 * //         {
 * //           ImageName: "STRING_VALUE", // required
 * //           ImageVersionNumber: Number("int"),
 * //           AppImageConfigName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     CanvasAppSettings: { // CanvasAppSettings
 * //       TimeSeriesForecastingSettings: { // TimeSeriesForecastingSettings
 * //         Status: "ENABLED" || "DISABLED",
 * //         AmazonForecastRoleArn: "STRING_VALUE",
 * //       },
 * //       ModelRegisterSettings: { // ModelRegisterSettings
 * //         Status: "ENABLED" || "DISABLED",
 * //         CrossAccountModelRegisterRoleArn: "STRING_VALUE",
 * //       },
 * //       WorkspaceSettings: { // WorkspaceSettings
 * //         S3ArtifactPath: "STRING_VALUE",
 * //         S3KmsKeyId: "STRING_VALUE",
 * //       },
 * //       IdentityProviderOAuthSettings: [ // IdentityProviderOAuthSettings
 * //         { // IdentityProviderOAuthSetting
 * //           DataSourceName: "SalesforceGenie" || "Snowflake",
 * //           Status: "ENABLED" || "DISABLED",
 * //           SecretArn: "STRING_VALUE",
 * //         },
 * //       ],
 * //       DirectDeploySettings: { // DirectDeploySettings
 * //         Status: "ENABLED" || "DISABLED",
 * //       },
 * //       KendraSettings: { // KendraSettings
 * //         Status: "ENABLED" || "DISABLED",
 * //       },
 * //       GenerativeAiSettings: { // GenerativeAiSettings
 * //         AmazonBedrockRoleArn: "STRING_VALUE",
 * //       },
 * //       EmrServerlessSettings: { // EmrServerlessSettings
 * //         ExecutionRoleArn: "STRING_VALUE",
 * //         Status: "ENABLED" || "DISABLED",
 * //       },
 * //     },
 * //     CodeEditorAppSettings: { // CodeEditorAppSettings
 * //       DefaultResourceSpec: {
 * //         SageMakerImageArn: "STRING_VALUE",
 * //         SageMakerImageVersionArn: "STRING_VALUE",
 * //         SageMakerImageVersionAlias: "STRING_VALUE",
 * //         InstanceType: "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //         LifecycleConfigArn: "STRING_VALUE",
 * //       },
 * //       CustomImages: [
 * //         {
 * //           ImageName: "STRING_VALUE", // required
 * //           ImageVersionNumber: Number("int"),
 * //           AppImageConfigName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       LifecycleConfigArns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       AppLifecycleManagement: { // AppLifecycleManagement
 * //         IdleSettings: { // IdleSettings
 * //           LifecycleManagement: "ENABLED" || "DISABLED",
 * //           IdleTimeoutInMinutes: Number("int"),
 * //           MinIdleTimeoutInMinutes: Number("int"),
 * //           MaxIdleTimeoutInMinutes: Number("int"),
 * //         },
 * //       },
 * //       BuiltInLifecycleConfigArn: "STRING_VALUE",
 * //     },
 * //     JupyterLabAppSettings: { // JupyterLabAppSettings
 * //       DefaultResourceSpec: "<ResourceSpec>",
 * //       CustomImages: [
 * //         {
 * //           ImageName: "STRING_VALUE", // required
 * //           ImageVersionNumber: Number("int"),
 * //           AppImageConfigName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       LifecycleConfigArns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       CodeRepositories: [
 * //         {
 * //           RepositoryUrl: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       AppLifecycleManagement: {
 * //         IdleSettings: {
 * //           LifecycleManagement: "ENABLED" || "DISABLED",
 * //           IdleTimeoutInMinutes: Number("int"),
 * //           MinIdleTimeoutInMinutes: Number("int"),
 * //           MaxIdleTimeoutInMinutes: Number("int"),
 * //         },
 * //       },
 * //       EmrSettings: { // EmrSettings
 * //         AssumableRoleArns: [ // AssumableRoleArns
 * //           "STRING_VALUE",
 * //         ],
 * //         ExecutionRoleArns: [ // ExecutionRoleArns
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       BuiltInLifecycleConfigArn: "STRING_VALUE",
 * //     },
 * //     SpaceStorageSettings: { // DefaultSpaceStorageSettings
 * //       DefaultEbsStorageSettings: { // DefaultEbsStorageSettings
 * //         DefaultEbsVolumeSizeInGb: Number("int"), // required
 * //         MaximumEbsVolumeSizeInGb: Number("int"), // required
 * //       },
 * //     },
 * //     DefaultLandingUri: "STRING_VALUE",
 * //     StudioWebPortal: "ENABLED" || "DISABLED",
 * //     CustomPosixUserConfig: { // CustomPosixUserConfig
 * //       Uid: Number("long"), // required
 * //       Gid: Number("long"), // required
 * //     },
 * //     CustomFileSystemConfigs: [ // CustomFileSystemConfigs
 * //       { // CustomFileSystemConfig Union: only one key present
 * //         EFSFileSystemConfig: { // EFSFileSystemConfig
 * //           FileSystemId: "STRING_VALUE", // required
 * //           FileSystemPath: "STRING_VALUE",
 * //         },
 * //         FSxLustreFileSystemConfig: { // FSxLustreFileSystemConfig
 * //           FileSystemId: "STRING_VALUE", // required
 * //           FileSystemPath: "STRING_VALUE",
 * //         },
 * //         S3FileSystemConfig: { // S3FileSystemConfig
 * //           MountPath: "STRING_VALUE",
 * //           S3Uri: "STRING_VALUE", // required
 * //         },
 * //       },
 * //     ],
 * //     StudioWebPortalSettings: { // StudioWebPortalSettings
 * //       HiddenMlTools: [ // HiddenMlToolsList
 * //         "DataWrangler" || "FeatureStore" || "EmrClusters" || "AutoMl" || "Experiments" || "Training" || "ModelEvaluation" || "Pipelines" || "Models" || "JumpStart" || "InferenceRecommender" || "Endpoints" || "Projects" || "InferenceOptimization" || "PerformanceEvaluation" || "LakeraGuard" || "Comet" || "DeepchecksLLMEvaluation" || "Fiddler" || "HyperPodClusters" || "RunningInstances" || "Datasets" || "Evaluators",
 * //       ],
 * //       HiddenAppTypes: [ // HiddenAppTypesList
 * //         "JupyterServer" || "KernelGateway" || "DetailedProfiler" || "TensorBoard" || "CodeEditor" || "JupyterLab" || "RStudioServerPro" || "RSessionGateway" || "Canvas",
 * //       ],
 * //       HiddenInstanceTypes: [ // HiddenInstanceTypesList
 * //         "system" || "ml.t3.micro" || "ml.t3.small" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.8xlarge" || "ml.m5d.12xlarge" || "ml.m5d.16xlarge" || "ml.m5d.24xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.geospatial.interactive" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.p5.48xlarge" || "ml.p5en.48xlarge" || "ml.p6-b200.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.m6id.large" || "ml.m6id.xlarge" || "ml.m6id.2xlarge" || "ml.m6id.4xlarge" || "ml.m6id.8xlarge" || "ml.m6id.12xlarge" || "ml.m6id.16xlarge" || "ml.m6id.24xlarge" || "ml.m6id.32xlarge" || "ml.c6id.large" || "ml.c6id.xlarge" || "ml.c6id.2xlarge" || "ml.c6id.4xlarge" || "ml.c6id.8xlarge" || "ml.c6id.12xlarge" || "ml.c6id.16xlarge" || "ml.c6id.24xlarge" || "ml.c6id.32xlarge" || "ml.r6id.large" || "ml.r6id.xlarge" || "ml.r6id.2xlarge" || "ml.r6id.4xlarge" || "ml.r6id.8xlarge" || "ml.r6id.12xlarge" || "ml.r6id.16xlarge" || "ml.r6id.24xlarge" || "ml.r6id.32xlarge",
 * //       ],
 * //       HiddenSageMakerImageVersionAliases: [ // HiddenSageMakerImageVersionAliasesList
 * //         { // HiddenSageMakerImage
 * //           SageMakerImageName: "sagemaker_distribution",
 * //           VersionAliases: [ // VersionAliasesList
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //       ],
 * //     },
 * //     AutoMountHomeEFS: "Enabled" || "Disabled" || "DefaultAsDomain",
 * //   },
 * //   DomainSettings: { // DomainSettings
 * //     SecurityGroupIds: [ // DomainSecurityGroupIds
 * //       "STRING_VALUE",
 * //     ],
 * //     RStudioServerProDomainSettings: { // RStudioServerProDomainSettings
 * //       DomainExecutionRoleArn: "STRING_VALUE", // required
 * //       RStudioConnectUrl: "STRING_VALUE",
 * //       RStudioPackageManagerUrl: "STRING_VALUE",
 * //       DefaultResourceSpec: "<ResourceSpec>",
 * //     },
 * //     ExecutionRoleIdentityConfig: "USER_PROFILE_NAME" || "DISABLED",
 * //     TrustedIdentityPropagationSettings: { // TrustedIdentityPropagationSettings
 * //       Status: "ENABLED" || "DISABLED", // required
 * //     },
 * //     DockerSettings: { // DockerSettings
 * //       EnableDockerAccess: "ENABLED" || "DISABLED",
 * //       VpcOnlyTrustedAccounts: [ // VpcOnlyTrustedAccounts
 * //         "STRING_VALUE",
 * //       ],
 * //       RootlessDocker: "ENABLED" || "DISABLED",
 * //     },
 * //     AmazonQSettings: { // AmazonQSettings
 * //       Status: "ENABLED" || "DISABLED",
 * //       QProfileArn: "STRING_VALUE",
 * //     },
 * //     UnifiedStudioSettings: { // UnifiedStudioSettings
 * //       StudioWebPortalAccess: "ENABLED" || "DISABLED",
 * //       DomainAccountId: "STRING_VALUE",
 * //       DomainRegion: "STRING_VALUE",
 * //       DomainId: "STRING_VALUE",
 * //       ProjectId: "STRING_VALUE",
 * //       EnvironmentId: "STRING_VALUE",
 * //       ProjectS3Path: "STRING_VALUE",
 * //       SingleSignOnApplicationArn: "STRING_VALUE",
 * //     },
 * //     IpAddressType: "ipv4" || "dualstack",
 * //   },
 * //   AppNetworkAccessType: "PublicInternetOnly" || "VpcOnly",
 * //   HomeEfsFileSystemKmsKeyId: "STRING_VALUE",
 * //   SubnetIds: [ // Subnets
 * //     "STRING_VALUE",
 * //   ],
 * //   Url: "STRING_VALUE",
 * //   VpcId: "STRING_VALUE",
 * //   KmsKeyId: "STRING_VALUE",
 * //   AppSecurityGroupManagement: "Service" || "Customer",
 * //   TagPropagation: "ENABLED" || "DISABLED",
 * //   DefaultSpaceSettings: { // DefaultSpaceSettings
 * //     ExecutionRole: "STRING_VALUE",
 * //     SecurityGroups: [
 * //       "STRING_VALUE",
 * //     ],
 * //     JupyterServerAppSettings: {
 * //       DefaultResourceSpec: "<ResourceSpec>",
 * //       LifecycleConfigArns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       CodeRepositories: [
 * //         {
 * //           RepositoryUrl: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     KernelGatewayAppSettings: {
 * //       DefaultResourceSpec: "<ResourceSpec>",
 * //       CustomImages: [
 * //         {
 * //           ImageName: "STRING_VALUE", // required
 * //           ImageVersionNumber: Number("int"),
 * //           AppImageConfigName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       LifecycleConfigArns: "<LifecycleConfigArns>",
 * //     },
 * //     JupyterLabAppSettings: {
 * //       DefaultResourceSpec: "<ResourceSpec>",
 * //       CustomImages: "<CustomImages>",
 * //       LifecycleConfigArns: "<LifecycleConfigArns>",
 * //       CodeRepositories: [
 * //         {
 * //           RepositoryUrl: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       AppLifecycleManagement: {
 * //         IdleSettings: {
 * //           LifecycleManagement: "ENABLED" || "DISABLED",
 * //           IdleTimeoutInMinutes: Number("int"),
 * //           MinIdleTimeoutInMinutes: Number("int"),
 * //           MaxIdleTimeoutInMinutes: Number("int"),
 * //         },
 * //       },
 * //       EmrSettings: {
 * //         AssumableRoleArns: [
 * //           "STRING_VALUE",
 * //         ],
 * //         ExecutionRoleArns: [
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       BuiltInLifecycleConfigArn: "STRING_VALUE",
 * //     },
 * //     SpaceStorageSettings: {
 * //       DefaultEbsStorageSettings: {
 * //         DefaultEbsVolumeSizeInGb: Number("int"), // required
 * //         MaximumEbsVolumeSizeInGb: Number("int"), // required
 * //       },
 * //     },
 * //     CustomPosixUserConfig: {
 * //       Uid: Number("long"), // required
 * //       Gid: Number("long"), // required
 * //     },
 * //     CustomFileSystemConfigs: [
 * //       {//  Union: only one key present
 * //         EFSFileSystemConfig: {
 * //           FileSystemId: "STRING_VALUE", // required
 * //           FileSystemPath: "STRING_VALUE",
 * //         },
 * //         FSxLustreFileSystemConfig: {
 * //           FileSystemId: "STRING_VALUE", // required
 * //           FileSystemPath: "STRING_VALUE",
 * //         },
 * //         S3FileSystemConfig: {
 * //           MountPath: "STRING_VALUE",
 * //           S3Uri: "STRING_VALUE", // required
 * //         },
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeDomainCommandInput - {@link DescribeDomainCommandInput}
 * @returns {@link DescribeDomainCommandOutput}
 * @see {@link DescribeDomainCommandInput} for command's `input` shape.
 * @see {@link DescribeDomainCommandOutput} for command's `response` shape.
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
export declare class DescribeDomainCommand extends DescribeDomainCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeDomainRequest;
            output: DescribeDomainResponse;
        };
        sdk: {
            input: DescribeDomainCommandInput;
            output: DescribeDomainCommandOutput;
        };
    };
}
