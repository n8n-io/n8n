import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartMonitoringScheduleRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartMonitoringScheduleCommand}.
 */
export interface StartMonitoringScheduleCommandInput extends StartMonitoringScheduleRequest {
}
/**
 * @public
 *
 * The output of {@link StartMonitoringScheduleCommand}.
 */
export interface StartMonitoringScheduleCommandOutput extends __MetadataBearer {
}
declare const StartMonitoringScheduleCommand_base: {
    new (input: StartMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<StartMonitoringScheduleCommandInput, StartMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<StartMonitoringScheduleCommandInput, StartMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts a previously stopped monitoring schedule.</p> <note> <p>By default, when you successfully create a new schedule, the status of a monitoring schedule is <code>scheduled</code>.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartMonitoringScheduleCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartMonitoringScheduleCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartMonitoringScheduleRequest
 *   MonitoringScheduleName: "STRING_VALUE", // required
 * };
 * const command = new StartMonitoringScheduleCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StartMonitoringScheduleCommandInput - {@link StartMonitoringScheduleCommandInput}
 * @returns {@link StartMonitoringScheduleCommandOutput}
 * @see {@link StartMonitoringScheduleCommandInput} for command's `input` shape.
 * @see {@link StartMonitoringScheduleCommandOutput} for command's `response` shape.
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
export declare class StartMonitoringScheduleCommand extends StartMonitoringScheduleCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartMonitoringScheduleRequest;
            output: {};
        };
        sdk: {
            input: StartMonitoringScheduleCommandInput;
            output: StartMonitoringScheduleCommandOutput;
        };
    };
}
