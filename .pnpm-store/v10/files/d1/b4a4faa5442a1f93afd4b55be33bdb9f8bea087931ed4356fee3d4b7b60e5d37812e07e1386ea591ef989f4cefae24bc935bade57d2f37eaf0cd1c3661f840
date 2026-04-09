import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListAsyncInvokes$ } from "../schemas/schemas_0";
export { $Command };
export class ListAsyncInvokesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ListAsyncInvokes", {})
    .n("BedrockRuntimeClient", "ListAsyncInvokesCommand")
    .sc(ListAsyncInvokes$)
    .build() {
}
