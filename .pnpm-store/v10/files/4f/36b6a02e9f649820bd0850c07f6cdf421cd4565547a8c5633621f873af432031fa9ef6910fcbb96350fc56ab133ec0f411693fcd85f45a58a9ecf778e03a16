import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListMonitoringExecutions$ } from "../schemas/schemas_0";
export { $Command };
export class ListMonitoringExecutionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMonitoringExecutions", {})
    .n("SageMakerClient", "ListMonitoringExecutionsCommand")
    .sc(ListMonitoringExecutions$)
    .build() {
}
