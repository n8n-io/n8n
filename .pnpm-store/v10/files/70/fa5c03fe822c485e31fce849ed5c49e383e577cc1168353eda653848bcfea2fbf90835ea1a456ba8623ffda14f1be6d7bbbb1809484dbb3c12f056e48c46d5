import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteMlflowTrackingServerRequest, DeleteMlflowTrackingServerResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteMlflowTrackingServerCommand}.
 */
export interface DeleteMlflowTrackingServerCommandInput extends DeleteMlflowTrackingServerRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteMlflowTrackingServerCommand}.
 */
export interface DeleteMlflowTrackingServerCommandOutput extends DeleteMlflowTrackingServerResponse, __MetadataBearer {
}
declare const DeleteMlflowTrackingServerCommand_base: {
    new (input: DeleteMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteMlflowTrackingServerCommandInput, DeleteMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteMlflowTrackingServerCommandInput, DeleteMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an MLflow Tracking Server. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/mlflow-cleanup.html.html">Clean up MLflow resources</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteMlflowTrackingServerCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteMlflowTrackingServerCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteMlflowTrackingServerRequest
 *   TrackingServerName: "STRING_VALUE", // required
 * };
 * const command = new DeleteMlflowTrackingServerCommand(input);
 * const response = await client.send(command);
 * // { // DeleteMlflowTrackingServerResponse
 * //   TrackingServerArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteMlflowTrackingServerCommandInput - {@link DeleteMlflowTrackingServerCommandInput}
 * @returns {@link DeleteMlflowTrackingServerCommandOutput}
 * @see {@link DeleteMlflowTrackingServerCommandInput} for command's `input` shape.
 * @see {@link DeleteMlflowTrackingServerCommandOutput} for command's `response` shape.
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
export declare class DeleteMlflowTrackingServerCommand extends DeleteMlflowTrackingServerCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteMlflowTrackingServerRequest;
            output: DeleteMlflowTrackingServerResponse;
        };
        sdk: {
            input: DeleteMlflowTrackingServerCommandInput;
            output: DeleteMlflowTrackingServerCommandOutput;
        };
    };
}
