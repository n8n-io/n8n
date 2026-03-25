import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteModelBiasJobDefinitionRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelBiasJobDefinitionCommand}.
 */
export interface DeleteModelBiasJobDefinitionCommandInput extends DeleteModelBiasJobDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteModelBiasJobDefinitionCommand}.
 */
export interface DeleteModelBiasJobDefinitionCommandOutput extends __MetadataBearer {
}
declare const DeleteModelBiasJobDefinitionCommand_base: {
    new (input: DeleteModelBiasJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelBiasJobDefinitionCommandInput, DeleteModelBiasJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelBiasJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelBiasJobDefinitionCommandInput, DeleteModelBiasJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an Amazon SageMaker AI model bias job definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelBiasJobDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelBiasJobDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelBiasJobDefinitionRequest
 *   JobDefinitionName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelBiasJobDefinitionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelBiasJobDefinitionCommandInput - {@link DeleteModelBiasJobDefinitionCommandInput}
 * @returns {@link DeleteModelBiasJobDefinitionCommandOutput}
 * @see {@link DeleteModelBiasJobDefinitionCommandInput} for command's `input` shape.
 * @see {@link DeleteModelBiasJobDefinitionCommandOutput} for command's `response` shape.
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
export declare class DeleteModelBiasJobDefinitionCommand extends DeleteModelBiasJobDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelBiasJobDefinitionRequest;
            output: {};
        };
        sdk: {
            input: DeleteModelBiasJobDefinitionCommandInput;
            output: DeleteModelBiasJobDefinitionCommandOutput;
        };
    };
}
