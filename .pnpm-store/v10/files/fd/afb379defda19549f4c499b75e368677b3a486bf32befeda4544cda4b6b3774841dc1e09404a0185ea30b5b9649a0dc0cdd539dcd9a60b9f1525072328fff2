import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteModelPackageGroupInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelPackageGroupCommand}.
 */
export interface DeleteModelPackageGroupCommandInput extends DeleteModelPackageGroupInput {
}
/**
 * @public
 *
 * The output of {@link DeleteModelPackageGroupCommand}.
 */
export interface DeleteModelPackageGroupCommandOutput extends __MetadataBearer {
}
declare const DeleteModelPackageGroupCommand_base: {
    new (input: DeleteModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelPackageGroupCommandInput, DeleteModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelPackageGroupCommandInput, DeleteModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified model group.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelPackageGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelPackageGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelPackageGroupInput
 *   ModelPackageGroupName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelPackageGroupCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelPackageGroupCommandInput - {@link DeleteModelPackageGroupCommandInput}
 * @returns {@link DeleteModelPackageGroupCommandOutput}
 * @see {@link DeleteModelPackageGroupCommandInput} for command's `input` shape.
 * @see {@link DeleteModelPackageGroupCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteModelPackageGroupCommand extends DeleteModelPackageGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelPackageGroupInput;
            output: {};
        };
        sdk: {
            input: DeleteModelPackageGroupCommandInput;
            output: DeleteModelPackageGroupCommandOutput;
        };
    };
}
