import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteHubContentReferenceRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteHubContentReferenceCommand}.
 */
export interface DeleteHubContentReferenceCommandInput extends DeleteHubContentReferenceRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteHubContentReferenceCommand}.
 */
export interface DeleteHubContentReferenceCommandOutput extends __MetadataBearer {
}
declare const DeleteHubContentReferenceCommand_base: {
    new (input: DeleteHubContentReferenceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubContentReferenceCommandInput, DeleteHubContentReferenceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteHubContentReferenceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHubContentReferenceCommandInput, DeleteHubContentReferenceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete a hub content reference in order to remove a model from a private hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteHubContentReferenceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteHubContentReferenceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteHubContentReferenceRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 *   HubContentName: "STRING_VALUE", // required
 * };
 * const command = new DeleteHubContentReferenceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteHubContentReferenceCommandInput - {@link DeleteHubContentReferenceCommandInput}
 * @returns {@link DeleteHubContentReferenceCommandOutput}
 * @see {@link DeleteHubContentReferenceCommandInput} for command's `input` shape.
 * @see {@link DeleteHubContentReferenceCommandOutput} for command's `response` shape.
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
export declare class DeleteHubContentReferenceCommand extends DeleteHubContentReferenceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteHubContentReferenceRequest;
            output: {};
        };
        sdk: {
            input: DeleteHubContentReferenceCommandInput;
            output: DeleteHubContentReferenceCommandOutput;
        };
    };
}
