import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StopMonitoringScheduleRequest } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopMonitoringScheduleCommand}.
 */
export interface StopMonitoringScheduleCommandInput extends StopMonitoringScheduleRequest {
}
/**
 * @public
 *
 * The output of {@link StopMonitoringScheduleCommand}.
 */
export interface StopMonitoringScheduleCommandOutput extends __MetadataBearer {
}
declare const StopMonitoringScheduleCommand_base: {
    new (input: StopMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<StopMonitoringScheduleCommandInput, StopMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<StopMonitoringScheduleCommandInput, StopMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a previously started monitoring schedule.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopMonitoringScheduleCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopMonitoringScheduleCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // StopMonitoringScheduleRequest
 *   MonitoringScheduleName: "STRING_VALUE", // required
 * };
 * const command = new StopMonitoringScheduleCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopMonitoringScheduleCommandInput - {@link StopMonitoringScheduleCommandInput}
 * @returns {@link StopMonitoringScheduleCommandOutput}
 * @see {@link StopMonitoringScheduleCommandInput} for command's `input` shape.
 * @see {@link StopMonitoringScheduleCommandOutput} for command's `response` shape.
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
export declare class StopMonitoringScheduleCommand extends StopMonitoringScheduleCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopMonitoringScheduleRequest;
            output: {};
        };
        sdk: {
            input: StopMonitoringScheduleCommandInput;
            output: StopMonitoringScheduleCommandOutput;
        };
    };
}
