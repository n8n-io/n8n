import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteFlowDefinitionRequest, DeleteFlowDefinitionResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteFlowDefinitionCommand}.
 */
export interface DeleteFlowDefinitionCommandInput extends DeleteFlowDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteFlowDefinitionCommand}.
 */
export interface DeleteFlowDefinitionCommandOutput extends DeleteFlowDefinitionResponse, __MetadataBearer {
}
declare const DeleteFlowDefinitionCommand_base: {
    new (input: DeleteFlowDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteFlowDefinitionCommandInput, DeleteFlowDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteFlowDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteFlowDefinitionCommandInput, DeleteFlowDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified flow definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteFlowDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteFlowDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteFlowDefinitionRequest
 *   FlowDefinitionName: "STRING_VALUE", // required
 * };
 * const command = new DeleteFlowDefinitionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteFlowDefinitionCommandInput - {@link DeleteFlowDefinitionCommandInput}
 * @returns {@link DeleteFlowDefinitionCommandOutput}
 * @see {@link DeleteFlowDefinitionCommandInput} for command's `input` shape.
 * @see {@link DeleteFlowDefinitionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class DeleteFlowDefinitionCommand extends DeleteFlowDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteFlowDefinitionRequest;
            output: {};
        };
        sdk: {
            input: DeleteFlowDefinitionCommandInput;
            output: DeleteFlowDefinitionCommandOutput;
        };
    };
}
