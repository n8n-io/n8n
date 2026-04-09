import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteModelCardRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteModelCardCommand}.
 */
export interface DeleteModelCardCommandInput extends DeleteModelCardRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteModelCardCommand}.
 */
export interface DeleteModelCardCommandOutput extends __MetadataBearer {
}
declare const DeleteModelCardCommand_base: {
    new (input: DeleteModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelCardCommandInput, DeleteModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteModelCardCommandInput, DeleteModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an Amazon SageMaker Model Card.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteModelCardCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteModelCardCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteModelCardRequest
 *   ModelCardName: "STRING_VALUE", // required
 * };
 * const command = new DeleteModelCardCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteModelCardCommandInput - {@link DeleteModelCardCommandInput}
 * @returns {@link DeleteModelCardCommandOutput}
 * @see {@link DeleteModelCardCommandInput} for command's `input` shape.
 * @see {@link DeleteModelCardCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class DeleteModelCardCommand extends DeleteModelCardCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteModelCardRequest;
            output: {};
        };
        sdk: {
            input: DeleteModelCardCommandInput;
            output: DeleteModelCardCommandOutput;
        };
    };
}
