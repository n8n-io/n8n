import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListEndpointConfigs$ } from "../schemas/schemas_0";
export { $Command };
export class ListEndpointConfigsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEndpointConfigs", {})
    .n("SageMakerClient", "ListEndpointConfigsCommand")
    .sc(ListEndpointConfigs$)
    .build() {
}
