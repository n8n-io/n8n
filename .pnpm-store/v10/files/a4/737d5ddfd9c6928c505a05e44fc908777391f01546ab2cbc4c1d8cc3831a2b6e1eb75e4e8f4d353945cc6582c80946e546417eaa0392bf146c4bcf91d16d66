import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListContexts$ } from "../schemas/schemas_0";
export { $Command };
export class ListContextsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListContexts", {})
    .n("SageMakerClient", "ListContextsCommand")
    .sc(ListContexts$)
    .build() {
}
