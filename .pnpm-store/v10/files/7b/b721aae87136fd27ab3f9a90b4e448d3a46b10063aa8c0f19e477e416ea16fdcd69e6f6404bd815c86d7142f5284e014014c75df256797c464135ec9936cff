import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteImageRequest, DeleteImageResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteImageCommand}.
 */
export interface DeleteImageCommandInput extends DeleteImageRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteImageCommand}.
 */
export interface DeleteImageCommandOutput extends DeleteImageResponse, __MetadataBearer {
}
declare const DeleteImageCommand_base: {
    new (input: DeleteImageCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteImageCommandInput, DeleteImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteImageCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteImageCommandInput, DeleteImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a SageMaker AI image and all versions of the image. The container images aren't deleted.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteImageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteImageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteImageRequest
 *   ImageName: "STRING_VALUE", // required
 * };
 * const command = new DeleteImageCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteImageCommandInput - {@link DeleteImageCommandInput}
 * @returns {@link DeleteImageCommandOutput}
 * @see {@link DeleteImageCommandInput} for command's `input` shape.
 * @see {@link DeleteImageCommandOutput} for command's `response` shape.
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
export declare class DeleteImageCommand extends DeleteImageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteImageRequest;
            output: {};
        };
        sdk: {
            input: DeleteImageCommandInput;
            output: DeleteImageCommandOutput;
        };
    };
}
