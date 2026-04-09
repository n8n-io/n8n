import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeInlineAgent$ } from "../schemas/schemas_0";
export { $Command };
export class InvokeInlineAgentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeInlineAgent", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeInlineAgentCommand")
    .sc(InvokeInlineAgent$)
    .build() {
}
