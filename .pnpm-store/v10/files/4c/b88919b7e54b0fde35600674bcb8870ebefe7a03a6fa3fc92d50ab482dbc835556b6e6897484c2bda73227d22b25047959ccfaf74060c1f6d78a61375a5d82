import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteContextRequest, DeleteContextResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteContextCommand}.
 */
export interface DeleteContextCommandInput extends DeleteContextRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteContextCommand}.
 */
export interface DeleteContextCommandOutput extends DeleteContextResponse, __MetadataBearer {
}
declare const DeleteContextCommand_base: {
    new (input: DeleteContextCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteContextCommandInput, DeleteContextCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteContextCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteContextCommandInput, DeleteContextCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an context.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteContextCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteContextCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteContextRequest
 *   ContextName: "STRING_VALUE", // required
 * };
 * const command = new DeleteContextCommand(input);
 * const response = await client.send(command);
 * // { // DeleteContextResponse
 * //   ContextArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteContextCommandInput - {@link DeleteContextCommandInput}
 * @returns {@link DeleteContextCommandOutput}
 * @see {@link DeleteContextCommandInput} for command's `input` shape.
 * @see {@link DeleteContextCommandOutput} for command's `response` shape.
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
export declare class DeleteContextCommand extends DeleteContextCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteContextRequest;
            output: DeleteContextResponse;
        };
        sdk: {
            input: DeleteContextCommandInput;
            output: DeleteContextCommandOutput;
        };
    };
}
