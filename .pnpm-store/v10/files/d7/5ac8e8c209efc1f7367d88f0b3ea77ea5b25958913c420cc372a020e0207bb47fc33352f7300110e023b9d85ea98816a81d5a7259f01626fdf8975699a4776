import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListAlgorithms$ } from "../schemas/schemas_0";
export { $Command };
export class ListAlgorithmsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAlgorithms", {})
    .n("SageMakerClient", "ListAlgorithmsCommand")
    .sc(ListAlgorithms$)
    .build() {
}
