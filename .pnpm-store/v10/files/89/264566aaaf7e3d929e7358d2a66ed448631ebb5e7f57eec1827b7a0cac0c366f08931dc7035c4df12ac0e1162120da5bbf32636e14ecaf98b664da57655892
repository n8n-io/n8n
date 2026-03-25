import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetModelPackageGroupPolicyInput, GetModelPackageGroupPolicyOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetModelPackageGroupPolicyCommand}.
 */
export interface GetModelPackageGroupPolicyCommandInput extends GetModelPackageGroupPolicyInput {
}
/**
 * @public
 *
 * The output of {@link GetModelPackageGroupPolicyCommand}.
 */
export interface GetModelPackageGroupPolicyCommandOutput extends GetModelPackageGroupPolicyOutput, __MetadataBearer {
}
declare const GetModelPackageGroupPolicyCommand_base: {
    new (input: GetModelPackageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetModelPackageGroupPolicyCommandInput, GetModelPackageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetModelPackageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetModelPackageGroupPolicyCommandInput, GetModelPackageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a resource policy that manages access for a model group. For information about resource policies, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html">Identity-based policies and resource-based policies</a> in the <i>Amazon Web Services Identity and Access Management User Guide.</i>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetModelPackageGroupPolicyCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetModelPackageGroupPolicyCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // GetModelPackageGroupPolicyInput
 *   ModelPackageGroupName: "STRING_VALUE", // required
 * };
 * const command = new GetModelPackageGroupPolicyCommand(input);
 * const response = await client.send(command);
 * // { // GetModelPackageGroupPolicyOutput
 * //   ResourcePolicy: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param GetModelPackageGroupPolicyCommandInput - {@link GetModelPackageGroupPolicyCommandInput}
 * @returns {@link GetModelPackageGroupPolicyCommandOutput}
 * @see {@link GetModelPackageGroupPolicyCommandInput} for command's `input` shape.
 * @see {@link GetModelPackageGroupPolicyCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class GetModelPackageGroupPolicyCommand extends GetModelPackageGroupPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetModelPackageGroupPolicyInput;
            output: GetModelPackageGroupPolicyOutput;
        };
        sdk: {
            input: GetModelPackageGroupPolicyCommandInput;
            output: GetModelPackageGroupPolicyCommandOutput;
        };
    };
}
