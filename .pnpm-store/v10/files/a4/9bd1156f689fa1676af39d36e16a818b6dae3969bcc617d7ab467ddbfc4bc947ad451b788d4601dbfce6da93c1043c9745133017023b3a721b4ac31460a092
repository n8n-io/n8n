import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StopMonitoringSchedule$ } from "../schemas/schemas_0";
export { $Command };
export class StopMonitoringScheduleCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopMonitoringSchedule", {})
    .n("SageMakerClient", "StopMonitoringScheduleCommand")
    .sc(StopMonitoringSchedule$)
    .build() {
}
