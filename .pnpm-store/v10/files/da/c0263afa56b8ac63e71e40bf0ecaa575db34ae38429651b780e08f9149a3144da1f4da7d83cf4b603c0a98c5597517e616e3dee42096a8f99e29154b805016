import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListInvocationSteps$ } from "../schemas/schemas_0";
export { $Command };
export class ListInvocationStepsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListInvocationSteps", {})
    .n("BedrockAgentRuntimeClient", "ListInvocationStepsCommand")
    .sc(ListInvocationSteps$)
    .build() {
}
