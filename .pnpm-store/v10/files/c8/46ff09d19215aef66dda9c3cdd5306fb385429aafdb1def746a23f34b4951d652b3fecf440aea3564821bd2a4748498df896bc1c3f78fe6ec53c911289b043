import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeModelPackageGroupInput, DescribeModelPackageGroupOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeModelPackageGroupCommand}.
 */
export interface DescribeModelPackageGroupCommandInput extends DescribeModelPackageGroupInput {
}
/**
 * @public
 *
 * The output of {@link DescribeModelPackageGroupCommand}.
 */
export interface DescribeModelPackageGroupCommandOutput extends DescribeModelPackageGroupOutput, __MetadataBearer {
}
declare const DescribeModelPackageGroupCommand_base: {
    new (input: DescribeModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelPackageGroupCommandInput, DescribeModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelPackageGroupCommandInput, DescribeModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a description for the specified model group.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeModelPackageGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeModelPackageGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeModelPackageGroupInput
 *   ModelPackageGroupName: "STRING_VALUE", // required
 * };
 * const command = new DescribeModelPackageGroupCommand(input);
 * const response = await client.send(command);
 * // { // DescribeModelPackageGroupOutput
 * //   ModelPackageGroupName: "STRING_VALUE", // required
 * //   ModelPackageGroupArn: "STRING_VALUE", // required
 * //   ModelPackageGroupDescription: "STRING_VALUE",
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
 * //   ModelPackageGroupStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting" || "DeleteFailed", // required
 * // };
 *
 * ```
 *
 * @param DescribeModelPackageGroupCommandInput - {@link DescribeModelPackageGroupCommandInput}
 * @returns {@link DescribeModelPackageGroupCommandOutput}
 * @see {@link DescribeModelPackageGroupCommandInput} for command's `input` shape.
 * @see {@link DescribeModelPackageGroupCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeModelPackageGroupCommand extends DescribeModelPackageGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeModelPackageGroupInput;
            output: DescribeModelPackageGroupOutput;
        };
        sdk: {
            input: DescribeModelPackageGroupCommandInput;
            output: DescribeModelPackageGroupCommandOutput;
        };
    };
}
