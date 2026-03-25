import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribePartnerAppRequest, DescribePartnerAppResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribePartnerAppCommand}.
 */
export interface DescribePartnerAppCommandInput extends DescribePartnerAppRequest {
}
/**
 * @public
 *
 * The output of {@link DescribePartnerAppCommand}.
 */
export interface DescribePartnerAppCommandOutput extends DescribePartnerAppResponse, __MetadataBearer {
}
declare const DescribePartnerAppCommand_base: {
    new (input: DescribePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePartnerAppCommandInput, DescribePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePartnerAppCommandInput, DescribePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about a SageMaker Partner AI App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribePartnerAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribePartnerAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribePartnerAppRequest
 *   Arn: "STRING_VALUE", // required
 * };
 * const command = new DescribePartnerAppCommand(input);
 * const response = await client.send(command);
 * // { // DescribePartnerAppResponse
 * //   Arn: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   Type: "lakera-guard" || "comet" || "deepchecks-llm-evaluation" || "fiddler",
 * //   Status: "Creating" || "Updating" || "Deleting" || "Available" || "Failed" || "UpdateFailed" || "Deleted",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   ExecutionRoleArn: "STRING_VALUE",
 * //   KmsKeyId: "STRING_VALUE",
 * //   BaseUrl: "STRING_VALUE",
 * //   MaintenanceConfig: { // PartnerAppMaintenanceConfig
 * //     MaintenanceWindowStart: "STRING_VALUE",
 * //   },
 * //   Tier: "STRING_VALUE",
 * //   Version: "STRING_VALUE",
 * //   ApplicationConfig: { // PartnerAppConfig
 * //     AdminUsers: [ // PartnerAppAdminUserList
 * //       "STRING_VALUE",
 * //     ],
 * //     Arguments: { // PartnerAppArguments
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //   },
 * //   AuthType: "IAM",
 * //   EnableIamSessionBasedIdentity: true || false,
 * //   Error: { // ErrorInfo
 * //     Code: "STRING_VALUE",
 * //     Reason: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribePartnerAppCommandInput - {@link DescribePartnerAppCommandInput}
 * @returns {@link DescribePartnerAppCommandOutput}
 * @see {@link DescribePartnerAppCommandInput} for command's `input` shape.
 * @see {@link DescribePartnerAppCommandOutput} for command's `response` shape.
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
export declare class DescribePartnerAppCommand extends DescribePartnerAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribePartnerAppRequest;
            output: DescribePartnerAppResponse;
        };
        sdk: {
            input: DescribePartnerAppCommandInput;
            output: DescribePartnerAppCommandOutput;
        };
    };
}
