import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeModelCardRequest, DescribeModelCardResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeModelCardCommand}.
 */
export interface DescribeModelCardCommandInput extends DescribeModelCardRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeModelCardCommand}.
 */
export interface DescribeModelCardCommandOutput extends DescribeModelCardResponse, __MetadataBearer {
}
declare const DescribeModelCardCommand_base: {
    new (input: DescribeModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelCardCommandInput, DescribeModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelCardCommandInput, DescribeModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes the content, creation time, and security configuration of an Amazon SageMaker Model Card.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeModelCardCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeModelCardCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeModelCardRequest
 *   ModelCardName: "STRING_VALUE", // required
 *   ModelCardVersion: Number("int"),
 * };
 * const command = new DescribeModelCardCommand(input);
 * const response = await client.send(command);
 * // { // DescribeModelCardResponse
 * //   ModelCardArn: "STRING_VALUE", // required
 * //   ModelCardName: "STRING_VALUE", // required
 * //   ModelCardVersion: Number("int"), // required
 * //   Content: "STRING_VALUE", // required
 * //   ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived", // required
 * //   SecurityConfig: { // ModelCardSecurityConfig
 * //     KmsKeyId: "STRING_VALUE",
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"), // required
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
 * //   ModelCardProcessingStatus: "DeleteInProgress" || "DeletePending" || "ContentDeleted" || "ExportJobsDeleted" || "DeleteCompleted" || "DeleteFailed",
 * // };
 *
 * ```
 *
 * @param DescribeModelCardCommandInput - {@link DescribeModelCardCommandInput}
 * @returns {@link DescribeModelCardCommandOutput}
 * @see {@link DescribeModelCardCommandInput} for command's `input` shape.
 * @see {@link DescribeModelCardCommandOutput} for command's `response` shape.
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
export declare class DescribeModelCardCommand extends DescribeModelCardCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeModelCardRequest;
            output: DescribeModelCardResponse;
        };
        sdk: {
            input: DescribeModelCardCommandInput;
            output: DescribeModelCardCommandOutput;
        };
    };
}
