import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteSession$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "DeleteSession", {})
    .n("BedrockAgentRuntimeClient", "DeleteSessionCommand")
    .sc(DeleteSession$)
    .build() {
}
