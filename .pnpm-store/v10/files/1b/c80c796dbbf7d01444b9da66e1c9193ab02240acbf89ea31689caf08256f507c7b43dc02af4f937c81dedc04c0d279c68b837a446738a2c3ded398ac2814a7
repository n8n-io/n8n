import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StartAsyncInvoke$ } from "../schemas/schemas_0";
export { $Command };
export class StartAsyncInvokeCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "StartAsyncInvoke", {})
    .n("BedrockRuntimeClient", "StartAsyncInvokeCommand")
    .sc(StartAsyncInvoke$)
    .build() {
}
