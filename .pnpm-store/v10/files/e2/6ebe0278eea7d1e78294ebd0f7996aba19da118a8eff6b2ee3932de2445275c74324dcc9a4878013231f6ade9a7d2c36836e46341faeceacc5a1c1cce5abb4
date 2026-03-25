import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteModelQualityJobDefinitionRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelQualityJobDefinitionCommand}.
 */
export interface DeleteModelQualityJobDefinitionCommandInput extends DeleteModelQualityJobDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteModelQualityJobDefinitionCommand}.
 */
export interface DeleteModelQualityJobDefinitionCommandOutput extends __MetadataBearer {
}
declare const DeleteModelQualityJobDefinitionCommand_base: {
    new (input: DeleteModelQualityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelQualityJobDefinitionCommandInput, DeleteModelQualityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelQualityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelQualityJobDefinitionCommandInput, DeleteModelQualityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the secified model quality monitoring job definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelQualityJobDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelQualityJobDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelQualityJobDefinitionRequest
 *   JobDefinitionName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelQualityJobDefinitionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelQualityJobDefinitionCommandInput - {@link DeleteModelQualityJobDefinitionCommandInput}
 * @returns {@link DeleteModelQualityJobDefinitionCommandOutput}
 * @see {@link DeleteModelQualityJobDefinitionCommandInput} for command's `input` shape.
 * @see {@link DeleteModelQualityJobDefinitionCommandOutput} for command's `response` shape.
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
export declare class DeleteModelQualityJobDefinitionCommand extends DeleteModelQualityJobDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelQualityJobDefinitionRequest;
            output: {};
        };
        sdk: {
            input: DeleteModelQualityJobDefinitionCommandInput;
            output: DeleteModelQualityJobDefinitionCommandOutput;
        };
    };
}
