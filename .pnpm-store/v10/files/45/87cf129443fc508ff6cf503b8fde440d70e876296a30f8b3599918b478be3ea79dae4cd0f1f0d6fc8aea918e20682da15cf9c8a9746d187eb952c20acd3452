import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateAction$ } from "../schemas/schemas_0";
export { $Command };
export class CreateActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAction", {})
    .n("SageMakerClient", "CreateActionCommand")
    .sc(CreateAction$)
    .build() {
}
