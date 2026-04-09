import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListFlowExecutions$ } from "../schemas/schemas_0";
export { $Command };
export class ListFlowExecutionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListFlowExecutions", {})
    .n("BedrockAgentRuntimeClient", "ListFlowExecutionsCommand")
    .sc(ListFlowExecutions$)
    .build() {
}
