import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteModelInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelCommand}.
 */
export interface DeleteModelCommandInput extends DeleteModelInput {
}
/**
 * @public
 *
 * The output of {@link DeleteModelCommand}.
 */
export interface DeleteModelCommandOutput extends __MetadataBearer {
}
declare const DeleteModelCommand_base: {
    new (input: DeleteModelCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelCommandInput, DeleteModelCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelCommandInput, DeleteModelCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a model. The <code>DeleteModel</code> API deletes only the model entry that was created in SageMaker when you called the <code>CreateModel</code> API. It does not delete model artifacts, inference code, or the IAM role that you specified when creating the model. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelInput
 *   ModelName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelCommandInput - {@link DeleteModelCommandInput}
 * @returns {@link DeleteModelCommandOutput}
 * @see {@link DeleteModelCommandInput} for command's `input` shape.
 * @see {@link DeleteModelCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteModelCommand extends DeleteModelCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelInput;
            output: {};
        };
        sdk: {
            input: DeleteModelCommandInput;
            output: DeleteModelCommandOutput;
        };
    };
}
