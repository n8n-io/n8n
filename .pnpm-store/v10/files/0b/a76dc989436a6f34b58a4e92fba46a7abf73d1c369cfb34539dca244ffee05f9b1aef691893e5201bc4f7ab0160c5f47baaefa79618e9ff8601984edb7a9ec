import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { RetrieveAndGenerateStream$ } from "../schemas/schemas_0";
export { $Command };
export class RetrieveAndGenerateStreamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "RetrieveAndGenerateStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "RetrieveAndGenerateStreamCommand")
    .sc(RetrieveAndGenerateStream$)
    .build() {
}
