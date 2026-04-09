import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteHubContentRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteHubContentCommand}.
 */
export interface DeleteHubContentCommandInput extends DeleteHubContentRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteHubContentCommand}.
 */
export interface DeleteHubContentCommandOutput extends __MetadataBearer {
}
declare const DeleteHubContentCommand_base: {
    new (input: DeleteHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubContentCommandInput, DeleteHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubContentCommandInput, DeleteHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete the contents of a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteHubContentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteHubContentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteHubContentRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 *   HubContentName: "STRING_VALUE", // required
 *   HubContentVersion: "STRING_VALUE", // required
 * };
 * const command = new DeleteHubContentCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteHubContentCommandInput - {@link DeleteHubContentCommandInput}
 * @returns {@link DeleteHubContentCommandOutput}
 * @see {@link DeleteHubContentCommandInput} for command's `input` shape.
 * @see {@link DeleteHubContentCommandOutput} for command's `response` shape.
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
export declare class DeleteHubContentCommand extends DeleteHubContentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteHubContentRequest;
            output: {};
        };
        sdk: {
            input: DeleteHubContentCommandInput;
            output: DeleteHubContentCommandOutput;
        };
    };
}
