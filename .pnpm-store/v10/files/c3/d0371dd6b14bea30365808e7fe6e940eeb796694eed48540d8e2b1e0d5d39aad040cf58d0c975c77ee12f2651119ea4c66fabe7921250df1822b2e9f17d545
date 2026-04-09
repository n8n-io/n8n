import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetInvocationStep$ } from "../schemas/schemas_0";
export { $Command };
export class GetInvocationStepCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetInvocationStep", {})
    .n("BedrockAgentRuntimeClient", "GetInvocationStepCommand")
    .sc(GetInvocationStep$)
    .build() {
}
