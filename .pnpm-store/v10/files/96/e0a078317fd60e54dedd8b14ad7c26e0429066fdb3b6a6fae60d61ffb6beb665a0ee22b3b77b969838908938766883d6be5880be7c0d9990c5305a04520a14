import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteAppImageConfigRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAppImageConfigCommand}.
 */
export interface DeleteAppImageConfigCommandInput extends DeleteAppImageConfigRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteAppImageConfigCommand}.
 */
export interface DeleteAppImageConfigCommandOutput extends __MetadataBearer {
}
declare const DeleteAppImageConfigCommand_base: {
    new (input: DeleteAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAppImageConfigCommandInput, DeleteAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAppImageConfigCommandInput, DeleteAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an AppImageConfig.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteAppImageConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteAppImageConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteAppImageConfigRequest
 *   AppImageConfigName: "STRING_VALUE", // required
 * };
 * const command = new DeleteAppImageConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteAppImageConfigCommandInput - {@link DeleteAppImageConfigCommandInput}
 * @returns {@link DeleteAppImageConfigCommandOutput}
 * @see {@link DeleteAppImageConfigCommandInput} for command's `input` shape.
 * @see {@link DeleteAppImageConfigCommandOutput} for command's `response` shape.
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
export declare class DeleteAppImageConfigCommand extends DeleteAppImageConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAppImageConfigRequest;
            output: {};
        };
        sdk: {
            input: DeleteAppImageConfigCommandInput;
            output: DeleteAppImageConfigCommandOutput;
        };
    };
}
