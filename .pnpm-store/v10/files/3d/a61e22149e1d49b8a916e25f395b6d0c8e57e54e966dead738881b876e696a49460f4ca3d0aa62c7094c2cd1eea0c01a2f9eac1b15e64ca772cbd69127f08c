import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteAlgorithmInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAlgorithmCommand}.
 */
export interface DeleteAlgorithmCommandInput extends DeleteAlgorithmInput {
}
/**
 * @public
 *
 * The output of {@link DeleteAlgorithmCommand}.
 */
export interface DeleteAlgorithmCommandOutput extends __MetadataBearer {
}
declare const DeleteAlgorithmCommand_base: {
    new (input: DeleteAlgorithmCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAlgorithmCommandInput, DeleteAlgorithmCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAlgorithmCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAlgorithmCommandInput, DeleteAlgorithmCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Removes the specified algorithm from your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteAlgorithmCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteAlgorithmCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteAlgorithmInput
 *   AlgorithmName: "STRING_VALUE", // required
 * };
 * const command = new DeleteAlgorithmCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteAlgorithmCommandInput - {@link DeleteAlgorithmCommandInput}
 * @returns {@link DeleteAlgorithmCommandOutput}
 * @see {@link DeleteAlgorithmCommandInput} for command's `input` shape.
 * @see {@link DeleteAlgorithmCommandOutput} for command's `response` shape.
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
export declare class DeleteAlgorithmCommand extends DeleteAlgorithmCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAlgorithmInput;
            output: {};
        };
        sdk: {
            input: DeleteAlgorithmCommandInput;
            output: DeleteAlgorithmCommandOutput;
        };
    };
}
