import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateHubContentReferenceRequest, UpdateHubContentReferenceResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateHubContentReferenceCommand}.
 */
export interface UpdateHubContentReferenceCommandInput extends UpdateHubContentReferenceRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateHubContentReferenceCommand}.
 */
export interface UpdateHubContentReferenceCommandOutput extends UpdateHubContentReferenceResponse, __MetadataBearer {
}
declare const UpdateHubContentReferenceCommand_base: {
    new (input: UpdateHubContentReferenceCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubContentReferenceCommandInput, UpdateHubContentReferenceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateHubContentReferenceCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubContentReferenceCommandInput, UpdateHubContentReferenceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the contents of a SageMaker hub for a <code>ModelReference</code> resource. A <code>ModelReference</code> allows you to access public SageMaker JumpStart models from within your private hub.</p> <p>When using this API, you can update the <code>MinVersion</code> field for additional flexibility in the model version. You shouldn't update any additional fields when using this API, because the metadata in your private hub should match the public JumpStart model's metadata.</p> <note> <p>If you want to update a <code>Model</code> or <code>Notebook</code> resource in your hub, use the <code>UpdateHubContent</code> API instead.</p> </note> <p>For more information about adding model references to your hub, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-curated-hubs-admin-guide-add-models.html"> Add models to a private hub</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateHubContentReferenceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateHubContentReferenceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateHubContentReferenceRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 *   MinVersion: "STRING_VALUE",
 * };
 * const command = new UpdateHubContentReferenceCommand(input);
 * const response = await client.send(command);
 * // { // UpdateHubContentReferenceResponse
 * //   HubArn: "STRING_VALUE", // required
 * //   HubContentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateHubContentReferenceCommandInput - {@link UpdateHubContentReferenceCommandInput}
 * @returns {@link UpdateHubContentReferenceCommandOutput}
 * @see {@link UpdateHubContentReferenceCommandInput} for command's `input` shape.
 * @see {@link UpdateHubContentReferenceCommandOutput} for command's `response` shape.
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
export declare class UpdateHubContentReferenceCommand extends UpdateHubContentReferenceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateHubContentReferenceRequest;
            output: UpdateHubContentReferenceResponse;
        };
        sdk: {
            input: UpdateHubContentReferenceCommandInput;
            output: UpdateHubContentReferenceCommandOutput;
        };
    };
}
