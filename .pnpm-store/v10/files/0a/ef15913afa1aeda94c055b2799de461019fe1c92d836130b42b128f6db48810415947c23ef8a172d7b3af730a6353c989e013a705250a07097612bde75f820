import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeLineageGroupRequest, DescribeLineageGroupResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeLineageGroupCommand}.
 */
export interface DescribeLineageGroupCommandInput extends DescribeLineageGroupRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeLineageGroupCommand}.
 */
export interface DescribeLineageGroupCommandOutput extends DescribeLineageGroupResponse, __MetadataBearer {
}
declare const DescribeLineageGroupCommand_base: {
    new (input: DescribeLineageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeLineageGroupCommandInput, DescribeLineageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeLineageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeLineageGroupCommandInput, DescribeLineageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides a list of properties for the requested lineage group. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/xaccount-lineage-tracking.html"> Cross-Account Lineage Tracking </a> in the <i>Amazon SageMaker Developer Guide</i>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeLineageGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeLineageGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeLineageGroupRequest
 *   LineageGroupName: "STRING_VALUE", // required
 * };
 * const command = new DescribeLineageGroupCommand(input);
 * const response = await client.send(command);
 * // { // DescribeLineageGroupResponse
 * //   LineageGroupName: "STRING_VALUE",
 * //   LineageGroupArn: "STRING_VALUE",
 * //   DisplayName: "STRING_VALUE",
 * //   Description: "STRING_VALUE",
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
 * // };
 *
 * ```
 *
 * @param DescribeLineageGroupCommandInput - {@link DescribeLineageGroupCommandInput}
 * @returns {@link DescribeLineageGroupCommandOutput}
 * @see {@link DescribeLineageGroupCommandInput} for command's `input` shape.
 * @see {@link DescribeLineageGroupCommandOutput} for command's `response` shape.
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
export declare class DescribeLineageGroupCommand extends DescribeLineageGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeLineageGroupRequest;
            output: DescribeLineageGroupResponse;
        };
        sdk: {
            input: DescribeLineageGroupCommandInput;
            output: DescribeLineageGroupCommandOutput;
        };
    };
}
