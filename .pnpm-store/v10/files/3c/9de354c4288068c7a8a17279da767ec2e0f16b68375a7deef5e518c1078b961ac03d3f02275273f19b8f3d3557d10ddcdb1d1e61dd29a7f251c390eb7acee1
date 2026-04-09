import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteHubRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteHubCommand}.
 */
export interface DeleteHubCommandInput extends DeleteHubRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteHubCommand}.
 */
export interface DeleteHubCommandOutput extends __MetadataBearer {
}
declare const DeleteHubCommand_base: {
    new (input: DeleteHubCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubCommandInput, DeleteHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteHubCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubCommandInput, DeleteHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteHubCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteHubCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteHubRequest
 *   HubName: "STRING_VALUE", // required
 * };
 * const command = new DeleteHubCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteHubCommandInput - {@link DeleteHubCommandInput}
 * @returns {@link DeleteHubCommandOutput}
 * @see {@link DeleteHubCommandInput} for command's `input` shape.
 * @see {@link DeleteHubCommandOutput} for command's `response` shape.
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
export declare class DeleteHubCommand extends DeleteHubCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteHubRequest;
            output: {};
        };
        sdk: {
            input: DeleteHubCommandInput;
            output: DeleteHubCommandOutput;
        };
    };
}
