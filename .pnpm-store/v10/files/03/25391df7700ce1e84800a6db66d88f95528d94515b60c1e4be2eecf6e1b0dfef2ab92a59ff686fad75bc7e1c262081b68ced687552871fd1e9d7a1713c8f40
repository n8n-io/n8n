import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetAgentMemory$ } from "../schemas/schemas_0";
export { $Command };
export class GetAgentMemoryCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetAgentMemory", {})
    .n("BedrockAgentRuntimeClient", "GetAgentMemoryCommand")
    .sc(GetAgentMemory$)
    .build() {
}
