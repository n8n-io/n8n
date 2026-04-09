import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteImageVersionRequest, DeleteImageVersionResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteImageVersionCommand}.
 */
export interface DeleteImageVersionCommandInput extends DeleteImageVersionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteImageVersionCommand}.
 */
export interface DeleteImageVersionCommandOutput extends DeleteImageVersionResponse, __MetadataBearer {
}
declare const DeleteImageVersionCommand_base: {
    new (input: DeleteImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteImageVersionCommandInput, DeleteImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteImageVersionCommandInput, DeleteImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a version of a SageMaker AI image. The container image the version represents isn't deleted.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteImageVersionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteImageVersionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteImageVersionRequest
 *   ImageName: "STRING_VALUE", // required
 *   Version: Number("int"),
 *   Alias: "STRING_VALUE",
 * };
 * const command = new DeleteImageVersionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteImageVersionCommandInput - {@link DeleteImageVersionCommandInput}
 * @returns {@link DeleteImageVersionCommandOutput}
 * @see {@link DeleteImageVersionCommandInput} for command's `input` shape.
 * @see {@link DeleteImageVersionCommandOutput} for command's `response` shape.
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
export declare class DeleteImageVersionCommand extends DeleteImageVersionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteImageVersionRequest;
            output: {};
        };
        sdk: {
            input: DeleteImageVersionCommandInput;
            output: DeleteImageVersionCommandOutput;
        };
    };
}
