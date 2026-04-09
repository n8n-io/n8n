import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeModel$ } from "../schemas/schemas_0";
export { $Command };
export class InvokeModelCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModel", {})
    .n("BedrockRuntimeClient", "InvokeModelCommand")
    .sc(InvokeModel$)
    .build() {
}
