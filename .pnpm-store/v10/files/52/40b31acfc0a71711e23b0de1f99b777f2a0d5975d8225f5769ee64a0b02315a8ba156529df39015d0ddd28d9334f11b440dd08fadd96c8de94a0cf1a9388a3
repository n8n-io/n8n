import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateSession$ } from "../schemas/schemas_0";
export { $Command };
export class CreateSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "CreateSession", {})
    .n("BedrockAgentRuntimeClient", "CreateSessionCommand")
    .sc(CreateSession$)
    .build() {
}
