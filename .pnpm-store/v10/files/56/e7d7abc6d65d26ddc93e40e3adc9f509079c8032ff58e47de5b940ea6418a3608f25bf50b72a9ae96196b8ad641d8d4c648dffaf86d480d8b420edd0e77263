import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteWorkforceRequest, DeleteWorkforceResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteWorkforceCommand}.
 */
export interface DeleteWorkforceCommandInput extends DeleteWorkforceRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteWorkforceCommand}.
 */
export interface DeleteWorkforceCommandOutput extends DeleteWorkforceResponse, __MetadataBearer {
}
declare const DeleteWorkforceCommand_base: {
    new (input: DeleteWorkforceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteWorkforceCommandInput, DeleteWorkforceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteWorkforceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteWorkforceCommandInput, DeleteWorkforceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Use this operation to delete a workforce.</p> <p>If you want to create a new workforce in an Amazon Web Services Region where a workforce already exists, use this operation to delete the existing workforce and then use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateWorkforce.html">CreateWorkforce</a> to create a new workforce.</p> <important> <p>If a private workforce contains one or more work teams, you must use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DeleteWorkteam.html">DeleteWorkteam</a> operation to delete all work teams before you delete the workforce. If you try to delete a workforce that contains one or more work teams, you will receive a <code>ResourceInUse</code> error.</p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteWorkforceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteWorkforceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteWorkforceRequest
 *   WorkforceName: "STRING_VALUE", // required
 * };
 * const command = new DeleteWorkforceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteWorkforceCommandInput - {@link DeleteWorkforceCommandInput}
 * @returns {@link DeleteWorkforceCommandOutput}
 * @see {@link DeleteWorkforceCommandInput} for command's `input` shape.
 * @see {@link DeleteWorkforceCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteWorkforceCommand extends DeleteWorkforceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteWorkforceRequest;
            output: {};
        };
        sdk: {
            input: DeleteWorkforceCommandInput;
            output: DeleteWorkforceCommandOutput;
        };
    };
}
