import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartMlflowTrackingServerRequest, StartMlflowTrackingServerResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartMlflowTrackingServerCommand}.
 */
export interface StartMlflowTrackingServerCommandInput extends StartMlflowTrackingServerRequest {
}
/**
 * @public
 *
 * The output of {@link StartMlflowTrackingServerCommand}.
 */
export interface StartMlflowTrackingServerCommandOutput extends StartMlflowTrackingServerResponse, __MetadataBearer {
}
declare const StartMlflowTrackingServerCommand_base: {
    new (input: StartMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<StartMlflowTrackingServerCommandInput, StartMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<StartMlflowTrackingServerCommandInput, StartMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Programmatically start an MLflow Tracking Server.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartMlflowTrackingServerCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartMlflowTrackingServerCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartMlflowTrackingServerRequest
 *   TrackingServerName: "STRING_VALUE", // required
 * };
 * const command = new StartMlflowTrackingServerCommand(input);
 * const response = await client.send(command);
 * // { // StartMlflowTrackingServerResponse
 * //   TrackingServerArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param StartMlflowTrackingServerCommandInput - {@link StartMlflowTrackingServerCommandInput}
 * @returns {@link StartMlflowTrackingServerCommandOutput}
 * @see {@link StartMlflowTrackingServerCommandInput} for command's `input` shape.
 * @see {@link StartMlflowTrackingServerCommandOutput} for command's `response` shape.
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
export declare class StartMlflowTrackingServerCommand extends StartMlflowTrackingServerCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartMlflowTrackingServerRequest;
            output: StartMlflowTrackingServerResponse;
        };
        sdk: {
            input: StartMlflowTrackingServerCommandInput;
            output: StartMlflowTrackingServerCommandOutput;
        };
    };
}
