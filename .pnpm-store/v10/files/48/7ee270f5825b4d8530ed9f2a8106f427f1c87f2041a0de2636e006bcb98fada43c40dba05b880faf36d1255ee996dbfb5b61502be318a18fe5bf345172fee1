import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteModelExplainabilityJobDefinitionRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelExplainabilityJobDefinitionCommand}.
 */
export interface DeleteModelExplainabilityJobDefinitionCommandInput extends DeleteModelExplainabilityJobDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteModelExplainabilityJobDefinitionCommand}.
 */
export interface DeleteModelExplainabilityJobDefinitionCommandOutput extends __MetadataBearer {
}
declare const DeleteModelExplainabilityJobDefinitionCommand_base: {
    new (input: DeleteModelExplainabilityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelExplainabilityJobDefinitionCommandInput, DeleteModelExplainabilityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelExplainabilityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelExplainabilityJobDefinitionCommandInput, DeleteModelExplainabilityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an Amazon SageMaker AI model explainability job definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelExplainabilityJobDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelExplainabilityJobDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelExplainabilityJobDefinitionRequest
 *   JobDefinitionName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelExplainabilityJobDefinitionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelExplainabilityJobDefinitionCommandInput - {@link DeleteModelExplainabilityJobDefinitionCommandInput}
 * @returns {@link DeleteModelExplainabilityJobDefinitionCommandOutput}
 * @see {@link DeleteModelExplainabilityJobDefinitionCommandInput} for command's `input` shape.
 * @see {@link DeleteModelExplainabilityJobDefinitionCommandOutput} for command's `response` shape.
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
export declare class DeleteModelExplainabilityJobDefinitionCommand extends DeleteModelExplainabilityJobDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelExplainabilityJobDefinitionRequest;
            output: {};
        };
        sdk: {
            input: DeleteModelExplainabilityJobDefinitionCommandInput;
            output: DeleteModelExplainabilityJobDefinitionCommandOutput;
        };
    };
}
