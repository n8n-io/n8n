import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { EndSession$ } from "../schemas/schemas_0";
export { $Command };
export class EndSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "EndSession", {})
    .n("BedrockAgentRuntimeClient", "EndSessionCommand")
    .sc(EndSession$)
    .build() {
}
