import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateInvocation$ } from "../schemas/schemas_0";
export { $Command };
export class CreateInvocationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "CreateInvocation", {})
    .n("BedrockAgentRuntimeClient", "CreateInvocationCommand")
    .sc(CreateInvocation$)
    .build() {
}
