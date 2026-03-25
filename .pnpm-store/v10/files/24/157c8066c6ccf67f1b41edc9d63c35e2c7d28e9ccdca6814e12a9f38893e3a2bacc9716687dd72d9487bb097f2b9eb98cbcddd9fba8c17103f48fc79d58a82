import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeTrialRequest, DescribeTrialResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeTrialCommand}.
 */
export interface DescribeTrialCommandInput extends DescribeTrialRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeTrialCommand}.
 */
export interface DescribeTrialCommandOutput extends DescribeTrialResponse, __MetadataBearer {
}
declare const DescribeTrialCommand_base: {
    new (input: DescribeTrialCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrialCommandInput, DescribeTrialCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeTrialCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrialCommandInput, DescribeTrialCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides a list of a trial's properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeTrialCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeTrialCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeTrialRequest
 *   TrialName: "STRING_VALUE", // required
 * };
 * const command = new DescribeTrialCommand(input);
 * const response = await client.send(command);
 * // { // DescribeTrialResponse
 * //   TrialName: "STRING_VALUE",
 * //   TrialArn: "STRING_VALUE",
 * //   DisplayName: "STRING_VALUE",
 * //   ExperimentName: "STRING_VALUE",
 * //   Source: { // TrialSource
 * //     SourceArn: "STRING_VALUE", // required
 * //     SourceType: "STRING_VALUE",
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
 * // };
 *
 * ```
 *
 * @param DescribeTrialCommandInput - {@link DescribeTrialCommandInput}
 * @returns {@link DescribeTrialCommandOutput}
 * @see {@link DescribeTrialCommandInput} for command's `input` shape.
 * @see {@link DescribeTrialCommandOutput} for command's `response` shape.
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
export declare class DescribeTrialCommand extends DescribeTrialCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeTrialRequest;
            output: DescribeTrialResponse;
        };
        sdk: {
            input: DescribeTrialCommandInput;
            output: DescribeTrialCommandOutput;
        };
    };
}
