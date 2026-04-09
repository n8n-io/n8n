import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ConverseStream$ } from "../schemas/schemas_0";
export { $Command };
export class ConverseStreamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ConverseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "ConverseStreamCommand")
    .sc(ConverseStream$)
    .build() {
}
