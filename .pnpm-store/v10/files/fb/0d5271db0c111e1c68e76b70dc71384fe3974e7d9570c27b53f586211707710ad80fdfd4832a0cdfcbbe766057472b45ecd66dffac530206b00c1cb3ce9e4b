import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeFlow$ } from "../schemas/schemas_0";
export { $Command };
export class InvokeFlowCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeFlow", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeFlowCommand")
    .sc(InvokeFlow$)
    .build() {
}
