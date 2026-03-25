import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateMlflowTrackingServerRequest, UpdateMlflowTrackingServerResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateMlflowTrackingServerCommand}.
 */
export interface UpdateMlflowTrackingServerCommandInput extends UpdateMlflowTrackingServerRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateMlflowTrackingServerCommand}.
 */
export interface UpdateMlflowTrackingServerCommandOutput extends UpdateMlflowTrackingServerResponse, __MetadataBearer {
}
declare const UpdateMlflowTrackingServerCommand_base: {
    new (input: UpdateMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMlflowTrackingServerCommandInput, UpdateMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMlflowTrackingServerCommandInput, UpdateMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates properties of an existing MLflow Tracking Server.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateMlflowTrackingServerCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateMlflowTrackingServerCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateMlflowTrackingServerRequest
 *   TrackingServerName: "STRING_VALUE", // required
 *   ArtifactStoreUri: "STRING_VALUE",
 *   TrackingServerSize: "Small" || "Medium" || "Large",
 *   AutomaticModelRegistration: true || false,
 *   WeeklyMaintenanceWindowStart: "STRING_VALUE",
 * };
 * const command = new UpdateMlflowTrackingServerCommand(input);
 * const response = await client.send(command);
 * // { // UpdateMlflowTrackingServerResponse
 * //   TrackingServerArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateMlflowTrackingServerCommandInput - {@link UpdateMlflowTrackingServerCommandInput}
 * @returns {@link UpdateMlflowTrackingServerCommandOutput}
 * @see {@link UpdateMlflowTrackingServerCommandInput} for command's `input` shape.
 * @see {@link UpdateMlflowTrackingServerCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class UpdateMlflowTrackingServerCommand extends UpdateMlflowTrackingServerCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateMlflowTrackingServerRequest;
            output: UpdateMlflowTrackingServerResponse;
        };
        sdk: {
            input: UpdateMlflowTrackingServerCommandInput;
            output: UpdateMlflowTrackingServerCommandOutput;
        };
    };
}
