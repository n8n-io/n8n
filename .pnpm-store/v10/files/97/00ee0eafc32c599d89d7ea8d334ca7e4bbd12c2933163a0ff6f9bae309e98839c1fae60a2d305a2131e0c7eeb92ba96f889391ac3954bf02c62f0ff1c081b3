import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteTagsInput, DeleteTagsOutput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteTagsCommand}.
 */
export interface DeleteTagsCommandInput extends DeleteTagsInput {
}
/**
 * @public
 *
 * The output of {@link DeleteTagsCommand}.
 */
export interface DeleteTagsCommandOutput extends DeleteTagsOutput, __MetadataBearer {
}
declare const DeleteTagsCommand_base: {
    new (input: DeleteTagsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTagsCommandInput, DeleteTagsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteTagsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTagsCommandInput, DeleteTagsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified tags from an SageMaker resource.</p> <p>To list a resource's tags, use the <code>ListTags</code> API. </p> <note> <p>When you call this API to delete tags from a hyperparameter tuning job, the deleted tags are not removed from training jobs that the hyperparameter tuning job launched before you called this API.</p> </note> <note> <p>When you call this API to delete tags from a SageMaker Domain or User Profile, the deleted tags are not removed from Apps that the SageMaker Domain or User Profile launched before you called this API.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteTagsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteTagsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteTagsInput
 *   ResourceArn: "STRING_VALUE", // required
 *   TagKeys: [ // TagKeyList // required
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new DeleteTagsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteTagsCommandInput - {@link DeleteTagsCommandInput}
 * @returns {@link DeleteTagsCommandOutput}
 * @see {@link DeleteTagsCommandInput} for command's `input` shape.
 * @see {@link DeleteTagsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteTagsCommand extends DeleteTagsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteTagsInput;
            output: {};
        };
        sdk: {
            input: DeleteTagsCommandInput;
            output: DeleteTagsCommandOutput;
        };
    };
}
