import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeArtifactRequest, DescribeArtifactResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeArtifactCommand}.
 */
export interface DescribeArtifactCommandInput extends DescribeArtifactRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeArtifactCommand}.
 */
export interface DescribeArtifactCommandOutput extends DescribeArtifactResponse, __MetadataBearer {
}
declare const DescribeArtifactCommand_base: {
    new (input: DescribeArtifactCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeArtifactCommandInput, DescribeArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeArtifactCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeArtifactCommandInput, DescribeArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes an artifact.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeArtifactCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeArtifactCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeArtifactRequest
 *   ArtifactArn: "STRING_VALUE", // required
 * };
 * const command = new DescribeArtifactCommand(input);
 * const response = await client.send(command);
 * // { // DescribeArtifactResponse
 * //   ArtifactName: "STRING_VALUE",
 * //   ArtifactArn: "STRING_VALUE",
 * //   Source: { // ArtifactSource
 * //     SourceUri: "STRING_VALUE", // required
 * //     SourceTypes: [ // ArtifactSourceTypes
 * //       { // ArtifactSourceType
 * //         SourceIdType: "MD5Hash" || "S3ETag" || "S3Version" || "Custom", // required
 * //         Value: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //   },
 * //   ArtifactType: "STRING_VALUE",
 * //   Properties: { // LineageEntityParameters
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"),
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
 * //   MetadataProperties: { // MetadataProperties
 * //     CommitId: "STRING_VALUE",
 * //     Repository: "STRING_VALUE",
 * //     GeneratedBy: "STRING_VALUE",
 * //     ProjectId: "STRING_VALUE",
 * //   },
 * //   LineageGroupArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeArtifactCommandInput - {@link DescribeArtifactCommandInput}
 * @returns {@link DescribeArtifactCommandOutput}
 * @see {@link DescribeArtifactCommandInput} for command's `input` shape.
 * @see {@link DescribeArtifactCommandOutput} for command's `response` shape.
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
export declare class DescribeArtifactCommand extends DescribeArtifactCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeArtifactRequest;
            output: DescribeArtifactResponse;
        };
        sdk: {
            input: DescribeArtifactCommandInput;
            output: DescribeArtifactCommandOutput;
        };
    };
}
