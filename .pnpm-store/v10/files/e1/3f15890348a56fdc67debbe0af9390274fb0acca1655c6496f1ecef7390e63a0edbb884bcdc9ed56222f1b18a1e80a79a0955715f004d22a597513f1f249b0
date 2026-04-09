import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { Converse$ } from "../schemas/schemas_0";
export { $Command };
export class ConverseCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "Converse", {})
    .n("BedrockRuntimeClient", "ConverseCommand")
    .sc(Converse$)
    .build() {
}
