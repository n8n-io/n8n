import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteFeatureGroupRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteFeatureGroupCommand}.
 */
export interface DeleteFeatureGroupCommandInput extends DeleteFeatureGroupRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteFeatureGroupCommand}.
 */
export interface DeleteFeatureGroupCommandOutput extends __MetadataBearer {
}
declare const DeleteFeatureGroupCommand_base: {
    new (input: DeleteFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteFeatureGroupCommandInput, DeleteFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteFeatureGroupCommandInput, DeleteFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete the <code>FeatureGroup</code> and any data that was written to the <code>OnlineStore</code> of the <code>FeatureGroup</code>. Data cannot be accessed from the <code>OnlineStore</code> immediately after <code>DeleteFeatureGroup</code> is called. </p> <p>Data written into the <code>OfflineStore</code> will not be deleted. The Amazon Web Services Glue database and tables that are automatically created for your <code>OfflineStore</code> are not deleted. </p> <p>Note that it can take approximately 10-15 minutes to delete an <code>OnlineStore</code> <code>FeatureGroup</code> with the <code>InMemory</code> <code>StorageType</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteFeatureGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteFeatureGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteFeatureGroupRequest
 *   FeatureGroupName: "STRING_VALUE", // required
 * };
 * const command = new DeleteFeatureGroupCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteFeatureGroupCommandInput - {@link DeleteFeatureGroupCommandInput}
 * @returns {@link DeleteFeatureGroupCommandOutput}
 * @see {@link DeleteFeatureGroupCommandInput} for command's `input` shape.
 * @see {@link DeleteFeatureGroupCommandOutput} for command's `response` shape.
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
export declare class DeleteFeatureGroupCommand extends DeleteFeatureGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteFeatureGroupRequest;
            output: {};
        };
        sdk: {
            input: DeleteFeatureGroupCommandInput;
            output: DeleteFeatureGroupCommandOutput;
        };
    };
}
