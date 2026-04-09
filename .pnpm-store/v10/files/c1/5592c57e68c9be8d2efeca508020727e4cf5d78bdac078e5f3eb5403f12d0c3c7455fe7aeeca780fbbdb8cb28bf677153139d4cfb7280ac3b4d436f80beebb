import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StartFlowExecution$ } from "../schemas/schemas_0";
export { $Command };
export class StartFlowExecutionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "StartFlowExecution", {})
    .n("BedrockAgentRuntimeClient", "StartFlowExecutionCommand")
    .sc(StartFlowExecution$)
    .build() {
}
