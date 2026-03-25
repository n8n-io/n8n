import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteModelPackageGroupPolicyInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelPackageGroupPolicyCommand}.
 */
export interface DeleteModelPackageGroupPolicyCommandInput extends DeleteModelPackageGroupPolicyInput {
}
/**
 * @public
 *
 * The output of {@link DeleteModelPackageGroupPolicyCommand}.
 */
export interface DeleteModelPackageGroupPolicyCommandOutput extends __MetadataBearer {
}
declare const DeleteModelPackageGroupPolicyCommand_base: {
    new (input: DeleteModelPackageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelPackageGroupPolicyCommandInput, DeleteModelPackageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelPackageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelPackageGroupPolicyCommandInput, DeleteModelPackageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a model group resource policy.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelPackageGroupPolicyCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelPackageGroupPolicyCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelPackageGroupPolicyInput
 *   ModelPackageGroupName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelPackageGroupPolicyCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelPackageGroupPolicyCommandInput - {@link DeleteModelPackageGroupPolicyCommandInput}
 * @returns {@link DeleteModelPackageGroupPolicyCommandOutput}
 * @see {@link DeleteModelPackageGroupPolicyCommandInput} for command's `input` shape.
 * @see {@link DeleteModelPackageGroupPolicyCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteModelPackageGroupPolicyCommand extends DeleteModelPackageGroupPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelPackageGroupPolicyInput;
            output: {};
        };
        sdk: {
            input: DeleteModelPackageGroupPolicyCommandInput;
            output: DeleteModelPackageGroupPolicyCommandOutput;
        };
    };
}
