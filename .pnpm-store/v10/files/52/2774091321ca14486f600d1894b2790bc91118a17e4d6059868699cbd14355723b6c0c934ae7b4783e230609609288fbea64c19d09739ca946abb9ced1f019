import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteSpaceRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteSpaceCommand}.
 */
export interface DeleteSpaceCommandInput extends DeleteSpaceRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteSpaceCommand}.
 */
export interface DeleteSpaceCommandOutput extends __MetadataBearer {
}
declare const DeleteSpaceCommand_base: {
    new (input: DeleteSpaceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteSpaceCommandInput, DeleteSpaceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteSpaceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteSpaceCommandInput, DeleteSpaceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to delete a space.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteSpaceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteSpaceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteSpaceRequest
 *   DomainId: "STRING_VALUE", // required
 *   SpaceName: "STRING_VALUE", // required
 * };
 * const command = new DeleteSpaceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteSpaceCommandInput - {@link DeleteSpaceCommandInput}
 * @returns {@link DeleteSpaceCommandOutput}
 * @see {@link DeleteSpaceCommandInput} for command's `input` shape.
 * @see {@link DeleteSpaceCommandOutput} for command's `response` shape.
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
export declare class DeleteSpaceCommand extends DeleteSpaceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteSpaceRequest;
            output: {};
        };
        sdk: {
            input: DeleteSpaceCommandInput;
            output: DeleteSpaceCommandOutput;
        };
    };
}
