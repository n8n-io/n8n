import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteAgentMemory$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteAgentMemoryCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "DeleteAgentMemory", {})
    .n("BedrockAgentRuntimeClient", "DeleteAgentMemoryCommand")
    .sc(DeleteAgentMemory$)
    .build() {
}
