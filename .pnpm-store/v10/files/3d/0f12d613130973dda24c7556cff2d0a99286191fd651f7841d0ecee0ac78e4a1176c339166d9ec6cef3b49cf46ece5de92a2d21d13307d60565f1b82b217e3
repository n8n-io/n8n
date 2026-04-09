import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteAction$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAction", {})
    .n("SageMakerClient", "DeleteActionCommand")
    .sc(DeleteAction$)
    .build() {
}
